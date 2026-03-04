"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaystackService = void 0;
const axios_1 = __importDefault(require("axios"));
class PaystackService {
    constructor(secretKey) {
        this.secretKey = secretKey;
    }
    get headers() {
        return { Authorization: `Bearer ${this.secretKey}` };
    }
    async initialize(amountKobo, email, reference, callbackUrl) {
        const res = await axios_1.default.post('https://api.paystack.co/transaction/initialize', {
            amount: amountKobo,
            email,
            reference,
            callback_url: callbackUrl,
            currency: 'NGN',
        }, { headers: this.headers });
        return res.data;
    }
    async verify(reference) {
        const res = await axios_1.default.get(`https://api.paystack.co/transaction/verify/${reference}`, { headers: this.headers });
        return res.data;
    }
}
exports.PaystackService = PaystackService;
