import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding Raven Enterprise Bot project FAQs...')

  const tenantId = 'c4b264bf-783e-40f0-87a2-cd6340dc5bc4'

  // Create meaningful FAQs about the Raven project
  const faqs = [
    {
      tenant_id: tenantId,
      question: 'What is Raven Enterprise Bot?',
      answer: 'Raven Enterprise Bot is a complete multi-tenant WhatsApp Business automation platform that lets businesses automate customer conversations with AI, manage live agent handoff, process orders, handle payments, and run their entire customer operations — all through WhatsApp. It includes AI-powered chatbots, order management, payment processing, booking systems, and a full dashboard for managing your business.',
      sort_order: 1,
      hidden: false,
      source: 'manual',
    },
    {
      tenant_id: tenantId,
      question: 'How do I sign up for Raven?',
      answer: 'You can sign up by visiting https://app.raven-ai.online/register. Fill in your name, email, password, select a plan (Starter, Growth, or Enterprise), and click Create Account. You\'ll receive a confirmation email - click the link to verify your account. Then complete the onboarding wizard to set up your business profile and WhatsApp integration.',
      sort_order: 2,
      hidden: false,
      source: 'manual',
    },
    {
      tenant_id: tenantId,
      question: 'What are the pricing plans?',
      answer: 'Raven offers three pricing tiers: Starter Plan (₦49,000/month) - 500 conversations/month, 1 branch, basic AI; Growth Plan (₦199,000/month) - 2,500 conversations/month, 5 branches, full GPT-4 AI; Enterprise Plan (₦799,000/month) - 12,000 conversations/month, unlimited branches, custom AI training, white-label branding. All plans include WhatsApp, Instagram, and Facebook integration.',
      sort_order: 3,
      hidden: false,
      source: 'manual',
    },
    {
      tenant_id: tenantId,
      question: 'What messaging channels does Raven support?',
      answer: 'Raven supports WhatsApp, Instagram, and Facebook Messenger - all from the same backend. Whether your customers reach you on WhatsApp, Instagram DM, or Facebook Messenger, they get the same seamless AI-powered experience. All conversations appear in one unified dashboard.',
      sort_order: 4,
      hidden: false,
      source: 'manual',
    },
    {
      tenant_id: tenantId,
      question: 'How does the AI chatbot work?',
      answer: 'Raven\'s AI uses GPT-4 to understand customer messages and respond intelligently. It can handle 13 different intents including greetings, menu browsing, price inquiries, order placement, booking requests, and policy questions. The AI can detect when it can\'t answer and automatically escalate to a human agent with full context. You can customize the AI\'s tone and personality to match your brand.',
      sort_order: 5,
      hidden: false,
      source: 'manual',
    },
    {
      tenant_id: tenantId,
      question: 'Can I take orders through WhatsApp?',
      answer: 'Yes! Raven has a complete ordering system. Customers can browse your menu, ask about prices, place orders, and make payments - all through WhatsApp. The AI guides them through the entire process, creates orders in your dashboard, and sends payment links via Paystack. You can manage order statuses (pending, confirmed, ready, delivered) and customers get automatic notifications.',
      sort_order: 6,
      hidden: false,
      source: 'manual',
    },
    {
      tenant_id: tenantId,
      question: 'How do I set up WhatsApp integration?',
      answer: 'After signing up, you\'ll need a Meta Business Account with WhatsApp Business API enabled. In the onboarding wizard, you\'ll enter your Meta App Secret, Webhook Verify Token, Access Token, and Phone Number ID. Raven provides the webhook URL to register in Meta Developer Console. Once configured, your WhatsApp number will be connected and the AI can start responding to messages.',
      sort_order: 7,
      hidden: false,
      source: 'manual',
    },
    {
      tenant_id: tenantId,
      question: 'What payment methods do you support?',
      answer: 'Raven integrates with Paystack for payment processing. Customers can pay using cards, bank transfer, USSD, and mobile money. When a customer places an order, Raven generates a secure Paystack payment link and sends it via WhatsApp. Once payment is confirmed, the order status automatically updates. We also support Flutterwave for additional payment options.',
      sort_order: 8,
      hidden: false,
      source: 'manual',
    },
    {
      tenant_id: tenantId,
      question: 'Can I manage bookings and reservations?',
      answer: 'Yes! Raven includes a booking system for hotels, restaurants, and service businesses. You can define room types or appointment slots with pricing and availability. Customers can check availability and make bookings through WhatsApp. The AI handles date selection, availability checks, and payment processing automatically.',
      sort_order: 9,
      hidden: false,
      source: 'manual',
    },
    {
      tenant_id: tenantId,
      question: 'What is the dashboard and what can I do with it?',
      answer: 'The Raven dashboard at https://app.raven-ai.online is your command center. From there you can: view all conversations and respond manually, manage orders and bookings, configure your menu/catalog, manage customer contacts, send broadcast messages, view analytics and reports, add staff members, and configure your business branding and WhatsApp settings. Everything is accessible from a clean, modern interface.',
      sort_order: 10,
      hidden: false,
      source: 'manual',
    },
    {
      tenant_id: tenantId,
      question: 'How do I add staff members?',
      answer: 'In the dashboard, go to Settings and click on Staff. You can add team members with different roles: Owner (full access), Admin (management access), and Staff (limited to assigned branches). Staff can log in to the dashboard to handle conversations, manage orders, and perform their assigned tasks. You can also restrict staff to specific branch locations.',
      sort_order: 11,
      hidden: false,
      source: 'manual',
    },
    {
      tenant_id: tenantId,
      question: 'What happens when the AI can\'t answer a question?',
      answer: 'When the AI encounters a question it can\'t handle, it automatically escalates the conversation to a human agent. The AI provides a context summary of the conversation so far, so your staff can pick up seamlessly. Escalated conversations are flagged in the dashboard for priority attention. This ensures customers always get the help they need.',
      sort_order: 12,
      hidden: false,
      source: 'manual',
    },
    {
      tenant_id: tenantId,
      question: 'Can I customize the AI\'s responses?',
      answer: 'Yes! You can configure the AI\'s personality and tone (professional, friendly, or casual) in Settings. You can also add custom FAQs that the AI will use to answer specific questions about your business. For Enterprise plans, we offer custom AI training where the AI learns your specific menu, policies, and brand voice.',
      sort_order: 13,
      hidden: false,
      source: 'manual',
    },
    {
      tenant_id: tenantId,
      question: 'Is my data secure?',
      answer: 'Absolutely. Raven uses industry-standard security practices including encrypted connections, secure password hashing, and GDPR-compliant data handling. You maintain full control of your customer data, and we offer data deletion requests for compliance. Your tenant data is completely isolated from other businesses on the platform.',
      sort_order: 14,
      hidden: false,
      source: 'manual',
    },
    {
      tenant_id: tenantId,
      question: 'What kind of support do you offer?',
      answer: 'Support varies by plan. Starter includes email support with 48-hour response time. Growth includes priority email support with 24-hour response. Enterprise includes dedicated phone and email support with 4-hour response, plus a dedicated account manager. All customers have access to our documentation and help resources.',
      sort_order: 15,
      hidden: false,
      source: 'manual',
    },
    {
      tenant_id: tenantId,
      question: 'Can I use Raven if I have multiple business locations?',
      answer: 'Yes! Growth and Enterprise plans support multiple branch locations. You can manage all your locations from one dashboard, with staff assigned to specific branches. The AI can handle location-specific inquiries and route conversations to the right team. Enterprise plans support unlimited locations.',
      sort_order: 16,
      hidden: false,
      source: 'manual',
    },
    {
      tenant_id: tenantId,
      question: 'How does conversation counting work?',
      answer: 'Each conversation is counted when a customer sends a message and the AI responds. A single customer thread (back-and-forth messages) counts as one conversation. You can track your usage in the dashboard. If you exceed your plan limit, overage charges apply based on your tier. You\'ll receive alerts as you approach your limit.',
      sort_order: 17,
      hidden: false,
      source: 'manual',
    },
    {
      tenant_id: tenantId,
      question: 'Can I cancel my subscription anytime?',
      answer: 'Yes, you can cancel your subscription anytime from the dashboard. There are no long-term contracts - you pay month-to-month. Upon cancellation, your data will be retained for 30 days for reactivation, then permanently deleted per GDPR regulations. You can export your conversation history anytime before cancellation.',
      sort_order: 18,
      hidden: false,
      source: 'manual',
    },
    {
      tenant_id: tenantId,
      question: 'Do I need technical skills to use Raven?',
      answer: 'No technical skills required. Raven is designed to be user-friendly with a guided onboarding wizard. Setting up WhatsApp integration takes about 5 minutes. Adding menu items, FAQs, and managing orders is all done through an intuitive dashboard. If you need help, our documentation and support team are available.',
      sort_order: 19,
      hidden: false,
      source: 'manual',
    },
    {
      tenant_id: tenantId,
      question: 'What is white-label branding?',
      answer: 'White-label branding (Enterprise plan) allows you to customize the platform with your own brand. You can use your own domain, logo, colors, and company name. Your customers will see your brand, not Raven\'s. This is perfect for agencies and resellers who want to offer WhatsApp automation under their own brand.',
      sort_order: 20,
      hidden: false,
      source: 'manual',
    },
    {
      tenant_id: tenantId,
      question: 'How do I get started with a free trial?',
      answer: 'Raven offers a 2-week free trial with no credit card required. Simply sign up at https://app.raven-ai.online/register, select your preferred plan, and you\'ll have full access to all features. At the end of the trial, you can choose to subscribe or cancel. No commitment required.',
      sort_order: 21,
      hidden: false,
      source: 'manual',
    },
    {
      tenant_id: tenantId,
      question: 'Can I import my existing customer data?',
      answer: 'Yes, you can import customer contacts into Raven. Use the dashboard to add customers manually or import via CSV. The AI will have access to customer history and can provide personalized responses. This helps maintain continuity if you\'re migrating from another system.',
      sort_order: 22,
      hidden: false,
      source: 'manual',
    },
    {
      tenant_id: tenantId,
      question: 'What analytics and reports are available?',
      answer: 'Raven provides comprehensive analytics including conversation volume, peak hours, customer intent breakdown, order conversion rates, and payment success rates. Growth and Enterprise plans include advanced analytics with custom reports and data export. You can use these insights to optimize your customer service and marketing.',
      sort_order: 23,
      hidden: false,
      source: 'manual',
    },
    {
      tenant_id: tenantId,
      question: 'How does broadcast messaging work?',
      answer: 'Broadcast messaging lets you send one message to multiple customers at once - perfect for promotions, announcements, or updates. You can segment your audience by various criteria and schedule broadcasts for optimal timing. This feature helps you engage customers proactively rather than just responding to incoming messages.',
      sort_order: 24,
      hidden: false,
      source: 'manual',
    },
    {
      tenant_id: tenantId,
      question: 'Is there a mobile app?',
      answer: 'Yes! Raven includes a mobile app for Android (iOS coming soon) built with Expo React Native. Staff can manage conversations, view orders, and receive push notifications on the go. The app works offline and syncs when reconnected, making it perfect for businesses with mobile staff.',
      sort_order: 25,
      hidden: false,
      source: 'manual',
    },
  ]

  await prisma.tenantFaq.createMany({
    data: faqs,
    skipDuplicates: true,
  })

  console.log(`✅ Created ${faqs.length} Raven project FAQs`)
  console.log('🎉 Project FAQs seeding complete!')
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
