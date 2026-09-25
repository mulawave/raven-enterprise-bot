---
name: "Backend Prisma And Deploy Guardrails"
description: "Use when editing backend NestJS modules, Prisma schema, repositories, services, controllers, migrations, or deployment logic. Covers schema-first Prisma work, Windows Prisma junction recovery, backend module boundaries, and deployment validation."
applyTo: "backend/**/*.ts, backend/prisma/**"
---
# Backend Prisma And Deploy Guardrails

## CRITICAL DEPLOYMENT LAWS - MUST BE OBEYED WITH UTMOST SEVERITY

FAILURE TO OBEY THESE LAWS MEANS FATAL TERMINATION OF THE ENTIRE PROJECT

LAW 1: The server is a shared server. You MUST NOT reconfigure port 3000. This port is likely used by other applications on the shared server.

LAW 2: Lock all activities to STRICTLY raven-ai.online. It is FORBIDDEN to access, manage, or attempt to interfere with any other domain residing on the server.

LAW 3: Apache and localhost configuration must be EXPLICITLY on the raven-ai.online cPanel only and NOT on the root. Do not modify root-level Apache configurations.

LAW 4: All operations must remain in the raven-ai.online cPanel and subdomains. There are other applications running on the same server in several other domains that have live users and must NOT be disturbed.

- Read [backend/prisma/schema.prisma](../../backend/prisma/schema.prisma) before writing any Prisma query or mutation. Do not guess model names, field names, relations, or enums.
- Use generated Prisma client names in camelCase and fix generation issues at the source. Do not hide missing types with `(this.prisma as any)`.
- If backend Prisma types break on Windows after a schema change or `npm install`, recreate the junction with `cmd /c mklink /J "node_modules\@prisma\client\.prisma" "node_modules\.prisma"`, then restart the TypeScript server.
- Preserve domain boundaries under [backend/libs](../../backend/libs). Extend the existing module that owns the behavior instead of merging modules or inventing new services.
- Use [scripts/deploy-to-prod.ps1](../../scripts/deploy-to-prod.ps1) as the only deployment path. Do not introduce manual `scp`, ad hoc archives, or numeric `pm2 restart` workflows.
- When backend behavior changes, trace the API entry point, service logic, worker or queue side effects, tenant scoping, permissions, audit impact, and success or failure states before editing.
- Before marking backend work done, run the smallest relevant validation available such as `npm run build:all`, `npm run test`, or targeted endpoint checks, and use [docs/deployment-checklist.md](../../docs/deployment-checklist.md) for production validation expectations.
