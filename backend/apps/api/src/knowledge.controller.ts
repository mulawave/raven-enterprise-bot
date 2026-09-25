import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common'
import { PrismaClient, UserScope } from '@prisma/client'
import { JwtAuthGuard } from '../../../libs/auth/guards/jwt-auth.guard'
import { CurrentUser } from '../../../libs/auth/decorators/current-user.decorator'
import { ConfigLoaderService } from '../../../libs/config/config-loader.service'
import { OpenAIResponseGenerator } from '../../../libs/ai-engine/openai-response.generator'
import { KnowledgeIndexService } from '../../../libs/knowledge/knowledge-index.service'
import { KnowledgeRetriever } from '../../../libs/knowledge/knowledge-retriever'
import { normalizeUrl } from '../../../libs/knowledge/site-crawler'

const MAX_TEXT_SOURCE_CHARS = 100_000
const MAX_SOURCES_PER_ASSISTANT = 20

interface AddSourceDto {
  type?: 'website' | 'text'
  url?: string
  label?: string
  text?: string
}

function requireTenantId(user: any): string {
  if (user?.scope !== UserScope.TENANT || !user?.tenant_id) {
    throw new UnauthorizedException('Tenant credentials required')
  }
  return user.tenant_id
}

/**
 * Knowledge sources for a website assistant: websites to crawl and pasted text.
 * Indexed content is shared by the website widget and the messaging bot.
 */
@Controller('api/website-assistant/:assistantId/knowledge')
@UseGuards(JwtAuthGuard)
export class KnowledgeController {
  private readonly retriever: KnowledgeRetriever
  private readonly generator: OpenAIResponseGenerator

  constructor(
    private readonly prisma: PrismaClient,
    private readonly indexService: KnowledgeIndexService,
    configLoader: ConfigLoaderService,
  ) {
    this.retriever = new KnowledgeRetriever(prisma)
    this.generator = new OpenAIResponseGenerator(configLoader)
  }

  @Get()
  async list(@CurrentUser() user: any, @Param('assistantId') assistantId: string) {
    const tenantId = requireTenantId(user)
    await this.findAssistant(tenantId, assistantId)
    const sources = await this.prisma.websiteKnowledgeSource.findMany({
      where: { assistant_id: assistantId },
      orderBy: { created_at: 'asc' },
    })
    return sources.map((s) => this.serialize(s))
  }

  @Post('sources')
  async addSource(@CurrentUser() user: any, @Param('assistantId') assistantId: string, @Body() body: AddSourceDto) {
    const tenantId = requireTenantId(user)
    const assistant = await this.findAssistant(tenantId, assistantId)

    const count = await this.prisma.websiteKnowledgeSource.count({ where: { assistant_id: assistantId } })
    if (count >= MAX_SOURCES_PER_ASSISTANT) {
      throw new BadRequestException(`You can add up to ${MAX_SOURCES_PER_ASSISTANT} knowledge sources`)
    }

    let data: { source_type: string; source_label: string; source_url?: string; raw_text?: string }
    if (body.type === 'text') {
      const text = body.text?.trim() ?? ''
      const label = body.label?.trim() ?? ''
      if (!label) throw new BadRequestException('label is required')
      if (text.length < 20) throw new BadRequestException('Please paste at least a few sentences of text')
      if (text.length > MAX_TEXT_SOURCE_CHARS) throw new BadRequestException('Text is too long (max 100,000 characters)')
      data = { source_type: 'text', source_label: label.slice(0, 120), raw_text: text }
    } else if (body.type === 'website') {
      const url = this.parseWebsiteUrl(body.url)
      const verified = assistant.domains.some((d) => d.verification_status === 'verified' && d.hostname.toLowerCase() === url.hostname)
      if (!verified) {
        throw new BadRequestException(`Verify ${url.hostname} under Domains before adding it as a knowledge source`)
      }
      const exists = await this.prisma.websiteKnowledgeSource.findFirst({
        where: { assistant_id: assistantId, source_type: 'website', source_url: url.toString() },
      })
      if (exists) throw new BadRequestException('This website is already a knowledge source')
      data = { source_type: 'website', source_label: body.label?.trim() || url.hostname, source_url: url.toString() }
    } else {
      throw new BadRequestException("type must be 'website' or 'text'")
    }

    const source = await this.prisma.websiteKnowledgeSource.create({
      data: { ...data, assistant_id: assistantId, crawl_status: 'queued' },
    })
    return this.serialize(source)
  }

  @Post('sources/:sourceId/refresh')
  async refresh(@CurrentUser() user: any, @Param('assistantId') assistantId: string, @Param('sourceId') sourceId: string) {
    const tenantId = requireTenantId(user)
    const source = await this.findSource(tenantId, assistantId, sourceId)
    if (source.crawl_status === 'queued' || source.crawl_status === 'crawling') {
      return this.serialize(source)
    }
    await this.indexService.enqueue(source.id)
    return this.serialize({ ...source, crawl_status: 'queued', last_error: null })
  }

  @Delete('sources/:sourceId')
  async remove(@CurrentUser() user: any, @Param('assistantId') assistantId: string, @Param('sourceId') sourceId: string) {
    const tenantId = requireTenantId(user)
    await this.findSource(tenantId, assistantId, sourceId)
    await this.prisma.websiteKnowledgeSource.delete({ where: { id: sourceId } })
    return { success: true }
  }

  @Get('sources/:sourceId/pages')
  async pages(@CurrentUser() user: any, @Param('assistantId') assistantId: string, @Param('sourceId') sourceId: string) {
    const tenantId = requireTenantId(user)
    await this.findSource(tenantId, assistantId, sourceId)
    return this.prisma.knowledgeDocument.findMany({
      where: { source_id: sourceId },
      select: { id: true, url: true, title: true, status: true, error: true, fetched_at: true },
      orderBy: { url: 'asc' },
      take: 2000,
    })
  }

  /**
   * POST /api/website-assistant/:assistantId/knowledge/test  { question }
   * Shows the owner what the assistant would answer and which content it used.
   */
  @Post('test')
  async test(@CurrentUser() user: any, @Param('assistantId') assistantId: string, @Body() body: { question?: string }) {
    const tenantId = requireTenantId(user)
    const assistant = await this.findAssistant(tenantId, assistantId)
    const question = body.question?.trim()
    if (!question) throw new BadRequestException('question is required')
    if (question.length > 500) throw new BadRequestException('Question is too long')

    const [passages, faqs, botConfig] = await Promise.all([
      this.retriever.search(tenantId, question),
      this.prisma.tenantFaq.findMany({
        where: { tenant_id: tenantId, hidden: false },
        select: { question: true, answer: true },
        orderBy: { sort_order: 'asc' },
      }),
      this.prisma.tenantBotConfig.findUnique({ where: { tenant_id: tenantId } }),
    ])

    const raw = await this.generator.generate({
      businessName: assistant.name,
      userMessage: question,
      intent: 'HelpRequest',
      conversationHistory: [],
      faqs,
      knowledgePassages: passages,
      systemPromptOverride: botConfig?.system_prompt ?? undefined,
      escalationMessage: botConfig?.escalation_message ?? undefined,
    })

    const needsHuman = raw?.startsWith('[NEEDS_HUMAN]') ?? false
    return {
      answer: raw ? raw.replace(/^\[NEEDS_HUMAN\]\s*/, '') : null,
      wouldHandOff: needsHuman,
      aiAvailable: raw !== null,
      passages: passages.map((p) => ({ title: p.title, url: p.url, excerpt: p.text.slice(0, 300) })),
    }
  }

  private parseWebsiteUrl(input: string | undefined): URL {
    const raw = input?.trim()
    if (!raw) throw new BadRequestException('url is required')
    try {
      const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`)
      if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error()
      return new URL(normalizeUrl(url.toString()))
    } catch {
      throw new BadRequestException('Enter a valid website address, e.g. https://example.com')
    }
  }

  private async findAssistant(tenantId: string, assistantId: string) {
    const assistant = await this.prisma.websiteAssistant.findFirst({
      where: { id: assistantId, tenant_id: tenantId },
      include: { domains: { select: { hostname: true, verification_status: true } } },
    })
    if (!assistant) throw new NotFoundException('Website assistant not found')
    return assistant
  }

  private async findSource(tenantId: string, assistantId: string, sourceId: string) {
    await this.findAssistant(tenantId, assistantId)
    const source = await this.prisma.websiteKnowledgeSource.findFirst({ where: { id: sourceId, assistant_id: assistantId } })
    if (!source) throw new NotFoundException('Knowledge source not found')
    return source
  }

  private serialize(s: any) {
    return {
      id: s.id,
      type: s.source_type,
      label: s.source_label,
      url: s.source_url,
      enabled: s.is_enabled,
      status: s.crawl_status ?? 'queued',
      pagesIndexed: s.pages_indexed ?? 0,
      lastCrawledAt: s.last_crawled_at,
      lastError: s.last_error,
      createdAt: s.created_at,
    }
  }
}
