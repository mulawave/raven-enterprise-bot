import axios from 'axios'

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
}
