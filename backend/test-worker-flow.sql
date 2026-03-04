-- Check AI job processing results

-- 1. View customer messages (inbound)
SELECT 
  m.id,
  m.conversation_id,
  m.sender_type,
  c.phone as customer_phone,
  m.content,
  m.created_at
FROM "Message" m
JOIN "Conversation" conv ON m.conversation_id = conv.id
JOIN "Customer" c ON conv.customer_id = c.id
WHERE m.sender_type = 'customer'
ORDER BY m.created_at DESC
LIMIT 10;

-- 2. View bot responses (outbound - if implemented)
SELECT 
  m.id,
  m.conversation_id,
  m.sender_type,
  m.content,
  m.created_at
FROM "Message" m
WHERE m.sender_type = 'bot'
ORDER BY m.created_at DESC
LIMIT 10;

-- 3. View full conversation timeline
SELECT 
  m.created_at,
  m.sender_type,
  m.content,
  c.phone as customer_phone
FROM "Message" m
JOIN "Conversation" conv ON m.conversation_id = conv.id
JOIN "Customer" c ON conv.customer_id = c.id
WHERE conv.id = 'CONVERSATION_ID_HERE' -- Replace with actual ID
ORDER BY m.created_at ASC;

-- 4. Check AI audit logs
SELECT 
  action,
  entity_id as conversation_id,
  tenant_id,
  timestamp
FROM "AuditLog"
WHERE action = 'AI_INTENT'
ORDER BY timestamp DESC
LIMIT 20;

-- 5. Count messages by sender type
SELECT 
  sender_type,
  COUNT(*) as message_count
FROM "Message"
GROUP BY sender_type;
