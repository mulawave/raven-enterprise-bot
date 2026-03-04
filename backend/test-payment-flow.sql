-- Test end-to-end payment flow
-- 1. Create an order
-- 2. Initialize payment for it
-- 3. Simulate webhook callback
-- 4. Verify order status updated to 'confirmed'

-- Expected flow:
-- Order (pending) -> Payment (pending) -> Webhook -> Payment (paid) + Order (confirmed)

-- Query to verify payment linking:
SELECT 
  o.id as order_id,
  o.status as order_status,
  o.total_kobo as order_amount,
  p.id as payment_id,
  p.status as payment_status,
  p.reference,
  p.provider
FROM "Order" o
LEFT JOIN "Payment" p ON p.order_id = o.id
WHERE o.tenant_id = 'test-tenant-1'
ORDER BY o.created_at DESC
LIMIT 5;

-- Query to verify booking payments:
SELECT 
  b.id as booking_id,
  b.status as booking_status,
  b.total_kobo as booking_amount,
  b.start_date,
  b.end_date,
  p.id as payment_id,
  p.status as payment_status,
  p.reference,
  p.provider
FROM "Booking" b
LEFT JOIN "Payment" p ON p.booking_id = b.id
WHERE b.tenant_id = 'test-tenant-1'
ORDER BY b.created_at DESC
LIMIT 5;
