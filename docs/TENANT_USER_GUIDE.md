# Raven AI — Tenant User Guide

> Step-by-step guide for tenants using the Raven AI WhatsApp commerce platform.

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Dashboard Overview](#2-dashboard-overview)
3. [Conversations](#3-conversations)
4. [Orders](#4-orders)
5. [Products & Menu](#5-products--menu)
6. [Bookings & Appointments](#6-bookings--appointments)
7. [Broadcast Campaigns](#7-broadcast-campaigns)
8. [Subscription & Billing](#8-subscription--billing)
9. [Settings](#9-settings)
10. [Getting Help](#10-getting-help)

---

## 1. Getting Started

### Receiving your Tenant ID

After your account is provisioned by a Raven AI administrator, you will receive an email containing your **Tenant ID**. This ID is unique to your business and is required to log in. Keep it secure — treat it like a password.

### Logging in

1. Visit [https://app.raven-ai.online](https://app.raven-ai.online)
2. Click **Sign In**
3. Enter your Tenant ID on the login screen
4. Click **Continue** — you will be redirected to your dashboard overview

> **Note:** If you receive an "Invalid Tenant ID" error, contact your Raven AI administrator to verify your account status.

---

## 2. Dashboard Overview

### Overview page

The Overview page is the first thing you see after logging in. It shows:

| Metric | Description |
|---|---|
| Current Plan | Your active subscription tier |
| Conversations Used | Number of WhatsApp threads this month |
| Usage Bar | Visual progress toward your monthly limit |
| Total Revenue | Sum of completed orders this month |
| Recent Orders | Last 5 orders placed via WhatsApp |

### Navigation

Use the **left sidebar** to move between modules:

- 📊 **Overview** — Summary stats
- 💬 **Conversations** — WhatsApp threads
- 🛒 **Orders** — Customer orders
- 🏨 **Bookings** — Appointment scheduling
- 💳 **Payments** — Transaction history
- 📦 **Subscription** — Plan management
- ⚙️ **Settings** — Business configuration

---

## 3. Conversations

### Viewing conversations

Navigate to **Conversations** to see all WhatsApp threads your AI assistant has handled. Each row shows:
- Customer phone number
- Last message (truncated)
- Status badge (Active / Resolved / Escalated)
- Thread timestamp

Click any row to open the full message history.

### AI responses

Your AI assistant responds automatically to customers using:
- Your product catalogue
- Your configured FAQs
- Business hours you have set
- The conversation tone you selected during setup

Responses are generated in real time and delivered directly to the customer's WhatsApp.

### Conversation statuses

| Status | Meaning |
|---|---|
| **Active** | Conversation is ongoing |
| **Resolved** | AI closed the conversation successfully |
| **Escalated** | Flagged for a human team member to follow up |

---

## 4. Orders

### How orders are created

When a customer selects products through a WhatsApp conversation, the AI:
1. Presents the product summary
2. Asks for confirmation
3. Creates an order record automatically
4. Sends a confirmation message to the customer

Orders appear on the **Orders** page in real time.

### Order lifecycle

```
Pending → Confirmed → Processing → Completed
                                 ↘ Cancelled (archived)
```

You can update order status manually from the order detail view.

### Revenue tracking

Completed orders contribute to the revenue figures on the Overview page. If a payment gateway (Paystack) is configured:
- Orders show payment status (Paid / Pending Payment)
- Payment links are automatically generated and sent to customers by the AI

---

## 5. Products & Menu

### Adding products

1. Go to **Settings → Products**
2. Click **Add Product**
3. Fill in: Name, Price, Description, Category, and optionally upload an image
4. Click **Save**

Products are immediately available for the AI to reference in conversations.

### Categories

Group your products to help the AI present them clearly:
- Go to **Settings → Categories** and add your category names (e.g., Starters, Mains, Beverages, Services)
- Assign each product to a category
- The AI will group products by category when presenting the menu to customers

### Pricing

Prices are entered without currency symbols. Ensure your currency is configured under **Settings → Business Profile** so the AI formats prices correctly.

---

## 6. Bookings & Appointments

### Enabling bookings

The Bookings module is available on Professional and Enterprise plans. To enable:
1. Go to **Settings → Bookings**
2. Add your services (e.g., "60-minute consultation", "Table for 2")
3. Set available time slots and lead time (minimum notice required to book)
4. Save

Customers can then book through WhatsApp by saying something like "I'd like to make a booking."

### Managing bookings

The **Bookings** page lists all upcoming and past appointments with:
- Customer name and phone
- Service booked
- Date and time
- Status (Confirmed / Completed / Cancelled)

You can manually cancel or mark bookings as completed from this page.

### Automated reminders

Raven AI automatically sends a WhatsApp reminder to the customer **24 hours before** the appointment. No manual action is required.

---

## 7. Broadcast Campaigns

### Creating a broadcast

1. Go to **Conversations → Broadcasts**
2. Click **New Broadcast**
3. Write your message (must comply with [WhatsApp's messaging policies](https://business.whatsapp.com/policy))
4. Select a customer segment:
   - **All Customers** — Everyone in your contact list
   - **Recent Buyers** — Customers who ordered in the last 30 days
   - **Inactive Users** — No interaction in 60+ days
5. Set a send date/time (or send immediately)
6. Click **Schedule** or **Send Now**

### Delivery reporting

After sending, the Broadcasts table updates to show:
- **Delivered** — Message reached the customer's device
- **Read** — Customer opened the message (where WhatsApp reports this)
- **Replied** — Customer sent a reply

---

## 8. Subscription & Billing

### Viewing your plan

Go to **Subscription** to see:
- Current plan name and tier
- Monthly conversation limit and how many you've used
- Next renewal date
- Billing history with downloadable invoices

### Upgrading

1. Click **Change Plan**
2. Review available tiers and their limits
3. Select a plan and click **Upgrade**
4. Complete payment via Paystack
5. Your new limit is applied immediately

### Downgrading

1. Click **Change Plan** and select a lower tier
2. The downgrade takes effect at the **start of the next billing cycle**
3. You retain your current limits until then

### Invoice emails

After each successful charge, an invoice is emailed to your registered business email address. Contact support if you need a VAT receipt or need to update your billing address.

---

## 9. Settings

### Business profile

Under **Settings → Profile**:
- Business name (shown in AI messages and email footers)
- Business address
- Contact email and phone number

### Branding

Under **Settings → Branding**:
- Upload a business logo
- Upload a favicon
- These appear in your dashboard interface

### Notifications

Under **Settings → Notifications**, toggle which events send email alerts to your team:
- New order received
- Payment failed
- Conversation escalated
- Subscription renewal reminder

---

## 10. Getting Help

### Platform support

Email: **support@raven-ai.online**

Include:
- Your Tenant ID
- A description of the issue
- Screenshot if applicable

Response time: within 1 business day.

### WhatsApp API not responding

If your AI stops replying to customers:
1. Check that your WhatsApp API key is valid (ask your Raven AI administrator)
2. Verify your WhatsApp Business account is not restricted by Meta
3. Check the **System Status** indicator at the top of your dashboard

### Conversation limit reached

If you see a "Limit reached" banner:
1. Go to **Subscription → Change Plan** to upgrade
2. Or wait until your billing cycle resets (date shown on the Overview page)
3. AI responses are paused for new conversations only — existing threads continue

### Billing issues

For payment failures or billing disputes:
Email **billing@raven-ai.online** with your Tenant ID and invoice reference.

---

*Guide version 1.0 — Raven AI Platform*
