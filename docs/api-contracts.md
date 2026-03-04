
# API Contracts (Frozen)

**Scope:** This document reflects only the handlers present in the repository. No routes or endpoints are defined in code (no decorators or router bindings found), so the path + HTTP method mapping is **not specified** here. This is a strict freeze of handler behavior and data shapes as implemented.

## Global Requirements

- **Auth:** Admin handlers assume an authenticated `req.user` and access `req.user.tenant_id`.
- **Tenant scoping:** Admin handlers always query by `tenant_id` taken from `req.user.tenant_id`.
- **Routing:** No routing or controller metadata exists in this repo. Paths and methods are undefined.

---

## Admin Handlers

### AnalyticsController.summary

- **Handler:** `summary(req, res)`
- **Auth:** Required (uses `req.user`)
- **Tenant:** Required (uses `req.user.tenant_id`)
- **Request:**
	- Params: none
	- Query: none
	- Body: none
- **Response (200 JSON):**
	```json
	{
		"orders": 0,
		"bookings": 0,
		"customers": 0
	}
	```

---

### OrdersController.list

- **Handler:** `list(req, res)`
- **Auth:** Required (uses `req.user`)
- **Tenant:** Required (uses `req.user.tenant_id`)
- **Request:**
	- Params: none
	- Query: none
	- Body: none
- **Response (200 JSON array):**
	```json
	[
		{
			"id": "string",
			"tenant_id": "string",
			"customer_id": "string",
			"total_kobo": 0,
			"status": "pending|paid|cancelled|completed",
			"created_at": "string",
			"updated_at": "string",
			"orderItems": [
				{
					"id": "string",
					"tenant_id": "string",
					"order_id": "string",
					"menu_item_id": "string",
					"quantity": 0,
					"price_kobo": 0,
					"created_at": "string",
					"updated_at": "string"
				}
			]
		}
	]
	```

---

### OrdersController.get

- **Handler:** `get(req, res)`
- **Auth:** Required (uses `req.user`)
- **Tenant:** Required (uses `req.user.tenant_id`)
- **Request:**
	- Params: `{ id: string }`
	- Query: none
	- Body: none
- **Response (200 JSON or null):**
	```json
	{
		"id": "string",
		"tenant_id": "string",
		"customer_id": "string",
		"total_kobo": 0,
		"status": "pending|paid|cancelled|completed",
		"created_at": "string",
		"updated_at": "string",
		"orderItems": [
			{
				"id": "string",
				"tenant_id": "string",
				"order_id": "string",
				"menu_item_id": "string",
				"quantity": 0,
				"price_kobo": 0,
				"created_at": "string",
				"updated_at": "string"
			}
		]
	}
	```

---

### BookingsController.list

- **Handler:** `list(req, res)`
- **Auth:** Required (uses `req.user`)
- **Tenant:** Required (uses `req.user.tenant_id`)
- **Request:**
	- Params: none
	- Query: none
	- Body: none
- **Response (200 JSON array):**
	```json
	[
		{
			"id": "string",
			"tenant_id": "string",
			"customer_id": "string",
			"room_type_id": "string",
			"start_date": "string",
			"end_date": "string",
			"total_kobo": 0,
			"status": "pending|confirmed|cancelled|completed",
			"created_at": "string",
			"updated_at": "string"
		}
	]
	```

---

### BookingsController.get

- **Handler:** `get(req, res)`
- **Auth:** Required (uses `req.user`)
- **Tenant:** Required (uses `req.user.tenant_id`)
- **Request:**
	- Params: `{ id: string }`
	- Query: none
	- Body: none
- **Response (200 JSON or null):**
	```json
	{
		"id": "string",
		"tenant_id": "string",
		"customer_id": "string",
		"room_type_id": "string",
		"start_date": "string",
		"end_date": "string",
		"total_kobo": 0,
		"status": "pending|confirmed|cancelled|completed",
		"created_at": "string",
		"updated_at": "string"
	}
	```

---

### CustomersController.list

- **Handler:** `list(req, res)`
- **Auth:** Required (uses `req.user`)
- **Tenant:** Required (uses `req.user.tenant_id`)
- **Request:**
	- Params: none
	- Query: none
	- Body: none
- **Response (200 JSON array):**
	```json
	[
		{
			"id": "string",
			"tenant_id": "string",
			"name": "string",
			"email": "string|null",
			"phone": "string|null",
			"created_at": "string",
			"updated_at": "string"
		}
	]
	```

---

### CustomersController.get

- **Handler:** `get(req, res)`
- **Auth:** Required (uses `req.user`)
- **Tenant:** Required (uses `req.user.tenant_id`)
- **Request:**
	- Params: `{ id: string }`
	- Query: none
	- Body: none
- **Response (200 JSON or null):**
	```json
	{
		"id": "string",
		"tenant_id": "string",
		"name": "string",
		"email": "string|null",
		"phone": "string|null",
		"created_at": "string",
		"updated_at": "string"
	}
	```

---

### BroadcastController.send

- **Handler:** `send(req, res)`
- **Auth:** Required (uses `req.user`)
- **Tenant:** Required (uses `req.user.tenant_id`)
- **Request:**
	- Params: none
	- Query: none
	- Body:
		```json
		{
			"message": "string"
		}
		```
- **Response (200 JSON):**
	```json
	{
		"sent": 0
	}
	```

---

## Messaging Handlers

### WebhookController.verify

- **Handler:** `verify(req, res)`
- **Auth:** Not specified in code
- **Tenant:** Not specified in code
- **Request:**
	- Query:
		- `hub.mode`: string
		- `hub.verify_token`: string
		- `hub.challenge`: string
- **Behavior:**
	- If `hub.mode === "subscribe"` and `hub.verify_token === process.env.WHATSAPP_VERIFY_TOKEN`, responds `200` with `hub.challenge`.
	- Otherwise responds `403`.
- **Response:**
	- `200`: plain text challenge
	- `403`: empty

---

### WebhookController.receive

- **Handler:** `receive(req, res)`
- **Auth:** Not specified in code
- **Tenant:** Not specified in code
- **Request:**
	- Body: Any (not parsed or validated)
- **Response:**
	- `200`: empty

