# GitHub Copilot Instructions — Raven Enterprise Platform

These instructions apply to every AI-assisted change in this repository.

## CRITICAL DEPLOYMENT LAWS - MUST BE OBEYED WITH UTMOST SEVERITY

FAILURE TO OBEY THESE LAWS MEANS FATAL TERMINATION OF THE ENTIRE PROJECT

LAW 1: The server is a shared server. You MUST NOT reconfigure port 3000. This port is likely used by other applications on the shared server.

LAW 2: Lock all activities to STRICTLY raven-ai.online. It is FORBIDDEN to access, manage, or attempt to interfere with any other domain residing on the server.

LAW 3: Apache and localhost configuration must be EXPLICITLY on the raven-ai.online cPanel only and NOT on the root. Do not modify root-level Apache configurations.

LAW 4: All operations must remain in the raven-ai.online cPanel and subdomains. There are other applications running on the same server in several other domains that have live users and must NOT be disturbed.

These laws apply to ALL server interactions, deployments, configurations, and modifications.

## Delivery Standard

- Complete requested work end to end whenever feasible: implement the actual change, cover loading or empty or error states, wire required validations, and update closely related docs or tests when the task needs them.
- Before changing a feature, map the full flow that will be affected: entry point, user path, admin or operator path, backend side effects, success state, failure state, permission boundaries, and post-action feedback.
- For any UI work in `dashboard/`, `admin-console/`, or `mobile/`, load and follow `.github/skills/premium-ui/SKILL.md`.
- UI must ship at production SaaS quality. Do not leave placeholders, mock-only behavior, `console.log`, TODO stubs, or half-finished interaction states.
- Do not invent features beyond the request, redesign the architecture, or introduce new services, databases, or third-party platforms.

## Architecture

- Preserve the existing service split: `backend/` for the NestJS API and worker, `dashboard/` for the tenant web app, `admin-console/` for the staff control plane, `mobile/` for React Native, and `scripts/` for deployment automation.
- Reuse existing backend module boundaries under `backend/libs/*`; prefer explicit logic over clever abstraction and do not merge modules.
- Application data belongs in PostgreSQL via Prisma. Do not rely on nginx cache, in-memory state, or local files as a system of record.
- Canonical architecture references:
  - `docs/developer-handbook.md`
  - `docs/system-overview.md`
  - `docs/api-contracts.md`
  - `docs/dashboard-api.contract.md`

## Build And Test

- Backend commands from `backend/`:
  - `npm run build:all`
  - `npm run start:dev`
  - `npm run start:worker:dev`
  - `npm run test`
- Dashboard commands from `dashboard/`:
  - `npm run dev` on port `4011`
  - `npm run build`
  - `npm run lint`
- Admin console commands from `admin-console/`:
  - `npm run dev` on port `4012`
  - `npm run build`
  - `npm run lint`
- Root batch helpers exist for local startup: `start-all.bat`, `start-backend.bat`, and `start.bat`.
- If documentation conflicts with implementation, trust `package.json`, `scripts/deploy-to-prod.ps1`, `backend/prisma/schema.prisma`, and the current shared components over older README text.

## Critical Conventions

- Port `3000` is forbidden. Raven uses `4010` for the backend API, `4011` for the dashboard, and `4012` for the admin console.
- Never add request timeouts, `AbortController` timeout wrappers, or `timeoutMs`-style options to frontend API clients.
- Read `backend/prisma/schema.prisma` before writing any Prisma query. Prisma client properties are camelCase versions of model names.
- On Windows, backend schema changes or `npm install` can remove the Prisma junction. Recreate it when needed with `cmd /c mklink /J "node_modules\@prisma\client\.prisma" "node_modules\.prisma"`, then restart the TypeScript server.
- The only allowed deployment path is `./scripts/deploy-to-prod.ps1`. If deployment fails, fix the script or its prerequisites rather than inventing an alternate process.
- Before any backend deploy, verify schema and enum names, run `prisma generate`, check PM2 logs, and test the changed endpoint. See `docs/deployment-checklist.md`.

## UI And UX

- `.github/skills/premium-ui/SKILL.md` is the mandatory implementation standard for all UI surfaces in this repo.
- Baseline expectations for every implemented flow: stateful async buttons, shimmer-first loading, sophisticated CTA treatment, responsive layout behavior, and dark-mode-safe surfaces where the app already supports them.
- Reuse the established surface patterns instead of inventing a parallel design language:
  - `admin-console/components/Button.tsx`
  - `admin-console/app/globals.css`
  - `dashboard/app/globals.css`
  - `mobile/src/components/ui.tsx`
  - `mobile/src/constants/theme.ts`
- Simulate the complete user experience before shipping. Each flow should account for onboarding or entry, primary action, secondary escape path, confirmation, retry or recovery, and post-success feedback at a global-standard quality bar.

## Operations References

- Deployment and recovery:
  - `scripts/deploy-to-prod.ps1`
  - `docs/deployment-checklist.md`
  - `docs/support-runbook.md`
  - `docs/rollback-hotfix.md`
- Governance and readiness:
  - `docs/platform-readiness.md`
  - `docs/IMPLEMENTATION-STATUS.md`
  - `docs/governance-rulebook.md`