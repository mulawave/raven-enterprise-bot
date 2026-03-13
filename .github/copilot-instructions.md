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
