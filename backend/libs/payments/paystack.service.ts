import axios from 'axios'

export interface BankInfo {
  id: number
  name: string
  slug: string
  code: string
  longcode: string
  gateway?: string
  active: boolean
  country: string
  currency: string
  type: string
}

export interface AccountVerification {
  account_number: string
  account_name: string
  bank_id: number
}

export interface PaystackTransferResult {
  status: 'success' | 'failed'
  reference: string
  providerRef?: string
  message?: string
}

export class PaystackService {
  constructor(private readonly secretKey: string) {}

  private get headers() {
    return { Authorization: `Bearer ${this.secretKey}` }
  }

  async initialize(amountKobo: number, email: string, reference: string, callbackUrl: string) {
    try {
      const res = await axios.post(
        'https://api.paystack.co/transaction/initialize',
        {
          amount: amountKobo,
          email,
          reference,
          callback_url: callbackUrl,
          currency: 'NGN',
        },
        { headers: this.headers },
      )
      return res.data
    } catch (err: any) {
      const body = err?.response?.data
      throw new Error(`Paystack initialize failed [${err?.response?.status}]: ${JSON.stringify(body)}`)
    }
  }

  async verify(reference: string) {
    const res = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      { headers: this.headers },
    )
    return res.data
  }

  async getBankList(): Promise<BankInfo[]> {
    const res = await axios.get(
      'https://api.paystack.co/bank?country=nigeria&use_cursor=false&perPage=100',
      { headers: this.headers },
    )
    return res.data?.data ?? []
  }

  async verifyAccountNumber(accountNumber: string, bankCode: string): Promise<AccountVerification> {
    const res = await axios.get(
      `https://api.paystack.co/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
      { headers: this.headers },
    )
    return res.data?.data
  }

  async createTransferRecipient(accountNumber: string, bankCode: string, name: string): Promise<string> {
    const res = await axios.post(
      'https://api.paystack.co/transferrecipient',
      {
        type: 'nuban',
        name,
        account_number: accountNumber,
        bank_code: bankCode,
        currency: 'NGN',
      },
      { headers: this.headers },
    )
    return res.data?.data?.recipient_code
  }

  async initiateTransfer(
    amountKobo: number,
    recipientCode: string,
    reference: string,
    reason: string = 'Raven payout',
  ): Promise<PaystackTransferResult> {
    const res = await axios.post(
      'https://api.paystack.co/transfer',
      {
        source: 'balance',
        amount: amountKobo,
        recipient: recipientCode,
        reason,
        reference,
      },
      { headers: this.headers },
    )
    const status = res.data?.data?.status === 'success' ? 'success' : 'failed'
    return {
      status,
      reference,
      providerRef: res.data?.data?.transfer_code,
      message: res.data?.message,
    }
  }
}
