# Google Play Store Cheatsheet

Pre-filled answers for every Google Play Console question when publishing the Raven mobile app. Copy-paste these directly into the Play Store forms.

---

## Store Listing

### Short Description (80 char max)

```
Manage your business on WhatsApp — orders, payments, chats & AI automation.
```

### Full Description (4000 char max)

```
Raven is the all-in-one mobile command center for businesses that sell through WhatsApp. Manage customer conversations, take orders, track payments, and let AI handle the rest — all from your phone.

Whether you run a restaurant, hotel, retail store, or service business, Raven connects your WhatsApp number to a powerful AI-powered bot that talks to your customers, takes their orders, answers FAQs, and collects payments — while you focus on running your business.

KEY FEATURES

💬 Live Chat & Smart Handoff
See every WhatsApp conversation in real time. The AI bot handles routine enquiries automatically and hands off to you when a customer needs personal attention — with a notification so you never miss it.

🛒 Order Management
Customers browse your catalogue and place orders directly in WhatsApp. Every order appears instantly in the app with status tracking from pending to completed.

💳 Payment Tracking
See all payments at a glance — paid, pending, or failed. Payments are processed securely through Paystack so you never handle card details.

📋 Digital Catalogue
Upload your products or menu items with prices and descriptions. Your AI bot presents them beautifully to customers in WhatsApp.

🤖 AI-Powered Bot
Your bot answers customer questions, recommends products, takes orders, and sends payment links — 24/7, even while you sleep. Train it with custom FAQs so it sounds like you.

📊 Dashboard & Analytics
See your orders, revenue, conversations, and customer count at a glance. Know exactly how your business is performing today.

👥 Customer Contacts
Keep a clean record of every customer who messages your business. Add notes, see order history, and build real relationships.

📢 Broadcast Messages
Send announcements, promotions, or updates to all your customers or specific segments at once.

🔔 Real-Time Notifications
Get notified instantly when a new order comes in, a payment is confirmed, or a customer needs your attention.

🏨 Bookings (Hotels & Services)
Accept reservations and bookings through WhatsApp. Manage availability and confirmations from the app.

WHO IS RAVEN FOR?

• Restaurants & food businesses taking orders via WhatsApp
• Hotels & guesthouses managing room bookings
• Retail stores with a product catalogue
• Service businesses that communicate with clients on WhatsApp
• Any business that wants to automate customer conversations and sales

GETTING STARTED

1. Sign up and connect your WhatsApp business number
2. Upload your catalogue or menu
3. Customize your AI bot's personality and FAQs
4. Share your WhatsApp link — Raven handles the rest

Built for businesses ready to take their communication to the next level of automation. Works perfectly on slow networks. No timeouts, no frustration — just reliable performance wherever you are.
```

---

## Advertising ID Declaration

**Question:** Does your app use an advertising ID?

**Answer:** **No**

**Justification:**
- No `com.google.android.gms.permission.AD_ID` in the source or merged manifest
- No ad SDKs (AdMob, Facebook Ads, AppsFlyer, Adjust, Branch, etc.) in dependencies
- No Firebase Analytics or Google Mobile Ads SDK present
- No SDK injects AD_ID via manifest merging

> Select **No** on the Play Console declaration.

---

## Data Safety Declaration

### Overview

**8 data types collected** — all for app functionality, not shared with third parties, encrypted in transit, and support user-initiated deletion.

| Data Type | Collected | Shared |
|---|---|---|
| Name | Yes | No |
| Email address | Yes | No |
| User IDs | Yes | No |
| Other in-app messages | Yes | No |
| Photos | Yes | No |
| Videos | Yes | No |
| Files and docs | Yes | No |
| Device or other IDs | Yes | No |

---

### Full Data Safety Breakdown

#### Location
| Data Type | Collected? | Notes |
|---|---|---|
| Approximate location | **No** | No location permissions or APIs |
| Precise location | **No** | No location permissions or APIs |

#### Personal Info
| Data Type | Collected? | Notes |
|---|---|---|
| Name | **Yes** | User enters their name at registration |
| Email address | **Yes** | Registration and login |
| User IDs | **Yes** | Internal account IDs stored for session |
| Address | **No** | Never collected |
| Phone number | **No** | User never enters their own phone number |
| Race and ethnicity | **No** | — |
| Political or religious beliefs | **No** | — |
| Sexual orientation | **No** | — |
| Other personal info | **No** | — |

#### Financial Info
| Data Type | Collected? | Notes |
|---|---|---|
| User payment info | **No** | Paystack handles payment in external browser; no card/bank data enters the app |
| Purchase history | **No** | Displayed transactions are the tenant's customers' orders, not the user's own purchases |
| Credit score | **No** | — |
| Other financial info | **No** | — |

#### Health and Fitness
| Data Type | Collected? | Notes |
|---|---|---|
| Health info | **No** | — |
| Fitness info | **No** | — |

#### Messages
| Data Type | Collected? | Notes |
|---|---|---|
| Emails | **No** | — |
| SMS or MMS | **No** | — |
| Other in-app messages | **Yes** | User sends/receives WhatsApp business messages via chat |

#### Photos and Videos
| Data Type | Collected? | Notes |
|---|---|---|
| Photos | **Yes** | User picks photos from gallery to send in chat or upload business logo |
| Videos | **Yes** | User picks videos from gallery to send in chat |

#### Audio Files
| Data Type | Collected? | Notes |
|---|---|---|
| Voice or sound recordings | **No** | RECORD_AUDIO may be declared but is unused — recommend removing from manifest |
| Music files | **No** | — |
| Other audio files | **No** | — |

#### Files and Docs
| Data Type | Collected? | Notes |
|---|---|---|
| Files and docs | **Yes** | User picks documents to send in chat |

#### Calendar
| Data Type | Collected? | Notes |
|---|---|---|
| Calendar events | **No** | — |

#### Contacts
| Data Type | Collected? | Notes |
|---|---|---|
| Contacts | **No** | App has a manual business CRM, not access to the user's device address book |

#### App Activity
| Data Type | Collected? | Notes |
|---|---|---|
| App interactions | **No** | No analytics SDK |
| In-app search history | **No** | — |
| Installed apps | **No** | — |
| Other user-generated content | **No** | — |
| Other actions | **No** | — |

#### Web Browsing
| Data Type | Collected? | Notes |
|---|---|---|
| Web browsing history | **No** | — |

#### App Info and Performance
| Data Type | Collected? | Notes |
|---|---|---|
| Crash logs | **No** | No Sentry/Crashlytics in the mobile app |
| Diagnostics | **No** | — |
| Other app performance data | **No** | — |

#### Device or Other IDs
| Data Type | Collected? | Notes |
|---|---|---|
| Device or other IDs | **Yes** | FCM/Expo push token registered with backend |

---

### Key Clarifications for Tricky Questions

#### "Does your app collect Purchase history?"

**Answer: No.**

Google means purchases **the app user** made. The orders/payments displayed in the app are the **tenant's customer transactions** (business data the user manages), not the user's own purchases. The user's subscription payment is handled entirely via external Paystack browser — the app never collects or stores that transaction.

#### "Does your app collect Contacts?"

**Answer: No.**

Google means the user's **personal contacts** — address book, social graph, call history. The app's "Contacts" feature is a **manually-created business CRM** (customer names/phones the tenant types in). No device address book is accessed. No `READ_CONTACTS` permission exists.

#### "Does your app collect Phone number?"

**Answer: No.**

The user never enters **their own** phone number. The WhatsApp phone numbers in the app belong to the business's customers, entered/received via the WhatsApp Business API — not the user's personal number.

---

### For Each Collected Data Type — Standard Answers

When the form asks follow-up questions for each "Yes" data type, use these answers:

| Follow-up Question | Answer |
|---|---|
| Is this data collected, shared, or both? | **Collected** |
| Is this data processed ephemerally? | **No** (it's stored on the server) |
| Is this data required or can the user choose? | **Required** (for app functionality) |
| Why is this data collected? | **App functionality** |
| Is this data shared with third parties? | **No** |
| Is this data encrypted in transit? | **Yes** (HTTPS) |
| Can the user request data deletion? | **Yes** |

---

## Content Rating Questionnaire

Common answers for the IARC content rating:

| Question | Answer |
|---|---|
| Does the app contain violence? | No |
| Does the app contain sexual content? | No |
| Does the app contain profanity? | No |
| Does the app allow user interaction? | Yes (chat messaging) |
| Does the app share user location? | No |
| Does the app allow purchases? | No (payments are handled externally) |
| Does the app contain ads? | No |
| Does the app allow users to communicate freely? | Yes (WhatsApp business messages) |

Expected rating: **Rated for Everyone** or **PEGI 3** / **USK 0**

---

## App Category

| Field | Value |
|---|---|
| Application type | Application (not Game) |
| Category | **Business** |

---

## Target Audience

| Field | Value |
|---|---|
| Target age group | 18+ (business users only) |
| Does this app appeal to children? | No |

> Since this is a business tool, select **18 and over** to avoid additional children's policy requirements.

---

*Copy these answers directly into Google Play Console. Last verified: March 2026.*
