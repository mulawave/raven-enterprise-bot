-- Seed test data for ordering & booking
INSERT INTO "Tenant" (id, name, created_at, updated_at) VALUES ('test-tenant-1', 'Test Restaurant & Hotel', NOW(), NOW());

INSERT INTO "Branch" (id, tenant_id, name, created_at, updated_at) VALUES ('branch-1', 'test-tenant-1', 'Main Branch', NOW(), NOW());

INSERT INTO "Customer" (id, tenant_id, name, email, phone, created_at, updated_at) VALUES ('customer-1', 'test-tenant-1', 'John Doe', 'john@test.com', '+1234567890', NOW(), NOW());

INSERT INTO "MenuCategory" (id, tenant_id, name, created_at) VALUES ('cat-1', 'test-tenant-1', 'Main Dishes', NOW());

INSERT INTO "MenuItem" (id, tenant_id, category_id, name, price_kobo, available, created_at, updated_at) VALUES 
  ('item-1', 'test-tenant-1', 'cat-1', 'Jollof Rice', 250000, true, NOW(), NOW()),
  ('item-2', 'test-tenant-1', 'cat-1', 'Fried Rice', 200000, true, NOW(), NOW());

INSERT INTO "RoomType" (id, tenant_id, name, price_kobo, created_at, updated_at) VALUES 
  ('room-1', 'test-tenant-1', 'Standard Room', 1500000, NOW(), NOW()),
  ('room-2', 'test-tenant-1', 'Deluxe Suite', 3000000, NOW(), NOW());
