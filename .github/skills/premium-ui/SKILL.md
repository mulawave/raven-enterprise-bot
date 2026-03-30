---
name: premium-ui
description: 'Create, upgrade, or review premium UI/UX for dashboard, admin-console, and mobile. Use when: sophisticated SaaS UI, global-standard UI/UX, royal-grade design, stateful buttons, shimmer loading, CTA cards, responsive polish, accessibility review, dark mode refinement, mobile design tokens, React Native surfaces, Stripe/Linear/Vercel-level finish.'
argument-hint: 'component name or "review [file]"'
---

# Premium UI/UX — Royal-Grade Standards

This skill enforces **production-grade SaaS platform** UI/UX standards across dashboard, admin-console, and mobile. Think: Stripe, Linear, Vercel — clean, purposeful, every element earns its place.

## When to Use

- Creating new pages or components
- Reviewing existing UI for production readiness
- Converting drafts/mockups to production-quality code
- Ensuring compliance with visual sophistication standards
- Before any UI deployment to production

## Surface Selection

Choose the implementation path before writing code:

1. **`admin-console/**`**
  - Use `lucide-react` for icons
  - Use the shared web `<Button isLoading loadingText>` component
  - Prefer rounded white/slate cards with subtle borders and `shadow-sm`
  - Use the canonical shimmer recipe from `admin-console/app/globals.css`

2. **`dashboard/**`**
  - Preserve existing Tailwind utility style and dark-mode adaptation
  - Reuse rounded icon chips and CTA pills already present in the app
  - Prefer inline SVGs or the icon approach already used on the page
  - Match the existing accent families: indigo, emerald, sky, violet, amber, orange

3. **`mobile/**`**
  - Use tokens from `mobile/src/constants/theme.ts`
  - Prefer shared components from `mobile/src/components/ui.tsx`
  - Use `Ionicons`, safe-area aware headers, and 44-56px touch targets
  - Render shell-first with `ShimmerRow`, `Card`, and `RefreshControl` instead of blocking the screen

## Repo Design Language

This skill is repo-aware. Do not invent a parallel design system when the codebase already defines one.

- `dashboard/app/globals.css` defines sky-primary CSS variables and a dark-mode adaptation layer for existing light-themed components.
- `admin-console/app/globals.css` defines the repo's strongest shimmer and motion utilities, including `animate-shimmer`, `animate-slide-in-right`, and `animate-shake`.
- `mobile/src/constants/theme.ts` provides the clearest brand tokens: navy (`#173a6c`, `#1e4d8c`) and orange (`#f5c16c`, `#f49617`) plus surface, border, spacing, radius, and typography scales.
- `mobile/src/components/ui.tsx` already codifies `Button`, `Card`, `StatCard`, `Badge`, `SectionHeader`, `EmptyState`, `ShimmerRow`, and `RefreshableScrollView`.

## The Three Pillars (MANDATORY)

Every UI implementation MUST satisfy all three:

### 1. STATEFUL BUTTONS — No Double Submissions

**Rule**: The moment a button is clicked, it must be disabled immediately and show a spinner.

Surface-specific application:
- Web/admin: use the shared `<Button>` component instead of raw `<button>` for async actions.
- Mobile: use the shared `Button` in `mobile/src/components/ui.tsx` or match its disabled/loading behavior exactly.

```tsx
// ✅ Correct
const [isSaving, setIsSaving] = useState(false)

async function handleSave() {
  setIsSaving(true)
  try {
    await api.patch('/endpoint', data)
  } finally {
    setIsSaving(false)
  }
}

<Button 
  isLoading={isSaving} 
  loadingText="Saving…" 
  onClick={handleSave}
>
  Save
</Button>

// ❌ Wrong — allows double-submission
<button onClick={handleSave}>Save</button>
```

**Checklist**:
- [ ] Button uses shared `<Button>` component from `components/Button.tsx`
- [ ] Boolean state guards the async operation (`isLoading`, `isSaving`, `isDeleting`)
- [ ] Button receives `isLoading={state}`
- [ ] Button receives descriptive `loadingText="Action…"` (e.g. "Saving…", "Creating…", "Deleting…", "Sending…")
- [ ] Button is disabled while loading (`disabled` attribute enforced automatically)
- [ ] State reset in `finally` block to ensure cleanup on error

### 2. VISUAL SOPHISTICATION — Never Bare Links

**Rule**: Every CTA, navigation element, or back button must be a sophisticated card/pill with icon, not plain text.

```tsx
// ✅ Correct — CTA card with icon container, labels, badge button
<div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
  <div className="flex items-center gap-3">
    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 ring-1 ring-emerald-400/30">
      <CheckIcon className="h-4 w-4 text-emerald-400" />
    </div>
    <div>
      <p className="text-xs font-semibold text-white">Action Title</p>
      <p className="text-xs text-slate-400">Brief description of action</p>
    </div>
  </div>
  <Link 
    href="/destination"
    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-400/40 hover:bg-emerald-500/30"
  >
    Continue <ChevronRightIcon className="h-3 w-3" />
  </Link>
</div>

// ❌ Wrong — bare text link
<p>Don't have an account? <Link href="/register">Start here</Link></p>
```

**Anatomy of a Premium CTA Card**:
1. **Container**: `rounded-2xl border border-white/10 bg-white/5 px-5 py-4`
2. **Icon box**: `h-9 w-9 rounded-xl bg-{color}-500/15 ring-1 ring-{color}-400/30`
3. **Icon**: 4x4 size, matching color theme
4. **Primary label**: `text-xs font-semibold text-white`
5. **Secondary label**: `text-xs text-slate-400`
6. **Badge button**: `rounded-lg bg-{color}-500/20 px-3 py-1.5 ring-1 ring-{color}-400/40`
7. **Hover state**: `hover:bg-{color}-500/30`

**Glow Effects** (use sparingly):
- Background orbs: `opacity-8` or lower
- Card border glow: `opacity-20 blur-lg` max
- **NEVER** `opacity-50` or `blur-xl` — looks amateurish

**Checklist**:
- [ ] No bare text links for CTAs (sign up, sign in, navigate, back)
- [ ] Every CTA has an icon in a rounded container
- [ ] Icon container uses proper opacity pattern (`bg-{color}-500/15 ring-1 ring-{color}-400/30`)
- [ ] Supporting sub-label describes the action
- [ ] Button is a pill/badge with ring (`rounded-lg bg-{color}-500/20 ring-1 ring-{color}-400/40`)
- [ ] Icons are consistent (custom SVGs or lucide-react)
- [ ] Glow effects use low opacity (≤0.2)

### 3. SHIMMER-FIRST LOADING — Never Full-Page Skeletons

**Rule**: Render the full page shell immediately; replace data cells with shimmer placeholders while loading.

Mobile equivalent:
- Keep the header, safe-area shell, and section structure mounted.
- Swap content rows/cards for `ShimmerRow` or card-shaped placeholders.
- Preserve pull-to-refresh affordances while loading fresh data.

```tsx
// ✅ Correct — shell renders, data shimmers
return (
  <div>
    <h1>Tenants</h1>
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                <td><div className="h-4 w-32 bg-slate-200 rounded animate-shimmer" /></td>
                <td><div className="h-4 w-48 bg-slate-200 rounded animate-shimmer" /></td>
                <td><div className="h-4 w-20 bg-slate-200 rounded animate-shimmer" /></td>
              </tr>
            ))
          : tenants.map(tenant => <TenantRow key={tenant.id} tenant={tenant} />)
        }
      </tbody>
    </table>
  </div>
)

// ❌ Wrong — causes layout flash
if (isLoading) return <FullPageSkeleton />
return <PageContent />
```

**Shimmer Patterns**:
- Text: `h-4 w-{width} bg-slate-200 dark:bg-slate-700 rounded animate-shimmer`
- Avatar: `h-10 w-10 bg-slate-200 dark:bg-slate-700 rounded-full animate-shimmer`
- Card: `h-24 w-full bg-slate-200 dark:bg-slate-700 rounded-lg animate-shimmer`
- Button: `h-9 w-20 bg-slate-200 dark:bg-slate-700 rounded-md animate-shimmer`

**Checklist**:
- [ ] Page structure (header, nav, layout) renders immediately
- [ ] No conditional full-page return based on `isLoading`
- [ ] Table/list structure renders with shimmer rows while loading
- [ ] Shimmer count matches expected data length (or 3-5 for unknown)
- [ ] Shimmer widths vary realistically to mimic actual content
- [ ] Dark mode shimmer uses `dark:bg-slate-700`

## Creation Workflow

### Step 1: Plan Component Structure

Before writing code:
1. Identify all async actions (save, create, delete, fetch, send)
2. List all navigation CTAs (back, sign up, continue, etc.)
3. Determine what data loads initially vs. on interaction

### Step 2: Implement State Management

For each async action, create:
```tsx
const [isActionName, setIsActionName] = useState(false)

async function handleAction() {
  setIsActionName(true)
  try {
    await api.method(...)
    // Success handling
  } catch (error) {
    // Error handling
  } finally {
    setIsActionName(false)
  }
}
```

### Step 3: Build Visual Structure

Replace every plain link/button with sophisticated cards:
1. Start with card container (border, bg, padding)
2. Add icon box with appropriate color theme
3. Insert icon (4x4, matching theme)
4. Add primary and secondary labels
5. Create badge button with hover state
6. Add chevron or external icon if applicable

### Step 4: Implement Shimmer Loading

For data-loading pages:
1. Render full shell (header, table structure, layout)
2. Add conditional rendering: `isLoading ? shimmerArray : actualData`
3. Create shimmer array: `Array.from({ length: N }).map((_, i) => ...)`
4. Match shimmer widths to expected content

### Step 5: Validation Checklist

Before considering the component done:

**Stateful Buttons**:
- [ ] All async buttons use `<Button>` component
- [ ] All async buttons have `isLoading` state
- [ ] All async buttons have descriptive `loadingText`
- [ ] No bare `<button>` or `<a>` tags for async actions

**Visual Sophistication**:
- [ ] No bare text links for CTAs
- [ ] All CTAs have icon containers with proper opacity
- [ ] All CTAs have primary + secondary labels
- [ ] All CTAs use badge button styling with ring
- [ ] Glow effects use low opacity (≤0.2)
- [ ] Icons are consistent and from approved set

**Shimmer Loading**:
- [ ] No full-page conditional returns based on `isLoading`
- [ ] Page shell renders immediately
- [ ] Data cells show shimmer while loading
- [ ] Shimmer count and widths are realistic
- [ ] Dark mode shimmer styling present

**Production Quality**:
- [ ] No `console.log` statements
- [ ] No TODO comments
- [ ] No placeholder text ("Lorem ipsum", "Test", "Foo")
- [ ] All colors use theme variables or Tailwind classes
- [ ] Responsive breakpoints tested (sm, md, lg, xl)
- [ ] Dark mode tested and working
- [ ] Accessibility: proper ARIA labels, semantic HTML, keyboard navigation

## Review Workflow

When reviewing existing UI:

### 1. Scan for Violations

Run mental grep for anti-patterns:
- Plain `<button onClick={async}>` without loading state
- Bare `<Link>` or `<a>` tags for navigation CTAs
- `if (isLoading) return <Skeleton />`
- `console.log` statements
- TODO comments
- Placeholder text

### 2. Test Interactive States

Open the page and:
1. Click every button — does it show spinner and disable?
2. Reload the page — does shell render before data?
3. Check back/navigation CTAs — are they sophisticated cards?
4. Toggle dark mode — does everything look right?
5. Resize window — does it respond properly?

### 3. Code Quality Scan

Check for:
- Proper TypeScript types (no `any`)
- Error handling in all async functions
- Loading state cleanup in `finally` blocks
- Consistent naming conventions
- No duplicated code

### 4. Generate Improvement List

Create prioritized list:
1. **Critical**: Missing loading states, bare CTAs, full-page skeletons
2. **High**: Inconsistent styling, missing dark mode, accessibility issues
3. **Medium**: Code duplication, missing types, suboptimal patterns
4. **Low**: Minor styling tweaks, better naming, comments

### 5. Implement Fixes

Use multi-file editing to fix all violations in one pass:
- Convert all buttons to `<Button isLoading={...}>`
- Wrap all CTAs in sophisticated card structure
- Refactor all `if (isLoading) return` to shimmer-first
- Remove all console.log and TODOs
- Fix accessibility issues

## Templates

### Template: Sophisticated CTA Card

```tsx
<div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
  <div className="flex items-center gap-3">
    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 ring-1 ring-emerald-400/30">
      {/* Icon here */}
    </div>
    <div>
      <p className="text-xs font-semibold text-white">{title}</p>
      <p className="text-xs text-slate-400">{description}</p>
    </div>
  </div>
  <Link 
    href={href}
    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-400/40 hover:bg-emerald-500/30"
  >
    {buttonText} <ChevronRightIcon className="h-3 w-3" />
  </Link>
</div>
```

### Template: Stateful Button

```tsx
const [isSubmitting, setIsSubmitting] = useState(false)

async function handleSubmit() {
  setIsSubmitting(true)
  try {
    await api.post('/endpoint', data)
    toast.success('Saved!')
  } catch (error) {
    toast.error(error.message)
  } finally {
    setIsSubmitting(false)
  }
}

<Button 
  isLoading={isSubmitting} 
  loadingText="Submitting…"
  onClick={handleSubmit}
>
  Submit
</Button>
```

### Template: Shimmer-First Table

```tsx
<table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
  <thead>
    <tr>
      <th>Name</th>
      <th>Email</th>
      <th>Status</th>
    </tr>
  </thead>
  <tbody>
    {isLoading
      ? Array.from({ length: 5 }).map((_, i) => (
          <tr key={i}>
            <td><div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-shimmer" /></td>
            <td><div className="h-4 w-48 bg-slate-200 dark:bg-slate-700 rounded animate-shimmer" /></td>
            <td><div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded animate-shimmer" /></td>
          </tr>
        ))
      : items.map(item => (
          <tr key={item.id}>
            <td>{item.name}</td>
            <td>{item.email}</td>
            <td><StatusBadge status={item.status} /></td>
          </tr>
        ))
    }
  </tbody>
</table>
```

### Template: Back to Home Card

```tsx
<Link href="/" className="block">
  <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-5 py-4 transition-all hover:border-white/20 hover:bg-white/10">
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/15 ring-1 ring-sky-400/30">
        <HomeIcon className="h-4 w-4 text-sky-400" />
      </div>
      <div>
        <p className="text-xs font-semibold text-white">Back to Home</p>
        <p className="text-xs text-slate-400">Return to dashboard</p>
      </div>
    </div>
    <ChevronRightIcon className="h-4 w-4 text-slate-400" />
  </div>
</Link>
```

## Color Themes

Use these color combinations for different action types:

| Action Type | Color | Classes |
|-------------|-------|---------|
| Success/Continue | Emerald | `bg-emerald-500/15 ring-emerald-400/30 text-emerald-400` |
| Info/Navigate | Sky/Blue | `bg-sky-500/15 ring-sky-400/30 text-sky-400` |
| Warning/Caution | Amber | `bg-amber-500/15 ring-amber-400/30 text-amber-400` |
| Danger/Delete | Red | `bg-red-500/15 ring-red-400/30 text-red-400` |
| Neutral/Default | Slate | `bg-slate-500/15 ring-slate-400/30 text-slate-400` |
| Premium/Pro | Violet | `bg-violet-500/15 ring-violet-400/30 text-violet-400` |

## Raven Brand Palette

When the UI should feel more brand-owned than generic SaaS, especially on mobile, onboarding, hero sections, or premium upsell surfaces, prefer the Raven palette already defined in `mobile/src/constants/theme.ts`.

| Token | Hex | Primary Use |
|-------|-----|-------------|
| Navy Dark | `#173a6c` | headers, premium info surfaces, shadow tint |
| Navy Light | `#1e4d8c` | secondary brand accents, supportive highlights |
| Orange Warm | `#f5c16c` | halos, badges, warnings, supportive emphasis |
| Orange Bold | `#f49617` | primary CTA, active progress, premium highlight |

## Icon Systems

- `admin-console/**`: prefer `lucide-react`
- `mobile/**`: prefer `Ionicons`
- `dashboard/**`: preserve the page's existing icon approach, usually inline SVGs

Mixing icon systems on the same surface is a quality regression unless there is a clear reason.

## Anti-Patterns (NEVER DO THIS)

### ❌ Bare Text Link for CTA
```tsx
<p>Don't have an account? <Link href="/register">Sign up</Link></p>
```

### ❌ Button Without Loading State
```tsx
<button onClick={async () => await api.post(...)}>Save</button>
```

### ❌ Full-Page Loader Conditional
```tsx
if (isLoading) return <div>Loading...</div>
return <ActualPage />
```

### ❌ Plain Button Element for Async Action
```tsx
<button onClick={handleDelete}>Delete</button>
```

### ❌ Excessive Glow Effect
```tsx
className="shadow-emerald-500/50 blur-xl opacity-60"
```

### ❌ Missing Dark Mode
```tsx
<div className="bg-slate-200"> {/* no dark:bg-slate-700 */}
```

## Production Deployment Gate

Before deploying any UI to production, verify:

1. **Zero violations** of the three pillars
2. **All async actions** have loading states
3. **All CTAs** use sophisticated card pattern
4. **All data pages** use shimmer-first loading
5. **No console.log** or TODO comments
6. **Dark mode** fully functional
7. **Responsive** at all breakpoints (sm, md, lg, xl)
8. **Accessibility** meets WCAG 2.1 AA minimum
9. **TypeScript** no errors, no `any` types
10. **Visual consistency** across all pages

## Success Criteria

A UI component passes royal-grade standards when:

✅ Every async button shows a spinner and disables on click  
✅ Every CTA is a sophisticated card with icon, labels, and badge button  
✅ Every data page renders shell immediately with shimmer placeholders  
✅ Zero bare links for navigation actions  
✅ Zero full-page conditional returns based on loading state  
✅ Zero console.log statements or TODO comments  
✅ Dark mode works perfectly  
✅ Responsive at all screen sizes  
✅ Accessible to keyboard and screen reader users  
✅ Matches the visual quality of Stripe, Linear, or Vercel

When all criteria are met, the component is production-ready.

## Additional Resources

For rapid validation and reference:
- [Quick Validation Checklist](./quick-checklist.md) — 30-second gate check
- [Common Patterns](./patterns.md) — Copy-paste ready code snippets
- [Before/After Examples](./examples.md) — Real upgrade transformations
- [Repo Design Language](./repo-design-language.md) — real patterns already present in dashboard, admin-console, and mobile
- [Mobile Patterns](./mobile-patterns.md) — mobile-specific colors, surfaces, and interaction patterns
- [Accessibility Checklist](./accessibility-checklist.md) — web + mobile accessibility gates
- [Responsive Patterns](./responsive-patterns.md) — breakpoint and cross-device layout guidance
- [Validator Script](./scripts/validate-premium-ui.ps1) — heuristic anti-pattern scanner for quick review
