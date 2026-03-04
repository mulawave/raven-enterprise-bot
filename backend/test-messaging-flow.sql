-- Verify messaging flow: webhooks → customers → conversations → messages

-- Check auto-created customers from webhook
SELECT 
  id,
  tenant_id,
  name,
  phone,
  created_at
FROM "Customer"
WHERE phone LIKE '1555%'
ORDER BY created_at DESC
LIMIT 5;

-- Check auto-created conversations
SELECT 
  c.id,
  c.tenant_id,
  c.customer_id,
  cust.phone as customer_phone,
  c.updated_at,
  COUNT(m.id) as message_count
FROM "Conversation" c
JOIN "Customer" cust ON c.customer_id = cust.id
LEFT JOIN "Message" m ON c.id = m.conversation_id
GROUP BY c.id, c.tenant_id, c.customer_id, cust.phone, c.updated_at
ORDER BY c.updated_at DESC
LIMIT 10;

-- Check persisted messages
SELECT 
  m.id,
  m.tenant_id,
  m.conversation_id,
  m.sender_type,
  c.phone as customer_phone,
  m.content,
  m.created_at
FROM "Message" m
JOIN "Conversation" conv ON m.conversation_id = conv.id
JOIN "Customer" c ON conv.customer_id = c.id
ORDER BY m.created_at DESC
LIMIT 20;

-- Verify message timeline for specific customer
-- Replace 'CUSTOMER_PHONE' with actual phone number
SELECT 
  m.created_at,
  m.sender_type,
  m.content
FROM "Message" m
JOIN "Conversation" conv ON m.conversation_id = conv.id
JOIN "Customer" c ON conv.customer_id = c.id
WHERE c.phone = '15559876543' -- example phone from test webhook
ORDER BY m.created_at ASC;
