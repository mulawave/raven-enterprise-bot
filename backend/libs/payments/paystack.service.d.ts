export declare class PaystackService {
    private readonly secretKey;
    constructor(secretKey: string);
    private get headers();
    initialize(amountKobo: number, email: string, reference: string, callbackUrl: string): Promise<any>;
    verify(reference: string): Promise<any>;
}
