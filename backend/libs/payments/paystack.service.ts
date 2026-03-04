import axios from 'axios'

export class PaystackService {
  constructor(private readonly secretKey: string) {}

  private get headers() {
    return { Authorization: `Bearer ${this.secretKey}` }
  }

  async initialize(amountKobo: number, email: string, reference: string, callbackUrl: string) {
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
  }

  async verify(reference: string) {
    const res = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      { headers: this.headers },
    )
    return res.data
  }
}
