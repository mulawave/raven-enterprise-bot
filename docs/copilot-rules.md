GLOBAL COPILOT RULES (ALWAYS OBEY FOR THIS REPO)

Model behavior rules

- Do NOT redesign architecture
- Do NOT introduce new services or tools
- Do NOT change database decisions
- Do NOT merge modules
- Do NOT use Firebase / Supabase
- Do NOT invent features
- Prefer explicit logic over abstractions
- If unsure → STOP
- Production-grade only
- Follow instructions literally

UI / UX RULES (ALL PROJECTS)

SPINNER & STATEFUL BUTTON RULE — MANDATORY for ALL buttons across ALL projects:
- Every button that triggers an async action MUST become `disabled` immediately on click
- Every such button MUST display a spinning indicator while the action is in-flight
- The button MUST remain disabled until the async action fully resolves or rejects
- Use the shared `<Button isLoading={...}>` component (admin-console/components/Button.tsx)
- Never allow double-submission — guard with `isLoading` state
- Always show meaningful loading text: "Saving…", "Creating…", "Deleting…", etc.

SHIMMER-FIRST LOADING RULE — MANDATORY for ALL data-fetching pages:
- Pages MUST render their full shell (header, layout, table/card structure) immediately on mount
- NEVER use `if (isLoading) return <FullPageSkeleton />` — this causes layout flash
- Instead: render the page always; replace data cells with shimmer placeholders when `isLoading === true`
- Shimmer placeholders: `<div className="h-4 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 rounded animate-shimmer" />`
- This gives users instant visual response and communicates fast page performance

EXECUTION MODE RULES

- You MUST create or modify files in the repository
- Do NOT print code in chat unless explicitly asked
- If a file does not exist, create it at the specified path
- If a file exists, edit it in-place
- If no path is given, STOP and ask for the path
- After execution, list files created or modified
