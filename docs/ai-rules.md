AI Conversation Engine Design (Hybrid)

Overview
- Goal: Zero hallucinations by combining AI-led understanding with deterministic validation.
- Hybrid approach: AI handles intent detection, entity extraction, and dialogue guidance; deterministic backend validates data, prices, availability, and commits actions.
- Constraints: AI never sets prices, never confirms availability, never completes orders. All validations and final decisions occur outside the AI.
- Fallback phrase: "Let me confirm that and get back to you."

Principles
- Determinism first: Every factual claim comes from authoritative backend data.
- Guarded actions: AI collects details and drafts but does not finalize.
- Minimal claims: If validation is not yet available, use the fallback phrase.
- Tenant-aware: Responses are scoped to the tenant’s data; cross-tenant leakage is impossible.

Intent List (Descriptions)
- Greeting: Begin conversation; offer assistance.
- HelpRequest: Ask for guidance or next steps; AI clarifies goals.
- MenuBrowse: Ask about categories or items; AI can describe items but does not set prices.
- PriceInquiry: Ask for item or booking price; AI relays backend-confirmed price only; otherwise fallback.
- AvailabilityInquiry: Ask whether items, rooms, or times are available; AI uses fallback and routes for validation; AI never confirms availability.
- OrderDraft: Provide order details (items, quantities, notes); AI drafts and routes to backend for validation; AI does not complete the order.
- ModifyOrderDraft: Adjust draft details; AI updates draft and re-routes for validation.
- BookingRequest: Provide booking details (dates, room type, party size); AI drafts and routes for validation; AI does not confirm or complete.
- PaymentStatusInquiry: Ask about payment status; AI may relay status strictly from backend records.
- PolicyQuestion: Ask about policies (refunds, hours); AI relays predefined tenant policies; if uncertain, fallback.
- EscalationRequest: Ask to speak with staff; AI escalates and confirms handoff initiation without making unavailable claims.
- GeneralInfo: Miscellaneous factual questions anchored in tenant data; if not deterministic, fallback.

Text-Based Flow Diagrams

1) Price Inquiry Flow
User → PriceInquiry → Collect item identifiers → Request backend price →
[Backend returns price] → AI relays price (no modifications)
[Backend uncertain/absent] → AI: "Let me confirm that and get back to you." → Queue validation

2) Availability Inquiry Flow
User → AvailabilityInquiry → Collect constraints (date/time/item/room) →
Always respond: "Let me confirm that and get back to you." → Route to backend validation →
[Backend result] → Staff or deterministic message delivers confirmation; AI does not confirm

3) Order Draft Flow
User → OrderDraft → Collect items/quantities/notes → Create Draft →
Send draft for backend validation →
[Valid] → AI acknowledges draft queued, does not complete → Fallback if completion requested
[Invalid] → AI relays deterministic reasons; offer correction

4) Booking Request Flow
User → BookingRequest → Collect dates/room type/guests → Create Draft →
Send for backend validation → Always use fallback for availability/confirmation →
[Valid] → Staff/deterministic flow proceeds; AI does not complete

5) Payment Status Flow
User → PaymentStatusInquiry → Identify order/booking/reference → Query backend →
[Status found] → AI relays status verbatim
[Not found] → AI: "Let me confirm that and get back to you." → Queue investigation

6) Menu Browse Flow
User → MenuBrowse → Identify category/item → Query backend descriptive data →
AI relays names/descriptions; for prices use Price Inquiry Flow

Deterministic State Model
- Conversation states: Idle, CollectingInfo, DraftCreated, AwaitingBackendValidation, Validated, RequiresStaffAction, Closed
- Artifact states (Order/Booking): Draft, PendingValidation, Valid, Invalid, AwaitingExternalCompletion, Completed (outside AI)
- Validation states: Unknown, ConfirmedByBackend, NotFound, Conflict

Deterministic State Transitions

Conversation-Level
- Idle → CollectingInfo: Triggered by a recognized intent requiring details
- CollectingInfo → DraftCreated: After sufficient entities captured
- DraftCreated → AwaitingBackendValidation: Submit to backend
- AwaitingBackendValidation → Validated (ConfirmedByBackend): Backend returns deterministic validation
- AwaitingBackendValidation → RequiresStaffAction (Conflict/NotFound): Needs human review
- Any → Closed: Explicit user exit or resolution outside AI

Order/Booking Artifact-Level
- Draft → PendingValidation: Draft prepared and submitted
- PendingValidation → Valid: Backend validates details (prices, inventory, dates)
- PendingValidation → Invalid: Backend returns constraints/violations
- Valid → AwaitingExternalCompletion: Requires non-AI finalization (payment capture, confirmation)
- AwaitingExternalCompletion → Completed: Completed externally; AI may relay status, not perform completion

Intent-Specific Transitions
- PriceInquiry: CollectingInfo → AwaitingBackendValidation → Validated → Relay price; if Unknown/NotFound → Fallback
- AvailabilityInquiry: CollectingInfo → AwaitingBackendValidation → RequiresStaffAction or Validated → AI still uses fallback; confirmations are external
- OrderDraft: CollectingInfo → DraftCreated → PendingValidation → Valid/Invalid → If Valid → AwaitingExternalCompletion; AI does not complete
- BookingRequest: CollectingInfo → DraftCreated → PendingValidation → Valid/Invalid → If Valid → AwaitingExternalCompletion; AI does not confirm
- PaymentStatusInquiry: CollectingInfo → AwaitingBackendValidation → Validated/NotFound → Relay or fallback
- MenuBrowse: CollectingInfo → Validated (descriptive data only) → Continue browsing or handoff to PriceInquiry
- PolicyQuestion: CollectingInfo → Validated (predefined policy) → Relay; if uncertain → Fallback
- EscalationRequest: Any → RequiresStaffAction → Handoff initiated and acknowledged (without availability claims)

Fallback Behavior
- Trigger the fallback phrase whenever a claim would be speculative, when validation is pending, or when policies/data are not deterministically available.
- Fixed phrase: "Let me confirm that and get back to you."
- The fallback always initiates a backend validation or staff handoff path.

Determinism and Validation Rules
- Prices: Always sourced from backend; AI relays without alteration; never computes or adjusts.
- Availability: Never confirmed by AI; validation routed externally; AI uses fallback.
- Order completion: Not performed by AI; AI prepares drafts and relays deterministic feedback.
- Records and statuses: AI may relay only persisted, tenant-scoped facts from backend.

Closure Criteria
- A conversation is closed when the user indicates completion or when external processes finalize and the status is relayed.
- AI does not assert closure for actions requiring external confirmation.
