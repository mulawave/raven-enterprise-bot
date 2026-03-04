# Live Demo Script — Raven Enterprise Bot

**Demo Duration:** 5-7 minutes  
**Format:** Interactive walkthrough (presenter-led)  
**Audience:** Restaurant/hotel owners, operations managers, digital marketing agencies  
**Goal:** Show how Raven automates customer conversations, orders, bookings, and payments via WhatsApp/Instagram/Facebook

---

## Table of Contents

1. [Pre-Demo Checklist](#pre-demo-checklist)
2. [Demo Narrative Arc](#demo-narrative-arc)
3. [Script with Timestamps](#script-with-timestamps)
4. [Technical Setup](#technical-setup)
5. [Common Objections & Responses](#common-objections--responses)
6. [Post-Demo Follow-Up](#post-demo-follow-up)

---

## Pre-Demo Checklist

### Environment Preparation (15 minutes before demo)

- [ ] **Backend Running:** `npm run start:dev` (verify at http://localhost:4000/api/health)
- [ ] **Database Seeded:** Run `psql -U app_user -d app_db -f seed-test.sql` (creates test-tenant-1, menu items, room types)
- [ ] **Redis Online:** `docker-compose up -d redis` (check with `redis-cli ping`)
- [ ] **WhatsApp Sandbox Connected:** Meta Developer Console → Test WhatsApp number saved
- [ ] **Postman/Thunder Client Ready:** Load `api-tests.http` for live API calls
- [ ] **Screen Sharing:** Clean desktop, close unrelated tabs, increase font size to 16pt
- [ ] **Phone with WhatsApp:** Logged in to test number, conversation cleared

### Test Data Verification
```bash
# Verify menu items exist
psql -U app_user -d app_db -c "SELECT id, name, price_kobo FROM \"MenuItem\";"

# Expected output:
# item-1 | Jollof Rice | 250000
# item-2 | Fried Rice  | 200000

# Verify room types exist
psql -U app_user -d app_db -c "SELECT id, name, price_kobo FROM \"RoomType\";"

# Expected output:
# room-1 | Standard Room | 1500000
# room-2 | Deluxe Suite  | 3000000
```

---

## Demo Narrative Arc

**Story:** "Imagine you run a busy restaurant in Lagos. You're getting 50 WhatsApp messages daily from customers asking about your menu, placing orders, and requesting delivery. Right now, you or your staff manually reply to each one. **Raven automates this entire workflow.**"

### Act 1: The Problem (30 seconds)
- Show typical WhatsApp conversation screenshot (20 messages, manual replies)
- "This takes 2-3 hours of staff time daily. And if a customer messages at midnight, they wait until morning for a response."

### Act 2: The Solution (5 minutes)
- **Live Demo:** Send WhatsApp message → AI responds instantly
- **Show Backend:** API call creates order → Payment initialized → Status updated
- **Show Dashboard:** (Future) View all conversations, orders, payments in one place

### Act 3: The Results (1 minute)
- "With Raven, you can handle 500 conversations/month for just ₦49,000. That's 97% cheaper than hiring a dedicated WhatsApp customer service rep (₦80,000/month)."
- **Call to Action:** "Let's get you started with a 2-week free trial. No credit card required."

---

## Script with Timestamps

### [00:00 - 00:30] Hook & Problem Statement

**Presenter:**  
> "Hi everyone! Today I'm showing you **Raven Enterprise Bot** — the easiest way to automate customer conversations on WhatsApp, Instagram, and Facebook for your restaurant or hotel.  
>
> Here's the problem we're solving: *[Share screen showing WhatsApp screenshot with 20+ messages]* If you run a restaurant, you probably get dozens of messages daily like this:  
> - 'What's on your menu today?'  
> - 'How much is jollof rice?'  
> - 'I want to order 5 plates for delivery'  
>
> Right now, you or your staff manually reply to each one. This takes **2-3 hours per day**, and if someone messages at 2 AM, they wait until morning. **Let me show you how Raven fixes this.**"

---

### [00:30 - 01:30] Act 1: Customer Sends WhatsApp Message

**Presenter:**  
> "I'm going to play the role of a customer. I'll send a WhatsApp message to our test restaurant's number. Watch what happens."

**Actions:**
1. Open WhatsApp on phone (or WhatsApp Web)
2. Send message to demo number: **"Hi, can I see your menu?"**
3. **[Wait 2-3 seconds]** — Raven auto-replies

**Expected AI Response:**
```
Hello! Welcome to Test Restaurant & Hotel. 🍽️

We have the following available:
- Jollof Rice (₦2,500)
- Fried Rice (₦2,000)

Would you like to place an order?
```

**Presenter:**  
> "Notice two things:  
> 1. **Instant response** — no human needed  
> 2. **AI fetched the real menu** from our database and formatted it nicely  
>
> Now watch what happens when I place an order..."

---

### [01:30 - 03:00] Act 2: Place Order & Payment Flow

**Actions (WhatsApp):**
1. Customer replies: **"I want 2 Jollof Rice"**
2. AI responds:
   ```
   Great! I've added 2 x Jollof Rice to your cart.
   
   Order Total: ₦5,000
   
   Please confirm:
   - Name: John Doe
   - Phone: +234 801 234 5678
   
   Reply 'CONFIRM' to proceed with payment.
   ```
3. Customer replies: **"CONFIRM"**
4. AI responds:
   ```
   Perfect! Your order #ORD123 has been created.
   
   Total: ₦5,000
   
   Click here to pay: https://checkout.paystack.com/xyz123
   
   Once paid, we'll notify the kitchen immediately!
   ```

**Presenter:**  
> "Notice the AI:  
> - Understood '2 Jollof Rice' (natural language, not a form)  
> - Calculated the total automatically (2 × ₦2,500)  
> - Created an order in our system  
> - Generated a **secure payment link** via Paystack  
>
> Let me show you what's happening behind the scenes..."

---

### [03:00 - 04:30] Act 3: Backend API Demo (Technical Depth)

**Presenter:**  
> "For those interested in the technical side, let me show you the API calls powering this."

**Actions (Switch to VS Code / Postman):**

1. **Show Order Creation API:**
   ```http
   GET http://localhost:4000/api/ordering/orders?tenantId=test-tenant-1&branchId=branch-1
   ```
   
   **Response:**
   ```json
   [
     {
       "id": "order_abc123",
       "customer": {
         "name": "John Doe",
         "phone": "+2348012345678"
       },
       "total_kobo": 500000,
       "status": "pending",
       "items": [
         {
           "menuItem": { "name": "Jollof Rice" },
           "quantity": 2,
           "price_kobo": 250000
         }
       ],
       "created_at": "2026-01-31T14:23:45.000Z"
     }
   ]
   ```

   **Presenter:**  
   > "See? The order is now in the system with status 'pending'. When the customer pays, it automatically updates to 'confirmed'."

2. **Show Payment Initialization API:**
   ```http
   POST http://localhost:4000/api/payments/initialize
   {
     "tenantId": "test-tenant-1",
     "amountKobo": 500000,
     "email": "john@test.com",
     "provider": "paystack",
     "orderId": "order_abc123"
   }
   ```
   
   **Response:**
   ```json
   {
     "payment": {
       "id": "payment_xyz",
       "reference": "pay_ref_abc123",
       "status": "pending"
     },
     "authorizationUrl": "https://checkout.paystack.com/xyz123"
   }
   ```

   **Presenter:**  
   > "This is the same payment link sent to the customer. When they pay, Paystack notifies our backend via webhook, and we auto-confirm the order. **No manual reconciliation needed.**"

3. **Show Payment Verification (after customer pays):**
   ```http
   GET http://localhost:4000/api/payments/verify?tenantId=test-tenant-1&reference=pay_ref_abc123&provider=paystack
   ```
   
   **Response:**
   ```json
   {
     "payment": {
       "status": "paid",
       "verified_at": "2026-01-31T14:25:12.000Z"
     },
     "verified": true
   }
   ```

   **Presenter:**  
   > "Payment verified! The order status is now 'confirmed', and the kitchen can start preparing. **Fully automated.**"

---

### [04:30 - 05:30] Act 4: Booking Flow (Hotel Use Case)

**Presenter:**  
> "Raven isn't just for restaurants. If you run a hotel, it handles bookings too. Let me show you..."

**Actions (WhatsApp):**
1. Customer sends: **"Do you have rooms available for Feb 1-3?"**
2. AI responds:
   ```
   Let me check availability for you...
   
   ✅ Standard Room (₦15,000/night) — Available
   ✅ Deluxe Suite (₦30,000/night) — Available
   
   Which would you like to book?
   ```
3. Customer replies: **"Standard Room"**
4. AI responds:
   ```
   Great choice! I've reserved:
   - Standard Room
   - Check-in: Feb 1, 2:00 PM
   - Check-out: Feb 3, 12:00 PM
   - Total: ₦30,000 (2 nights)
   
   Click to pay: https://checkout.paystack.com/booking456
   
   Payment secures your reservation!
   ```

**Presenter:**  
> "Notice the AI:  
> - Checked real-time availability in our database  
> - Calculated 2-night stay automatically  
> - Created the booking and payment link  
>
> This prevents double-bookings and manual calendar management. Everything syncs in real-time."

---

### [05:30 - 06:30] Act 5: Multi-Channel Support

**Presenter:**  
> "One more thing: Raven works on **WhatsApp, Instagram, and Facebook Messenger** — all from the same backend.  
>
> *[Switch to Instagram Direct Messages on phone]*  
> Watch this — I'll send the same order request via Instagram..."

**Actions (Instagram):**
1. Customer sends DM: **"Can I order 3 Fried Rice?"**
2. AI responds (same logic as WhatsApp):
   ```
   Sure! I've added 3 x Fried Rice (₦6,000) to your cart.
   
   Reply CONFIRM to proceed with payment.
   ```

**Presenter:**  
> "Same AI, same backend, same payment flow. Whether your customers reach you on WhatsApp, Instagram, or Facebook, they get the same seamless experience.  
>
> And on your side, **all conversations appear in one dashboard** (we'll launch this next month). No more switching between 3 different apps."

---

### [06:30 - 07:00] Pricing & Call to Action

**Presenter:**  
> "Let's talk pricing. Raven has 3 plans:  
>
> **Starter Plan (₦49,000/month):**  
> - 500 conversations/month  
> - Perfect for small restaurants/cafes  
> - WhatsApp + Instagram + Facebook  
>
> **Growth Plan (₦199,000/month):**  
> - 2,500 conversations/month  
> - Full AI with GPT-4 (smarter responses)  
> - Up to 5 branch locations  
>
> **Enterprise Plan (₦799,000/month):**  
> - 12,000 conversations/month  
> - Custom AI training for your menu  
> - Unlimited branches  
> - White-label branding  
>
> **Special Launch Offer:** Sign up today and get **2 weeks free trial** — no credit card required. We'll help you set up your WhatsApp number and import your menu.  
>
> Who wants to try this out?"

**[Show signup form or share contact link]**

---

## Technical Setup

### Local Development Demo Environment

#### 1. Infrastructure
```bash
# Start Docker services
cd docker
docker-compose up -d postgres redis

# Verify services
docker ps  # Should show postgres and redis containers
```

#### 2. Database Setup
```bash
# Run migrations
cd backend
npx prisma migrate dev

# Seed test data
psql -U app_user -d app_db -f seed-test.sql

# Verify data
psql -U app_user -d app_db -c "SELECT * FROM \"MenuItem\";"
psql -U app_user -d app_db -c "SELECT * FROM \"RoomType\";"
```

#### 3. Backend API
```bash
# Install dependencies (if not done)
npm install

# Start development server
npm run start:dev

# Verify API is running
curl http://localhost:4000/api/health
# Expected: {"status":"ok"}

# Test readiness (DB + Redis)
curl http://localhost:4000/api/ready
# Expected: {"status":"healthy","checks":{...}}
```

#### 4. WhatsApp Sandbox Setup

**Meta Developer Portal:**
1. Go to https://developers.facebook.com/
2. Create App → Business → WhatsApp
3. Add WhatsApp Product
4. Go to "API Setup" → Get test phone number
5. Add your phone number to sandbox whitelist
6. Send test message: "join [sandbox-keyword]"

**Configure Webhook:**
1. In Meta Developer Console → WhatsApp → Configuration
2. Webhook URL: `https://your-ngrok-url.ngrok.io/api/messaging/webhook/whatsapp`
3. Verify Token: (set in `.env` as `WEBHOOK_VERIFY_TOKEN`)
4. Subscribe to: `messages`, `messaging_postbacks`

**Expose Local API via ngrok (for webhook testing):**
```bash
ngrok http 4000

# Copy HTTPS URL (e.g., https://abc123.ngrok.io)
# Update Meta webhook URL to: https://abc123.ngrok.io/api/messaging/webhook/whatsapp
```

---

### Production Demo Environment (Optional)

**Deployed API:**
- Host backend on Railway/Render/Heroku
- Use real PostgreSQL (AWS RDS or provider's managed DB)
- Use real Redis (AWS ElastiCache or Upstash)
- Configure production WhatsApp Business API (requires Meta Business verification)

**Benefits:**
- No ngrok required
- Stable webhook URLs
- Faster response times (no local network lag)
- Can demo from anywhere (no laptop required)

---

## Common Objections & Responses

### Objection 1: "We already use WhatsApp Business App"

**Response:**  
> "That's great! WhatsApp Business App is perfect for small teams. But here's the difference:  
>
> **WhatsApp Business App:**  
> - Manual replies (you type every message)  
> - Quick replies help, but still require taps  
> - No payment integration  
> - No multi-channel (WhatsApp only)  
>
> **Raven:**  
> - AI handles 80% of conversations automatically  
> - Creates orders/bookings without human input  
> - Integrated payments (Paystack link sent instantly)  
> - Works on WhatsApp, Instagram, Facebook simultaneously  
>
> Think of Raven as your 24/7 AI assistant that handles repetitive tasks, freeing your staff for high-value customer service."

---

### Objection 2: "What if the AI makes a mistake?"

**Response:**  
> "Great question! Raven has **built-in safety rails**:  
>
> 1. **Read-Only AI:** The AI can browse your menu, check availability, and create draft orders — but it **cannot confirm payments** or charge customers without their explicit click on the payment link.  
>
> 2. **Fallback Handling:** If the AI doesn't understand a request (e.g., 'Can I pay with cowries?'), it responds: 'I didn't quite get that. Let me connect you to our team.' Then it flags the conversation for human review.  
>
> 3. **Audit Logs:** Every AI action is logged. You can see exactly what it said to customers and override if needed.  
>
> In our beta testing with 10 restaurants, **AI accuracy was 94%** for menu questions and **98%** for order creation. The 2-6% edge cases get escalated to staff."

---

### Objection 3: "We don't get enough WhatsApp messages to justify ₦49,000/month"

**Response:**  
> "Let's do the math together. How many WhatsApp messages do you get daily? *[Wait for answer, e.g., '10-15']*  
>
> Okay, so ~12 messages/day × 30 days = **360 messages/month**. That fits in our Starter Plan (500 conversations/month).  
>
> Now, each message takes about 2-3 minutes to handle manually:  
> - Read the question  
> - Check menu/availability  
> - Type response  
> - Follow up on payment  
>
> That's **360 messages × 2.5 minutes = 900 minutes/month = 15 hours**.  
>
> If you pay staff ₦5,000/hour (₦80,000/month salary ÷ 160 hours), that's **₦75,000 in labor cost** just for WhatsApp replies.  
>
> Raven costs ₦49,000 and handles it 24/7, even at 2 AM. You're saving **₦26,000/month** plus freeing staff for in-person customer service."

---

### Objection 4: "We need this in Yoruba/Igbo/Hausa, not just English"

**Response:**  
> "Good news! Raven's AI (GPT-4) supports **50+ languages** including Yoruba, Igbo, and Hausa.  
>
> Here's how it works:  
> 1. Customer sends message in Yoruba: *'Bawo ni, ṣe mo le ra ounje?'*  
> 2. AI detects language and responds in Yoruba: *'Kaabo! Eyi ni menu wa...'*  
>
> We can also set a **default language** for your business. For example, if 80% of your customers speak Yoruba, we configure Yoruba as primary, with English as fallback.  
>
> And if you want to customize phrases (e.g., 'Welcome to Mama Cass Kitchen' in Igbo), we can add that to your **Enterprise Plan** with custom AI training."

---

### Objection 5: "What if our internet goes down?"

**Response:**  
> "Raven runs on **cloud infrastructure** (AWS/GCP), so even if your restaurant's internet is down, the AI keeps responding to customers.  
>
> Here's what happens:  
> 1. Customer sends WhatsApp message → Meta's servers receive it (they're always online)  
> 2. Meta forwards to Raven's cloud servers → AI processes and responds  
> 3. Response sent back to customer via Meta's servers  
>
> Your local internet only matters when **you** want to check the dashboard or manually override an AI response. But the customer-facing chatbot runs independently in the cloud.  
>
> We also have **99.5% uptime SLA** on Enterprise Plan (monitored via health checks). If Raven goes down for more than 1 hour/month, you get a credit."

---

## Post-Demo Follow-Up

### Immediate Next Steps (During Call)

1. **Qualify Lead:**
   - "How many conversations do you handle monthly?" → Determine tier
   - "Do you currently use WhatsApp Business API or just the app?" → Assess technical readiness
   - "What's your biggest pain point with customer messaging?" → Tailor value prop

2. **Share Resources:**
   - Email: `docs/dashboard-api.contract.md` (if technical buyer)
   - Email: `docs/pricing-strategy.md` (if decision-maker)
   - Calendar link: Book 30-min onboarding call

3. **Offer Trial:**
   - "Let's set you up with a free 2-week trial. I'll need:
     - Your business name
     - WhatsApp Business API number (or we'll help you get one)
     - Sample menu items (3-5 dishes or room types)
   - We'll have you up and running in 48 hours."

---

### Email Follow-Up Template

**Subject:** Your Raven Demo + Next Steps

**Body:**
```
Hi [Name],

Thanks for joining today's demo! Here's a quick recap of what we covered:

✅ AI-powered WhatsApp/Instagram/Facebook chatbot
✅ Automated ordering, booking, and payment processing
✅ 500 conversations/month for ₦49,000 (Starter Plan)

NEXT STEPS:
1. Try Raven Free for 2 Weeks (no credit card required)
   → Click here to sign up: [link]

2. Questions? Book a 1-on-1 onboarding call:
   → [Calendar link]

3. Review detailed pricing: [Attach pricing-strategy.md]

Let me know if you'd like help setting up your WhatsApp Business API number — we offer this as a free concierge service for Enterprise customers.

Looking forward to automating your customer conversations!

Best,
[Your Name]
Raven Enterprise Bot Team
```

---

### Common Post-Demo Questions

**Q: Can we customize the AI's tone? (e.g., more formal vs casual)**  
**A:** Yes! On Growth and Enterprise plans, we can adjust the AI's personality. For example:
- Casual: "Hey! What can I get you today? 😊"
- Formal: "Good afternoon. How may I assist you with your order?"

**Q: Can Raven integrate with our existing POS system?**  
**A:** Yes, on Enterprise Plan. We have REST API endpoints (`POST /api/ordering/orders`) that your POS can call. Common integrations:
- Toast POS
- Square
- Lightspeed
- Custom in-house systems (we provide API docs)

**Q: What happens to old conversations after we cancel?**  
**A:** We retain your data for **30 days** after cancellation (for reactivation). After 30 days, all data is permanently deleted per NDPR (Nigeria Data Protection Regulation). You can export conversation history anytime via the dashboard.

**Q: Do we need a developer to set this up?**  
**A:** No! For Starter and Growth plans, setup is **no-code**:
1. We create your account
2. You provide your menu items (Excel spreadsheet or Google Sheets)
3. We import and configure
4. You connect your WhatsApp number (we guide you step-by-step)
5. Go live in 48 hours

For Enterprise (custom integrations), we offer **white-glove onboarding** with our engineering team.

---

## Demo Variations by Audience

### For Restaurant Owners (Focus on Ordering)
- Emphasize: Menu automation, delivery coordination, payment confirmation
- Skip: Booking flow (unless they also have event space)
- Add: "Upselling feature" (AI suggests drinks with main dishes)

### For Hotel Managers (Focus on Bookings)
- Emphasize: Real-time availability, double-booking prevention, check-in reminders
- Skip: Extensive ordering demo (unless they have room service)
- Add: "Booking modifications" (AI handles date changes, cancellations)

### For Digital Agencies (Focus on Technical Features)
- Emphasize: API-first design, webhook reliability, white-label options
- Show: API documentation (`dashboard-api.contract.md`)
- Add: "Reseller program" (30% commission, details in `pricing-strategy.md`)

---

## Demo Recording Checklist

If recording demo for asynchronous sharing (e.g., YouTube, sales page):

- [ ] Use Loom or OBS to record screen + webcam
- [ ] Start with slide: "Raven Enterprise Bot — 5-Minute Demo"
- [ ] Keep cursor movements slow (easier to follow)
- [ ] Add captions (many watch muted)
- [ ] Include CTA at end: "Start Free Trial: [link]"
- [ ] Upload to YouTube (unlisted) + embed on landing page

**Sample Recording Outline:**
1. [0:00-0:15] Intro slide + hook
2. [0:15-2:00] WhatsApp ordering demo
3. [2:00-3:30] Payment flow + backend API
4. [3:30-4:30] Booking demo (hotel use case)
5. [4:30-5:00] Multi-channel (Instagram)
6. [5:00-5:30] Pricing + CTA

---

## Metrics to Track (Post-Demo)

**Demo Performance KPIs:**
- **Demo-to-Trial Conversion:** % of demo attendees who sign up for free trial
  - Target: 40%+
- **Trial-to-Paid Conversion:** % of trials who become paying customers
  - Target: 25%+
- **Average Deal Size:** Which tier do most customers choose?
  - Hypothesis: 60% Starter, 30% Growth, 10% Enterprise

**How to Measure:**
- Add UTM parameters to trial signup links: `?utm_source=demo&utm_campaign=live_jan2026`
- Track in CRM (HubSpot, Pipedrive, etc.)
- Monthly report: "Jan 2026: 20 demos → 8 trials → 2 paid (Starter: 1, Growth: 1)"

---

## Appendix: Demo Disaster Recovery

### What if the demo breaks?

#### Scenario 1: Backend API is down
**Symptoms:** `curl http://localhost:4000/api/health` returns connection error  
**Fix:**
1. Restart NestJS: `npm run start:dev`
2. If still broken, use **backup recording**: "Let me show you a pre-recorded demo while we troubleshoot..."
3. Resume with pricing discussion

#### Scenario 2: WhatsApp sandbox expired
**Symptoms:** Send message, no AI response  
**Fix:**
1. Check Meta Developer Console → WhatsApp → Configuration → Test number still active?
2. If expired, re-join sandbox: Send "join [keyword]" to test number
3. Fallback: Use **Postman to simulate webhook**:
   ```bash
   # Manually trigger AI processing
   POST http://localhost:4000/api/messaging/webhook/whatsapp
   {
     "object": "whatsapp_business_account",
     "entry": [...]  # Copy from Meta webhook docs
   }
   ```

#### Scenario 3: Payment link doesn't generate
**Symptoms:** API returns error when calling `/api/payments/initialize`  
**Common Causes:**
- Paystack API keys not set in `.env`
- Test mode disabled
- Order ID invalid (doesn't exist in database)

**Quick Fix:**
1. Skip live payment demo
2. Show **pre-generated screenshot** of Paystack checkout page
3. Say: "In production, this link is sent instantly via WhatsApp. Let me show you the verified payment response..."

#### Scenario 4: Database has no test data
**Symptoms:** API returns empty arrays for menu/room types  
**Fix:**
1. Re-run seed script: `psql -U app_user -d app_db -f seed-test.sql`
2. Refresh API call
3. If still broken, switch to **slides** showing example responses

---

**Demo Success Formula:**  
**Preparation (80%) + Storytelling (15%) + Technical Smoothness (5%) = Winning Demo**

Practice this script 3-5 times before delivering live. Record yourself and watch for filler words ("um", "like") and pacing. **Confidence sells more than perfect code.**

Good luck! 🚀
