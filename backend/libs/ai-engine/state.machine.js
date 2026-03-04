"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StateMachine = void 0;
class StateMachine {
    transition(current, intent, validation, hasDraft) {
        if (intent === 'EscalationRequest')
            return 'RequiresStaffAction';
        if (intent === 'Greeting' || intent === 'HelpRequest')
            return 'Validated';
        if (intent === 'OrderDraft' || intent === 'ModifyOrderDraft' || intent === 'BookingRequest') {
            if (hasDraft)
                return this.applyValidation('DraftCreated', validation);
            return this.applyValidation('CollectingInfo', validation);
        }
        return this.applyValidation('CollectingInfo', validation);
    }
    applyValidation(base, validation) {
        if (validation === 'Unknown')
            return 'AwaitingBackendValidation';
        if (validation === 'ConfirmedByBackend')
            return 'Validated';
        return 'RequiresStaffAction';
    }
}
exports.StateMachine = StateMachine;
