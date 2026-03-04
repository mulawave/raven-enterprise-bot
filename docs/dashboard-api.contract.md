# Dashboard API Contract v1.0

**Status:** Production Ready  
**Last Updated:** January 31, 2026  
**Base URL:** `http://localhost:4000/api` (development) | `https://api.yourdomain.com/api` (production)

---

## Table of Contents

1. [API Conventions](#api-conventions)
2. [Authentication](#authentication)
3. [Error Handling](#error-handling)
4. [Health & Monitoring](#health--monitoring)
5. [Ordering APIs](#ordering-apis)
6. [Booking APIs](#booking-apis)
7. [Payment APIs](#payment-apis)
8. [Messaging APIs](#messaging-apis)
9. [Response Schemas](#response-schemas)

---

## API Conventions

### Base URL
```
http://localhost:4000/api
```

### Headers (Future - Auth Not Yet Implemented)
```http
Authorization: Bearer <token>
Content-Type: application/json
```

### Standard Error Format
All errors follow this structure:
```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Order with ID order_123 not found"
  }
}
```

### Common HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (future - when auth is enabled)
- `404` - Not Found
- `500` - Internal Server Error

### Query Parameter Conventions
- **tenantId** - Required for all multi-tenant operations (current: `test-tenant-1`)
- **branchId** - Required for branch-scoped operations (current: `branch-1`)
- Dates use ISO 8601 format: `2026-02-01T14:00:00Z`

---

## Authentication

**Current Status:** ⚠️ Not implemented (Phase 1-6 complete, auth planned for later)

**Future Implementation:**
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**For Now:** All endpoints are open. Use query parameters for tenant/branch isolation.

---

## Error Handling

### Common Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `VALIDATION_ERROR` | Invalid request parameters | 400 |
| `RESOURCE_NOT_FOUND` | Entity doesn't exist | 404 |
| `UNAUTHORIZED` | Invalid or missing token | 401 |
| `FORBIDDEN` | Insufficient permissions | 403 |
| `PAYMENT_FAILED` | Payment processing error | 400 |
| `CONFLICT` | Resource conflict (e.g., double booking) | 409 |
| `INTERNAL_ERROR` | Server error | 500 |

### Error Response Example
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Field 'email' is required"
  }
}
```

---

## Health & Monitoring

### Health Check (Liveness)

**Endpoint:** `GET /api/health`

**Description:** Basic liveness check - returns 200 if API is running.

**Response:**
```json
{
  "status": "ok"
}
```

**Status Code:** `200 OK`

---

### Readiness Check (Database + Redis)

**Endpoint:** `GET /api/ready`

**Description:** Comprehensive health check with subsystem status and latency.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-01-31T12:34:56.789Z",
  "checks": {
    "database": {
      "status": "up",
      "latencyMs": 5
    },
    "redis": {
      "status": "up",
      "latencyMs": 2
    }
  }
}
```

**Status Codes:**
- `200` - All systems healthy
- `503` - One or more subsystems down

**Use Case:** Kubernetes readiness probes, load balancer health checks

---

## Ordering APIs

### 1. List Menu Categories

**Endpoint:** `GET /api/ordering/menu/categories`

**Query Parameters:**
| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| tenantId | Yes | string | Tenant identifier |

**Example Request:**
```http
GET /api/ordering/menu/categories?tenantId=test-tenant-1
```

**Response:**
```json
[
  {
    "id": "cat_1",
    "tenant_id": "test-tenant-1",
    "name": "Main Dishes",
    "created_at": "2026-01-31T10:00:00.000Z"
  },
  {
    "id": "cat_2",
    "tenant_id": "test-tenant-1",
    "name": "Beverages",
    "created_at": "2026-01-31T10:05:00.000Z"
  }
]
```

**Status Code:** `200 OK`

---

### 2. List Menu Items

**Endpoint:** `GET /api/ordering/menu/items`

**Query Parameters:**
| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| tenantId | Yes | string | Tenant identifier |
| categoryId | No | string | Filter by category |

**Example Request:**
```http
GET /api/ordering/menu/items?tenantId=test-tenant-1&categoryId=cat_1
```

**Response:**
```json
[
  {
    "id": "item_1",
    "tenant_id": "test-tenant-1",
    "category_id": "cat_1",
    "name": "Jollof Rice",
    "description": "Nigerian spiced rice",
    "price_kobo": 250000,
    "available": true,
    "created_at": "2026-01-31T10:10:00.000Z",
    "updated_at": "2026-01-31T10:10:00.000Z"
  }
]
```

**Price Format:** All prices in kobo (1 NGN = 100 kobo) or cents for other currencies

**Status Code:** `200 OK`

---

### 3. Create Order

**Endpoint:** `POST /api/ordering/orders`

**Request Body:**
```json
{
  "cart": {
    "tenantId": "test-tenant-1",
    "customerId": "customer_1",
    "items": [
      {
        "itemId": "item_1",
        "quantity": 2
      },
      {
        "itemId": "item_2",
        "quantity": 1
      }
    ]
  },
  "branchId": "branch_1"
}
```

**Response:**
```json
{
  "order": {
    "id": "order_abc123",
    "tenant_id": "test-tenant-1",
    "branch_id": "branch_1",
    "customer_id": "customer_1",
    "total_kobo": 700000,
    "status": "pending",
    "created_at": "2026-01-31T12:00:00.000Z",
    "updated_at": "2026-01-31T12:00:00.000Z"
  },
  "items": [
    {
      "id": "orderitem_1",
      "order_id": "order_abc123",
      "menu_item_id": "item_1",
      "quantity": 2,
      "price_kobo": 250000
    },
    {
      "id": "orderitem_2",
      "order_id": "order_abc123",
      "menu_item_id": "item_2",
      "quantity": 1,
      "price_kobo": 200000
    }
  ]
}
```

**Status Code:** `201 Created`

**Validation:**
- All menu items must exist
- Quantities must be > 0
- Customer must exist

**Business Logic:**
- Prices are fetched from menu items (not user-provided)
- Total is calculated server-side
- Audit log created automatically

---

### 4. List Orders

**Endpoint:** `GET /api/ordering/orders`

**Query Parameters:**
| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| tenantId | Yes | string | Tenant identifier |
| branchId | Yes | string | Branch identifier |

**Example Request:**
```http
GET /api/ordering/orders?tenantId=test-tenant-1&branchId=branch_1
```

**Response:**
```json
[
  {
    "id": "order_abc123",
    "tenant_id": "test-tenant-1",
    "branch_id": "branch_1",
    "customer_id": "customer_1",
    "total_kobo": 700000,
    "status": "confirmed",
    "created_at": "2026-01-31T12:00:00.000Z",
    "updated_at": "2026-01-31T12:05:00.000Z",
    "customer": {
      "id": "customer_1",
      "name": "John Doe",
      "phone": "+2348012345678"
    }
  }
]
```

**Status Codes:**
- `200 OK` - Success (empty array if no orders)

**Order Status Values:**
- `pending` - Order created, awaiting payment
- `confirmed` - Payment received
- `preparing` - Kitchen preparing
- `ready` - Ready for pickup/delivery
- `completed` - Order fulfilled
- `cancelled` - Order cancelled

---

### 5. Get Order by ID

**Endpoint:** `GET /api/ordering/orders/:id`

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Order ID |

**Query Parameters:**
| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| tenantId | Yes | string | Tenant identifier |
| branchId | Yes | string | Branch identifier |

**Example Request:**
```http
GET /api/ordering/orders/order_abc123?tenantId=test-tenant-1&branchId=branch_1
```

**Response:**
```json
{
  "id": "order_abc123",
  "tenant_id": "test-tenant-1",
  "branch_id": "branch_1",
  "customer_id": "customer_1",
  "total_kobo": 700000,
  "status": "confirmed",
  "created_at": "2026-01-31T12:00:00.000Z",
  "updated_at": "2026-01-31T12:05:00.000Z",
  "customer": {
    "id": "customer_1",
    "name": "John Doe",
    "phone": "+2348012345678",
    "email": "john@example.com"
  },
  "items": [
    {
      "id": "orderitem_1",
      "menu_item_id": "item_1",
      "quantity": 2,
      "price_kobo": 250000,
      "menuItem": {
        "name": "Jollof Rice"
      }
    }
  ]
}
```

**Status Codes:**
- `200 OK` - Order found
- `404 Not Found` - Order doesn't exist

---

## Booking APIs

### 1. List Room Types

**Endpoint:** `GET /api/bookings/room-types`

**Query Parameters:**
| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| tenantId | Yes | string | Tenant identifier |

**Example Request:**
```http
GET /api/bookings/room-types?tenantId=test-tenant-1
```

**Response:**
```json
[
  {
    "id": "room_1",
    "tenant_id": "test-tenant-1",
    "name": "Deluxe Suite",
    "price_kobo": 1500000,
    "created_at": "2026-01-30T08:00:00.000Z",
    "updated_at": "2026-01-30T08:00:00.000Z"
  }
]
```

**Status Code:** `200 OK`

---

### 2. Check Availability

**Endpoint:** `GET /api/bookings/availability`

**Query Parameters:**
| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| tenantId | Yes | string | Tenant identifier |
| roomTypeId | Yes | string | Room type to check |
| start | Yes | ISO 8601 | Check-in date/time |
| end | Yes | ISO 8601 | Check-out date/time |

**Example Request:**
```http
GET /api/bookings/availability?tenantId=test-tenant-1&roomTypeId=room_1&start=2026-02-01T14:00:00Z&end=2026-02-03T12:00:00Z
```

**Response:**
```json
{
  "available": true
}
```

**Status Code:** `200 OK`

**Business Logic:**
- Checks for date range overlaps with existing bookings
- Returns `false` if any conflict found

---

### 3. Create Booking

**Endpoint:** `POST /api/bookings`

**Request Body:**
```json
{
  "tenantId": "test-tenant-1",
  "branchId": "branch_1",
  "customerId": "customer_1",
  "roomTypeId": "room_1",
  "start": "2026-02-01T14:00:00Z",
  "end": "2026-02-03T12:00:00Z",
  "totalKobo": 3000000
}
```

**Response:**
```json
{
  "id": "booking_xyz789",
  "tenant_id": "test-tenant-1",
  "branch_id": "branch_1",
  "customer_id": "customer_1",
  "room_type_id": "room_1",
  "start_date": "2026-02-01T14:00:00.000Z",
  "end_date": "2026-02-03T12:00:00.000Z",
  "total_kobo": 3000000,
  "status": "pending",
  "created_at": "2026-01-31T12:30:00.000Z",
  "updated_at": "2026-01-31T12:30:00.000Z"
}
```

**Status Codes:**
- `201 Created` - Booking created successfully
- `409 Conflict` - Date range conflicts with existing booking
- `400 Bad Request` - Invalid dates (end before start)

**Booking Status Values:**
- `pending` - Booking created, awaiting payment
- `confirmed` - Payment received
- `checked_in` - Guest checked in
- `checked_out` - Guest checked out
- `cancelled` - Booking cancelled

---

### 4. List Bookings

**Endpoint:** `GET /api/bookings`

**Query Parameters:**
| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| tenantId | Yes | string | Tenant identifier |
| branchId | Yes | string | Branch identifier |

**Example Request:**
```http
GET /api/bookings?tenantId=test-tenant-1&branchId=branch_1
```

**Response:**
```json
[
  {
    "id": "booking_xyz789",
    "tenant_id": "test-tenant-1",
    "branch_id": "branch_1",
    "customer_id": "customer_1",
    "room_type_id": "room_1",
    "start_date": "2026-02-01T14:00:00.000Z",
    "end_date": "2026-02-03T12:00:00.000Z",
    "total_kobo": 3000000,
    "status": "confirmed",
    "created_at": "2026-01-31T12:30:00.000Z",
    "updated_at": "2026-01-31T12:35:00.000Z",
    "customer": {
      "id": "customer_1",
      "name": "Jane Smith",
      "phone": "+2348087654321"
    },
    "roomType": {
      "id": "room_1",
      "name": "Deluxe Suite"
    }
  }
]
```

**Status Code:** `200 OK`

---

### 5. Get Booking by ID

**Endpoint:** `GET /api/bookings/:id`

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Booking ID |

**Query Parameters:**
| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| tenantId | Yes | string | Tenant identifier |
| branchId | Yes | string | Branch identifier |

**Example Request:**
```http
GET /api/bookings/booking_xyz789?tenantId=test-tenant-1&branchId=branch_1
```

**Response:**
```json
{
  "id": "booking_xyz789",
  "tenant_id": "test-tenant-1",
  "branch_id": "branch_1",
  "customer_id": "customer_1",
  "room_type_id": "room_1",
  "start_date": "2026-02-01T14:00:00.000Z",
  "end_date": "2026-02-03T12:00:00.000Z",
  "total_kobo": 3000000,
  "status": "confirmed",
  "created_at": "2026-01-31T12:30:00.000Z",
  "updated_at": "2026-01-31T12:35:00.000Z",
  "customer": {
    "id": "customer_1",
    "name": "Jane Smith",
    "phone": "+2348087654321",
    "email": "jane@example.com"
  },
  "roomType": {
    "id": "room_1",
    "name": "Deluxe Suite",
    "price_kobo": 1500000
  }
}
```

**Status Codes:**
- `200 OK` - Booking found
- `404 Not Found` - Booking doesn't exist

---

## Payment APIs

### 1. Initialize Payment

**Endpoint:** `POST /api/payments/initialize`

**Description:** Start payment flow with Paystack. Creates payment record and returns authorization URL for customer redirect.

**Request Body:**
```json
{
  "tenantId": "test-tenant-1",
  "amountKobo": 700000,
  "email": "customer@example.com",
  "provider": "paystack",
  "orderId": "order_abc123"
}
```

**Alternative (for bookings):**
```json
{
  "tenantId": "test-tenant-1",
  "amountKobo": 3000000,
  "email": "customer@example.com",
  "provider": "paystack",
  "bookingId": "booking_xyz789"
}
```

**Response:**
```json
{
  "payment": {
    "id": "payment_123",
    "reference": "pay_ref_abc123xyz",
    "status": "pending",
    "provider": "paystack",
    "amount_kobo": 700000,
    "created_at": "2026-01-31T13:00:00.000Z"
  },
  "authorizationUrl": "https://checkout.paystack.com/abc123xyz"
}
```

**Status Code:** `201 Created`

**Frontend Flow:**
1. Call this endpoint
2. Redirect user to `authorizationUrl`
3. Customer completes payment on Paystack
4. Paystack redirects back to your callback URL with `reference`
5. Call `/api/payments/verify` with reference

---

### 2. Verify Payment

**Endpoint:** `GET /api/payments/verify`

**Description:** Verify payment status after customer returns from Paystack.

**Query Parameters:**
| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| tenantId | Yes | string | Tenant identifier |
| reference | Yes | string | Payment reference from initialization |
| provider | Yes | string | Payment provider (currently: 'paystack') |

**Example Request:**
```http
GET /api/payments/verify?tenantId=test-tenant-1&reference=pay_ref_abc123xyz&provider=paystack
```

**Response (Success):**
```json
{
  "payment": {
    "id": "payment_123",
    "reference": "pay_ref_abc123xyz",
    "status": "paid",
    "provider": "paystack",
    "amount_kobo": 700000,
    "order_id": "order_abc123",
    "verified_at": "2026-01-31T13:05:00.000Z"
  },
  "verified": true
}
```

**Response (Failed):**
```json
{
  "payment": {
    "id": "payment_123",
    "reference": "pay_ref_abc123xyz",
    "status": "failed",
    "provider": "paystack",
    "amount_kobo": 700000
  },
  "verified": false,
  "reason": "Insufficient funds"
}
```

**Status Code:** `200 OK`

**Auto-Reconciliation:**
- If payment status is 'paid', linked order/booking status is automatically updated to 'confirmed'

---

### 3. Check Payment Status

**Endpoint:** `GET /api/payments/status`

**Description:** Check if an order or booking has been paid.

**Query Parameters:**
| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| tenantId | Yes | string | Tenant identifier |
| orderId | Conditional | string | Order ID (if checking order) |
| bookingId | Conditional | string | Booking ID (if checking booking) |

**Example Request (Order):**
```http
GET /api/payments/status?tenantId=test-tenant-1&orderId=order_abc123
```

**Example Request (Booking):**
```http
GET /api/payments/status?tenantId=test-tenant-1&bookingId=booking_xyz789
```

**Response:**
```json
{
  "isPaid": true
}
```

**Status Code:** `200 OK`

**Note:** One of `orderId` or `bookingId` must be provided.

---

### 4. Paystack Webhook (Internal)

**Endpoint:** `POST /api/payments/webhook/paystack`

**Description:** Receives payment status updates from Paystack. **Not for frontend use** - called by Paystack servers.

**Headers:**
```http
x-paystack-signature: <hmac_sha512_signature>
```

**Webhook Event Example:**
```json
{
  "event": "charge.success",
  "data": {
    "reference": "pay_ref_abc123xyz",
    "status": "success",
    "amount": 700000
  }
}
```

**Response:**
```json
{
  "status": "processed"
}
```

**Status Code:** `200 OK`

**Security:**
- Signature verified using HMAC SHA-512
- Invalid signatures return `{ "status": "ignored" }`

---

## Messaging APIs

**Note:** These endpoints are for **webhook intake only** (Meta platforms calling our backend). Not intended for frontend dashboard use.

### 1. Webhook Verification

**Endpoint:** `GET /api/messaging/webhook/verify`

**Description:** Meta webhook verification challenge (setup only).

**Query Parameters:**
| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| hub.mode | Yes | string | Should be 'subscribe' |
| hub.challenge | Yes | string | Challenge string from Meta |
| hub.verify_token | Yes | string | Your verification token |

**Response:** Returns challenge string (200 OK) if verification succeeds.

---

### 2. WhatsApp Message Webhook

**Endpoint:** `POST /api/messaging/webhook/whatsapp`

**Description:** Receives WhatsApp messages from Meta Business API.

**Headers:**
```http
x-hub-signature-256: sha256=<hmac_sha256_signature>
```

**Webhook Payload Example:**
```json
{
  "object": "whatsapp_business_account",
  "entry": [{
    "changes": [{
      "value": {
        "metadata": { "phone_number_id": "1234567890" },
        "messages": [{
          "from": "15559876543",
          "type": "text",
          "text": { "body": "I want to book a room" },
          "timestamp": "1706745600"
        }]
      }
    }]
  }]
}
```

**Response:** `200 OK` (empty)

**Auto-Processing:**
1. Signature verified
2. Customer auto-created if doesn't exist
3. Conversation auto-created if doesn't exist
4. Message persisted to database
5. AI job enqueued for processing

---

### 3. Instagram Message Webhook

**Endpoint:** `POST /api/messaging/webhook/instagram`

**Description:** Receives Instagram Direct messages.

**Headers:**
```http
x-hub-signature-256: sha256=<hmac_sha256_signature>
```

**Response:** `200 OK` (empty)

---

### 4. Facebook Message Webhook

**Endpoint:** `POST /api/messaging/webhook/facebook`

**Description:** Receives Facebook Messenger messages.

**Headers:**
```http
x-hub-signature-256: sha256=<hmac_sha256_signature>
```

**Response:** `200 OK` (empty)

---

## Future Dashboard APIs (Not Yet Implemented)

These endpoints are planned but not yet available:

### Conversations List (Planned)
```http
GET /api/messaging/conversations?tenantId={id}&branchId={id}
```

**Expected Response:**
```json
{
  "data": [
    {
      "id": "conv_123",
      "customer": {
        "id": "customer_1",
        "name": "John Doe",
        "phone": "+2348012345678"
      },
      "last_message": {
        "content": "Thank you!",
        "sender_type": "customer",
        "created_at": "2026-01-31T14:00:00.000Z"
      },
      "unread_count": 2,
      "updated_at": "2026-01-31T14:00:00.000Z"
    }
  ],
  "meta": {
    "total": 45,
    "page": 1,
    "perPage": 20
  }
}
```

### Conversation Messages (Planned)
```http
GET /api/messaging/conversations/:id/messages
```

**Expected Response:**
```json
{
  "data": [
    {
      "id": "msg_1",
      "conversation_id": "conv_123",
      "sender_type": "customer",
      "content": "Hello, I want to order food",
      "created_at": "2026-01-31T13:00:00.000Z"
    },
    {
      "id": "msg_2",
      "conversation_id": "conv_123",
      "sender_type": "bot",
      "content": "Sure! Here's our menu...",
      "created_at": "2026-01-31T13:00:05.000Z"
    }
  ]
}
```

---

## Response Schemas

### MenuCategory
```typescript
{
  id: string
  tenant_id: string
  name: string
  created_at: string (ISO 8601)
}
```

### MenuItem
```typescript
{
  id: string
  tenant_id: string
  category_id: string
  name: string
  description: string | null
  price_kobo: number
  available: boolean
  created_at: string (ISO 8601)
  updated_at: string (ISO 8601)
}
```

### Order
```typescript
{
  id: string
  tenant_id: string
  branch_id: string
  customer_id: string
  total_kobo: number
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled'
  created_at: string (ISO 8601)
  updated_at: string (ISO 8601)
  customer?: Customer  // Included when expanded
  items?: OrderItem[]  // Included when expanded
}
```

### OrderItem
```typescript
{
  id: string
  order_id: string
  menu_item_id: string
  quantity: number
  price_kobo: number
  menuItem?: MenuItem  // Included when expanded
}
```

### RoomType
```typescript
{
  id: string
  tenant_id: string
  name: string
  price_kobo: number
  created_at: string (ISO 8601)
  updated_at: string (ISO 8601)
}
```

### Booking
```typescript
{
  id: string
  tenant_id: string
  branch_id: string
  customer_id: string
  room_type_id: string
  start_date: string (ISO 8601)
  end_date: string (ISO 8601)
  total_kobo: number
  status: 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled'
  created_at: string (ISO 8601)
  updated_at: string (ISO 8601)
  customer?: Customer  // Included when expanded
  roomType?: RoomType  // Included when expanded
}
```

### Payment
```typescript
{
  id: string
  tenant_id: string
  reference: string
  provider: 'paystack'
  amount_kobo: number
  status: 'pending' | 'paid' | 'failed' | 'refunded'
  order_id?: string
  booking_id?: string
  created_at: string (ISO 8601)
  verified_at?: string (ISO 8601)
}
```

### Customer
```typescript
{
  id: string
  tenant_id: string
  name: string
  phone: string
  email?: string
  created_at: string (ISO 8601)
}
```

---

## Testing & Development

### Local Development Setup
```bash
# Start infrastructure
cd docker && docker-compose up -d postgres redis

# Run migrations
cd backend && npx prisma migrate dev

# Seed test data
psql -U app_user -d app_db -f seed-test.sql

# Start API
npm run start:dev
```

### Test Data Available
- Tenant ID: `test-tenant-1`
- Branch ID: `branch-1`
- Customer ID: `customer-1`
- Menu items with real prices
- Room type available for booking

### Testing Tools
- **HTTP Client:** `api-tests.http` (VS Code REST Client)
- **Database Queries:** `test-payment-flow.sql`, `test-messaging-flow.sql`, `test-worker-flow.sql`

---

## Changelog

### v1.0 (January 31, 2026)
- Initial API contract based on Phases 1-6 implementation
- 20 endpoints documented (Health, Ordering, Booking, Payments, Messaging)
- Production-ready backend with all endpoints operational
- Auth planned but not yet implemented

---

## Support & Documentation

- **Technical Report:** `PROJECT-COMPLETE-REPORT.md`
- **Phase Documentation:** `PHASE-3-COMPLETE.md` through `PHASE-6-COMPLETE.md`
- **API Tests:** `api-tests.http`
- **Database Schema:** `prisma/schema.prisma`
