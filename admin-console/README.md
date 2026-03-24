# Raven Admin Console

Enterprise Admin Control Plane for Raven Platform.

## Features

- ✅ Admin authentication with JWT
- ✅ System overview dashboard with KPIs
- ✅ Tenant management (create, view, suspend/activate)
- ✅ Subscription & plan management
- ✅ Billing & revenue tracking
- ✅ Operations monitoring (messaging, AI, queues)
- ✅ Cross-tenant orders & bookings view
- ✅ System health monitoring
- ✅ Admin user management
- ✅ System settings

## Getting Started

### Installation

```bash
npm install
```

### Environment Setup

Copy `.env.example` to `.env` and configure:

```env
NEXT_PUBLIC_API_URL=http://localhost:4010
```

### Development

```bash
npm run dev
```

Or use the batch file:

```bash
start.bat
```

The admin console runs on `http://localhost:3001`

### Build

```bash
npm run build
npm start
```

## Tech Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **React 18**

## Project Structure

```
admin-console/
├── app/
│   ├── admin/
│   │   ├── login/          # Admin login
│   │   ├── page.tsx        # Overview dashboard
│   │   ├── tenants/        # Tenant management
│   │   ├── subscriptions/  # Subscriptions
│   │   ├── plans/          # Plans
│   │   ├── billing/        # Billing & revenue
│   │   ├── ops/            # Operations monitoring
│   │   ├── orders/         # Orders
│   │   ├── bookings/       # Bookings
│   │   ├── system/         # System health
│   │   ├── users/          # Admin users
│   │   └── settings/       # Settings
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── AdminSidebar.tsx
│   ├── AdminHeader.tsx
│   ├── AdminLoginForm.tsx
│   ├── StatCard.tsx
│   ├── HealthBadge.tsx
│   ├── StatusBadge.tsx
│   ├── ConfirmModal.tsx
│   ├── LoadingSkeleton.tsx
│   ├── Spinner.tsx
│   ├── Toast.tsx
│   └── EmptyState.tsx
├── lib/
│   ├── api.ts              # API client
│   ├── auth.ts             # Auth utilities
│   └── constants.ts        # Constants
├── middleware.ts           # Auth middleware
└── package.json
```

## API Integration

All admin pages connect to backend APIs under `/admin/*`:

- `POST /admin/auth/login` - Admin login
- `GET /admin/auth/me` - Get current admin
- `GET /admin/revenue/summary` - Revenue KPIs
- `GET /admin/system/health` - System health
- `GET /admin/ops/messaging/stats` - Messaging stats
- `GET /admin/ops/ai/health` - AI health
- `GET /admin/ops/queues/health` - Queue health
- `GET /admin/tenants` - List tenants
- `POST /admin/tenants` - Create tenant
- `GET /admin/tenants/:id` - Tenant details
- `PATCH /admin/tenants/:id/status` - Update tenant status
- `GET /admin/subscriptions` - List subscriptions
- `GET /admin/plans` - List plans
- `GET /admin/orders` - List orders
- `GET /admin/bookings` - List bookings

## Features

### Authentication
- Secure admin login with JWT
- Middleware protection for all admin routes
- Automatic redirect on unauthorized access

### Dashboard
- Real-time system KPIs (MRR, ARR, revenue)
- System health status
- Component health indicators
- Messaging statistics

### Tenant Management
- Create new tenants
- View tenant details with tabs (overview, subscription, usage, branding)
- Suspend/activate tenants with confirmation
- Status badges and visual feedback

### Subscriptions
- View all subscriptions across tenants
- Filter by status (all, active, trial, cancelled)
- Usage meters with progress bars
- Billing cycle information

### Billing
- Revenue summary with growth trends
- Payments table (ready for integration)
- MRR/ARR tracking

### Operations
- Messaging service monitoring
- AI engine health
- Queue system status
- Color-coded health indicators

### System Health
- Component-wise health monitoring
- Real-time status updates (auto-refresh every 30s)
- Uptime tracking
- Resource usage metrics

## UX Components

- **StatCard**: Display KPIs with trends
- **HealthBadge**: Color-coded status indicators
- **StatusBadge**: Subscription/tenant status
- **ConfirmModal**: Confirmation dialogs for actions
- **LoadingSkeleton**: Loading states
- **Spinner**: Loading spinner
- **Toast**: Notification system
- **EmptyState**: Empty state displays

## Security

- JWT-based authentication
- Protected routes via middleware
- Token stored in localStorage
- Automatic logout on 401/403

## Production Ready

✅ No mock data  
✅ No placeholders  
✅ All states handled (loading, error, empty)  
✅ Real API integration  
✅ Premium UI/UX  
✅ Fully typed with TypeScript  
✅ Responsive design  

## License

Proprietary - Raven Enterprise Platform
