import type { BrandingConfig } from '../../tenant/branding/branding.service'
import { templates, TemplateId, TemplatePayloadMap, TemplateRender } from './templates'

export function resolveTemplate<T extends TemplateId>(
  templateId: T,
  payload: TemplatePayloadMap[T],
  branding?: BrandingConfig
): TemplateRender {
  const brandName = branding?.name && branding.name.trim().length > 0 ? branding.name.trim() : 'Support'
  const rendered = templates[templateId](payload, brandName)
  return {
    subject: rendered.subject,
    body: `${rendered.body}\n\n${brandName}`
  }
}