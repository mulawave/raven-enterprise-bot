# GitHub Copilot Instructions — Raven Enterprise Platform

These rules apply to **every** AI-assisted edit in this repository.

---

## Architecture rules

- Do NOT redesign the architecture
- Do NOT introduce new services, databases, or third-party tools
- Do NOT merge modules
- Do NOT use Firebase / Supabase / PlanetScale or similar managed backends
- Do NOT invent features that were not asked for
- Prefer explicit logic over clever abstractions
- Production-grade code only — no `console.log` left behind, no TODO stubs

---

## UI / UX rules (apply to ALL pages and components)

### SPINNER & STATEFUL BUTTON — mandatory for every async button

- The moment a button is clicked: **disable it immediately** (`disabled` attribute — not just visually)
- Show a **spinning indicator** while the action is in-flight
- Keep the button disabled until the promise fully resolves or rejects
- Use the shared `<Button isLoading={...} loadingText="...">` component from
  `admin-console/components/Button.tsx`
- Never allow double-submission — guard with a boolean `isLoading` / `isSaving` / `isDeleting` state
- Use descriptive loading text: `"Saving…"`, `"Creating…"`, `"Deleting…"`, `"Sending…"`, etc.

```tsx
// ✅ Correct
const [isSaving, setIsSaving] = useState(false)
async function handleSave() {
  setIsSaving(true)
  try { await api.patch(...) } finally { setIsSaving(false) }
}
<Button isLoading={isSaving} loadingText="Saving…" onClick={handleSave}>Save</Button>

// ❌ Wrong
<button onClick={handleSave}>Save</button>
```

### VISUAL SOPHISTICATION — mandatory for all UI (dashboard + admin-console)

This is a **production-grade SaaS platform**. Every piece of UI must reflect that.

- **Never** use bare text links for navigation CTAs. Wrap them in a proper bordered card/pill with an icon.
- **Every CTA** (sign up, sign in, back, etc.) must have:
  - An icon in a rounded icon container (`rounded-xl bg-color/15 ring-1 ring-color/30`)
  - A supporting sub-label line describing the action
  - A pill/badge button (`rounded-lg bg-color/20 ring-1 ring-color/40`) — never a plain `<a>` or bare `Link`
- **Back to home / Back buttons** must look like full-width bordered cards with a home icon in a small icon box — not plain text links
- **Glow effects**: use `opacity-8` or lower for background orbs; card border glow `opacity-20 blur-lg` max. Never `opacity-50` or `blur-xl` on the glow border — it looks amateurish.
- **Every icon** used must be from a consistent set (custom inline SVGs matching the existing pattern, or lucide-react for admin-console).
- Think: Stripe, Linear, Vercel — clean, purposeful, every element earns its place.

```tsx
// ✅ Correct — CTA card with icon, label, badge button
<div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
  <div className="flex items-center gap-3">
    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 ring-1 ring-emerald-400/30">
      <SomeIcon className="h-4 w-4 text-emerald-400" />
    </div>
    <div>
      <p className="text-xs font-semibold text-white">Action title</p>
      <p className="text-xs text-slate-400">Supporting description</p>
    </div>
  </div>
  <Link href="..." className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-400/40 hover:bg-emerald-500/30">
    CTA label <ChevronRightIcon />
  </Link>
</div>

// ❌ Wrong — bare text link
<p>Don't have an account? <Link href="/register">Start here</Link></p>
```

---

### SHIMMER-FIRST LOADING — mandatory for all data-fetching pages

- Pages **MUST render their full shell** (header, layout, table/card structure) immediately on mount
- **NEVER** use `if (isLoading) return <FullPageSkeleton />` — this causes a layout flash and looks broken
- Instead: always render the page; replace data cells with shimmer placeholders when `isLoading === true`

```tsx
// ✅ Correct
return (
  <div>
    <h1>Tenants</h1>
    <table>
      {isLoading
        ? Array.from({ length: 5 }).map((_, i) => (
            <tr key={i}><td><div className="h-4 bg-slate-200 rounded animate-shimmer" /></td></tr>
          ))
        : rows.map(row => <TenantRow key={row.id} row={row} />)
      }
    </table>
  </div>
)

// ❌ Wrong
if (isLoading) return <LoadingSkeleton />
return <PageContent />
```

---

## Execution rules

- You MUST create or modify files — never just print code in chat
- If a file does not exist, create it at the specified path
- If no path was given, ask before proceeding
- After every change, list all files created or modified

---

## ⚠️ DEPLOYMENT RULES — ABSOLUTE, NON-NEGOTIABLE

### ONE deploy script. No exceptions.

The **only permitted way** to deploy any part of this application is:

```powershell
# Deploy everything
.\scripts\deploy-to-prod.ps1

# Deploy one service only
.\scripts\deploy-to-prod.ps1 -Service api    # backend only
.\scripts\deploy-to-prod.ps1 -Service dash   # dashboard only
.\scripts\deploy-to-prod.ps1 -Service admin  # admin-console only

# Deploy + create a new stable snapshot
.\scripts\deploy-to-prod.ps1 -Snapshot
```

### What this script does (in order)
1. Verifies SSH connectivity to `raven-user`
2. Runs `npm run build` (or `build:all` for backend) for the targeted service(s)
3. Packages and SCPs the built artifacts to the server
4. Extracts on the server, runs `prisma migrate deploy` + `prisma generate` (backend only), restarts PM2
5. Clears the nginx cache via `raven-server` SSH
6. Runs smoke tests against `https://api.raven-ai.online`, `https://app.raven-ai.online`, `https://admin.raven-ai.online`
7. Optionally creates a dated snapshot under `~/snapshots/` on the server

### NEVER do any of the following
- **NEVER** manually `scp` archive files to the server in an ad-hoc way
- **NEVER** SSH in and run `tar`, `mv`, `pm2 restart` commands manually
- **NEVER** invent a new deploy method (`tar --format=pax`, chunked uploads, rsync, etc.)
- **NEVER** create temporary archives like `backend-dist2.tar.gz`, `dashboard-dist4.tar.gz`, etc.
- **NEVER** `pm2 restart` individual processes by id (`pm2 restart 0 1 2`) — use PM2 names
- **NEVER** run `npm run build` in a terminal and then try to manually ship the output

If the deploy script fails, **diagnose why the script failed** and fix it — do not work around it with a different approach. The script is the single source of truth for deployment.

### Script location
`scripts/deploy-to-prod.ps1` — in the repo root. Do not move, rename, or duplicate it.

---

## ⚠️ CRITICAL INFRASTRUCTURE RULES — NEVER VIOLATE THESE

### PORT RULES — ABSOLUTE PROHIBITION

- **Port 3000 is FORBIDDEN.** Other Node.js applications on a separate cPanel on the same server use port 3000 via Apache. Touching it will break unrelated live production apps.
- **Raven ONLY uses ports 4000 and above.** Never bind, redirect, kill, or reference port 3000 for any Raven process.
- **NEVER run any script, command, installation, or update outside the Raven cPanel user.**

| Service         | Port |
|-----------------|------|
| Backend API     | 4010 |
| Tenant Dashboard| 4011 |
| Admin Console   | 4012 |

### TIMEOUT RULES — NO REQUEST TIMEOUTS ANYWHERE

- **NEVER add request timeouts** to any API client in this application — not in admin-console, not in dashboard, not anywhere.
- Do NOT use `AbortController` with `setTimeout` to abort fetch requests.
- Do NOT add a `timeoutMs` parameter or any equivalent to fetch/axios calls.
- **Reason:** The user base is predominantly in Nigeria with slow 2G/3G networks. Any timeout causes legitimate slow requests to fail with false errors, breaking the user experience entirely.
- `admin-console/lib/api.ts` — must have **NO timeout** (enforced).
- `dashboard/lib/api.ts` — must have **NO timeout** (enforced).

---

## ⚠️ VALIDATION BEFORE DEPLOYMENT — MANDATORY

### Every implementation MUST be validated before deploying

Before running the deploy script for any backend change:

1. **Verify all Prisma model names** used in the controller match the exact `model` names in `backend/prisma/schema.prisma`. Prisma generates camelCase client properties from PascalCase model names (e.g. `TenantKyc` → `this.prisma.tenantKyc`). Using a property that doesn't exist causes a silent `undefined` at runtime and a 500 error.
2. **Read the actual schema** (`backend/prisma/schema.prisma`) before writing any Prisma query — do not guess field names or model names.
3. **Check all field names** used in `createMany`/`create` calls against the schema. Supplying an unknown field throws at runtime.
4. **Verify enum values** used in `where` filters match those declared in the schema (e.g. `UserScope`, `UserRole`).
5. **Check the PM2 logs** on the server after every deploy to confirm the new process started without errors before reporting success:
   ```powershell
   ssh raven-user "pm2 logs raven-api --lines 20 --nostream 2>&1 | grep -v IMPORTANT | tail -30"
   ```
6. **Test the specific endpoint** that was changed — do not assume a clean startup means the feature works.

Failure to validate before giving the user a green light is a critical error.
