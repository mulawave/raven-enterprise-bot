export type Intent = 'Greeting' | 'HelpRequest' | 'MenuBrowse' | 'PriceInquiry' | 'AvailabilityInquiry' | 'OrderDraft' | 'ModifyOrderDraft' | 'BookingRequest' | 'PaymentStatusInquiry' | 'PolicyQuestion' | 'EscalationRequest' | 'GeneralInfo';
export interface IntentRoute {
    intent: Intent;
}
export declare class IntentRouter {
    route(text: string): IntentRoute;
    private matches;
}
