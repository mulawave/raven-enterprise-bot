import axios from 'axios'

export interface FlwTransferResult {
  status: 'success' | 'failed'
  reference: string
  providerRef?: string
  message?: string
}

export class FlutterwaveService {
  constructor(private readonly secretKey: string) {}

  private get headers() {
    return { Authorization: `Bearer ${this.secretKey}` }
  }

  async initialize(amountKobo: number, email: string, txRef: string, redirectUrl: string) {
    const res = await axios.post(
      'https://api.flutterwave.com/v3/payments',
      {
        tx_ref: txRef,
        amount: (amountKobo / 100).toFixed(2),
        currency: 'NGN',
        redirect_url: redirectUrl,
        customer: { email },
      },
      { headers: this.headers },
    )
    return res.data
  }

  async verify(txId: string) {
    const res = await axios.get(
      `https://api.flutterwave.com/v3/transactions/${txId}/verify`,
      { headers: this.headers },
    )
    return res.data
  }

  async getBankList(): Promise<Array<{ id: number; code: string; name: string }>> {
    const res = await axios.get('https://api.flutterwave.com/v3/banks/NG', { headers: this.headers })
    return res.data?.data ?? []
  }

  async initiateTransfer(
    amountKobo: number,
    accountNumber: string,
    bankCode: string,
    accountName: string,
    reference: string,
    narration: string = 'Raven payout',
  ): Promise<FlwTransferResult> {
    const res = await axios.post(
      'https://api.flutterwave.com/v3/transfers',
      {
        account_bank: bankCode,
        account_number: accountNumber,
        amount: (amountKobo / 100).toFixed(2),
        narration,
        currency: 'NGN',
        reference,
        beneficiary_name: accountName,
      },
      { headers: this.headers },
    )
    const status = res.data?.status === 'success' ? 'success' : 'failed'
    return {
      status,
      reference,
      providerRef: String(res.data?.data?.id ?? ''),
      message: res.data?.message,
    }
  }
}
