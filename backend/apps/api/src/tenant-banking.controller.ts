/**
 * TenantBankingController — KYC gate, bank account management, and payouts.
 *
 * Routes (all prefixed /tenant/banking):
 *   GET  /banks                – list Nigerian banks (Paystack)
 *   POST /verify-account       – resolve account name (Paystack)
 *   GET  /account              – get saved bank details
 *   POST /account              – save bank details (requires kyc verified)
 *   GET  /kyc                  – get KYC status
 *   POST /kyc/submit           – submit KYC (creates pending record)
 *   GET  /balance              – available withdrawal balance
 *   GET  /withdrawals          – list past withdrawals
 *   POST /withdraw             – initiate payout (Flutterwave primary → Paystack fallback)
 */
import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  BadRequestException,
  UseGuards,
  InternalServerErrorException,
} from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { PaystackService } from '../../../libs/payments/paystack.service'
import { FlutterwaveService } from '../../../libs/payments/flutterwave.service'
import { ConfigLoaderService } from '../../../libs/config/config-loader.service'
import { JwtAuthGuard } from '../../../libs/auth/guards/jwt-auth.guard'
import { CurrentUser } from '../../../libs/auth/decorators/current-user.decorator'

@Controller('tenant/banking')
@UseGuards(JwtAuthGuard)
export class TenantBankingController {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly configLoader: ConfigLoaderService,
  ) {}

  private async getPaystack(): Promise<PaystackService> {
    return new PaystackService(await this.configLoader.getPaystackSecret())
  }

  private async getFlutterwave(): Promise<FlutterwaveService | null> {
    const key = await this.configLoader.getFlutterwaveSecret()
    return key ? new FlutterwaveService(key) : null
  }

  // ── BANKS ──────────────────────────────────────────────────────────────────

  @Get('banks')
  async getBanks() {
    try {
      const paystack = await this.getPaystack()
      const banks = await paystack.getBankList()
      return banks
        .filter(b => b.active)
        .map(b => ({ code: b.code, name: b.name }))
        .sort((a, b) => a.name.localeCompare(b.name))
    } catch {
      throw new InternalServerErrorException('Failed to fetch bank list')
    }
  }

  @Post('verify-account')
  @HttpCode(HttpStatus.OK)
  async verifyAccount(
    @CurrentUser() user: any,
    @Body() body: { accountNumber: string; bankCode: string },
  ) {
    const tenantId = user?.tenant_id
    if (!tenantId) throw new UnauthorizedException('Tenant credentials required')
    if (!body.accountNumber || !body.bankCode) {
      throw new BadRequestException('accountNumber and bankCode are required')
    }
    if (!/^\d{10}$/.test(body.accountNumber)) {
      throw new BadRequestException('accountNumber must be exactly 10 digits')
    }
    try {
      const paystack = await this.getPaystack()
      const result = await paystack.verifyAccountNumber(body.accountNumber, body.bankCode)
      return { accountName: result.account_name, accountNumber: result.account_number }
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Could not verify account number'
      throw new BadRequestException(msg)
    }
  }

  // ── BANK ACCOUNT ───────────────────────────────────────────────────────────

  @Get('account')
  async getBankAccount(@CurrentUser() user: any) {
    const tenantId = user?.tenant_id
    if (!tenantId) throw new UnauthorizedException('Tenant credentials required')
    const account = await this.prisma.tenantBankAccount.findUnique({ where: { tenant_id: tenantId } })
    return account ?? null
  }

  @Post('account')
  @HttpCode(HttpStatus.OK)
  async saveBankAccount(
    @CurrentUser() user: any,
    @Body() body: {
      bankName: string
      bankCode: string
      accountNumber: string
      accountName: string
    },
  ) {
    const tenantId = user?.tenant_id
    if (!tenantId) throw new UnauthorizedException('Tenant credentials required')

    // KYC gate
    const kyc = await this.prisma.tenantKyc.findUnique({ where: { tenant_id: tenantId } })
    if (!kyc || kyc.status !== 'verified') {
      throw new BadRequestException('KYC_NOT_VERIFIED: Complete identity verification before adding bank details')
    }

    for (const [k, v] of Object.entries(body)) {
      if (!v?.toString().trim()) throw new BadRequestException(`${k} is required`)
    }

    const saved = await this.prisma.tenantBankAccount.upsert({
      where: { tenant_id: tenantId },
      update: {
        bank_name: body.bankName,
        bank_code: body.bankCode,
        account_number: body.accountNumber,
        account_name: body.accountName,
      },
      create: {
        tenant_id: tenantId,
        bank_name: body.bankName,
        bank_code: body.bankCode,
        account_number: body.accountNumber,
        account_name: body.accountName,
      },
    })
    return { success: true, account: saved }
  }

  // ── KYC ────────────────────────────────────────────────────────────────────

  @Get('kyc')
  async getKyc(@CurrentUser() user: any) {
    const tenantId = user?.tenant_id
    if (!tenantId) throw new UnauthorizedException('Tenant credentials required')
    const kyc = await this.prisma.tenantKyc.findUnique({ where: { tenant_id: tenantId } })
    return kyc ?? { status: 'none' }
  }

  @Post('kyc/submit')
  @HttpCode(HttpStatus.OK)
  async submitKyc(
    @CurrentUser() user: any,
    @Body() body: { fullName: string; idType: 'nin' | 'bvn' | 'passport'; idNumber: string },
  ) {
    const tenantId = user?.tenant_id
    if (!tenantId) throw new UnauthorizedException('Tenant credentials required')
    if (!body.fullName?.trim()) throw new BadRequestException('fullName is required')
    if (!['nin', 'bvn', 'passport'].includes(body.idType)) throw new BadRequestException('Invalid idType')
    if (!body.idNumber?.trim()) throw new BadRequestException('idNumber is required')

    const kyc = await this.prisma.tenantKyc.upsert({
      where: { tenant_id: tenantId },
      update: {
        status: 'submitted',
        full_name: body.fullName.trim(),
        id_type: body.idType,
        id_number: body.idNumber.trim(),
        submitted_at: new Date(),
      },
      create: {
        tenant_id: tenantId,
        status: 'submitted',
        full_name: body.fullName.trim(),
        id_type: body.idType,
        id_number: body.idNumber.trim(),
        submitted_at: new Date(),
      },
    })
    return { success: true, kyc }
  }

  // ── BALANCE ────────────────────────────────────────────────────────────────

  @Get('balance')
  async getBalance(@CurrentUser() user: any) {
    const tenantId = user?.tenant_id
    if (!tenantId) throw new UnauthorizedException('Tenant credentials required')

    const [totalPaidAgg, totalWithdrawnAgg] = await Promise.all([
      this.prisma.payment.aggregate({
        where: { tenant_id: tenantId, status: 'paid' },
        _sum: { amount_kobo: true },
      }),
      this.prisma.withdrawal.aggregate({
        where: { tenant_id: tenantId, status: 'success' },
        _sum: { amount_kobo: true },
      }),
    ])

    const totalPaid = totalPaidAgg._sum.amount_kobo ?? 0
    const totalWithdrawn = totalWithdrawnAgg._sum.amount_kobo ?? 0
    const availableKobo = Math.max(0, totalPaid - totalWithdrawn)

    return {
      availableKobo,
      availableNaira: +(availableKobo / 100).toFixed(2),
      totalEarnedKobo: totalPaid,
      totalWithdrawnKobo: totalWithdrawn,
    }
  }

  // ── WITHDRAWALS ────────────────────────────────────────────────────────────

  @Get('withdrawals')
  async listWithdrawals(@CurrentUser() user: any) {
    const tenantId = user?.tenant_id
    if (!tenantId) throw new UnauthorizedException('Tenant credentials required')
    return this.prisma.withdrawal.findMany({
      where: { tenant_id: tenantId },
      orderBy: { created_at: 'desc' },
      take: 50,
    })
  }

  @Post('withdraw')
  @HttpCode(HttpStatus.OK)
  async initiateWithdrawal(
    @CurrentUser() user: any,
    @Body() body: { amountKobo: number },
  ) {
    const tenantId = user?.tenant_id
    if (!tenantId) throw new UnauthorizedException('Tenant credentials required')

    // Validate amount
    if (!body.amountKobo || body.amountKobo < 10000) {
      throw new BadRequestException('Minimum withdrawal is ₦100.00')
    }

    // KYC check
    const kyc = await this.prisma.tenantKyc.findUnique({ where: { tenant_id: tenantId } })
    if (!kyc || kyc.status !== 'verified') {
      throw new BadRequestException('KYC_NOT_VERIFIED')
    }

    // Bank account check
    const bank = await this.prisma.tenantBankAccount.findUnique({ where: { tenant_id: tenantId } })
    if (!bank) {
      throw new BadRequestException('No bank account saved. Add a bank account before withdrawing.')
    }

    // Balance check
    const [totalPaidAgg, totalWithdrawnAgg] = await Promise.all([
      this.prisma.payment.aggregate({
        where: { tenant_id: tenantId, status: 'paid' },
        _sum: { amount_kobo: true },
      }),
      this.prisma.withdrawal.aggregate({
        where: { tenant_id: tenantId, status: 'success' },
        _sum: { amount_kobo: true },
      }),
    ])
    const available = (totalPaidAgg._sum.amount_kobo ?? 0) - (totalWithdrawnAgg._sum.amount_kobo ?? 0)
    if (body.amountKobo > available) {
      throw new BadRequestException(`Insufficient balance. Available: ₦${(available / 100).toFixed(2)}`)
    }

    // Create pending withdrawal record first
    const reference = `WDR-${tenantId.slice(0, 8)}-${Date.now()}`
    const withdrawal = await this.prisma.withdrawal.create({
      data: {
        tenant_id: tenantId,
        amount_kobo: body.amountKobo,
        account_number: bank.account_number,
        bank_code: bank.bank_code,
        bank_name: bank.bank_name,
        account_name: bank.account_name,
        status: 'pending',
        provider: 'flutterwave',
        reference,
      },
    })

    // Try Flutterwave first
    const flutterwave = await this.getFlutterwave()
    if (flutterwave) {
      try {
        const result = await flutterwave.initiateTransfer(
          body.amountKobo,
          bank.account_number,
          bank.bank_code,
          bank.account_name,
          reference,
        )
        if (result.status === 'success') {
          await this.prisma.withdrawal.update({
            where: { id: withdrawal.id },
            data: { status: 'success', provider: 'flutterwave', provider_ref: result.providerRef },
          })
          return { success: true, provider: 'flutterwave', reference, withdrawal }
        }
      } catch (_err) {
        // Flutterwave failed — fall through to Paystack
      }
    }

    // Paystack fallback
    try {
      const paystack = await this.getPaystack()
      const recipientCode = await paystack.createTransferRecipient(
        bank.account_number,
        bank.bank_code,
        bank.account_name,
      )
      const paystackRef = `${reference}-PS`
      const result = await paystack.initiateTransfer(body.amountKobo, recipientCode, paystackRef)
      if (result.status === 'success') {
        await this.prisma.withdrawal.update({
          where: { id: withdrawal.id },
          data: { status: 'success', provider: 'paystack', provider_ref: result.providerRef, reference: paystackRef },
        })
        return { success: true, provider: 'paystack', reference: paystackRef, withdrawal }
      }
      await this.prisma.withdrawal.update({
        where: { id: withdrawal.id },
        data: { status: 'failed', failure_reason: result.message ?? 'Transfer failed' },
      })
      throw new InternalServerErrorException('Transfer failed on both providers')
    } catch (err: any) {
      if (err?.status === 500) throw err
      await this.prisma.withdrawal.update({
        where: { id: withdrawal.id },
        data: { status: 'failed', failure_reason: err?.message ?? 'Unknown error' },
      })
      throw new InternalServerErrorException('Withdrawal could not be processed. Please try again later.')
    }
  }
}
