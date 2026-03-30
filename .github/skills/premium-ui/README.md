# Premium UI Skill

**Royal-grade global standard premium UI/UX standards for the Raven Enterprise Platform across dashboard, admin-console, and mobile**

## What This Skill Does

Enforces production-grade SaaS platform UI/UX standards matching the visual quality of Stripe, Linear, and Vercel while staying faithful to the repo's existing web and mobile design language.

## When to Use

Type `/premium-ui` in chat when:
- Creating new pages or components
- Reviewing existing UI for production readiness
- Converting drafts/mockups to production code
- Before deploying any UI changes to production
- Need to validate component against quality standards
- Polishing responsive layouts or dark mode
- Reviewing accessibility on web or mobile
- Porting mobile brand language into web surfaces

## What It Enforces

### The Three Pillars (MANDATORY)

1. **Stateful Buttons** — Every async button must show spinner and disable on click
2. **Visual Sophistication** — Every CTA must be a card with icon, labels, and badge button (never bare links)
3. **Shimmer-First Loading** — Pages render shell immediately, data shimmers while loading (never full-page loaders)

## Example Usage

```
User: /premium-ui Review dashboard/app/tenants/page.tsx

Agent: I'll review this page against royal-grade UI standards...
[Checks all three pillars, identifies violations, provides specific fixes]

User: /premium-ui Create new users management page

Agent: I'll create a production-grade users page with stateful buttons, 
sophisticated CTAs, and shimmer-first loading...
[Follows complete workflow, generates compliant code]

User: /premium-ui Review mobile/src/screens/BroadcastScreen.tsx

Agent: I'll review this screen for theme-token usage, touch targets, loading states,
safe-area structure, and premium mobile interaction polish...

User: /premium-ui Make admin-console/app/admin/api-keys/page.tsx feel more premium without breaking the existing admin style

Agent: I'll keep the admin-console visual language, retain lucide-react and shared Button usage,
and tighten CTA hierarchy, shimmer quality, spacing, and feedback states...
```

## Files in This Skill

- **SKILL.md** — Main workflow and standards documentation
- **quick-checklist.md** — 30-second validation gate check
- **patterns.md** — Copy-paste ready code snippets
- **examples.md** — Before/after transformation examples
- **repo-design-language.md** — Real UI patterns already in the repo
- **mobile-patterns.md** — Mobile color, spacing, and component concepts
- **accessibility-checklist.md** — Web/mobile accessibility review sheet
- **responsive-patterns.md** — Responsive and cross-device layout rules
- **scripts/validate-premium-ui.ps1** — Heuristic anti-pattern validator
- **README.md** — This file

## Quality Gates

This skill enforces ZERO tolerance for:
- ❌ Plain buttons on async actions
- ❌ Bare text links for CTAs
- ❌ Full-page loading conditionals
- ❌ console.log statements
- ❌ TODO comments
- ❌ Missing dark mode
- ❌ Placeholder text in production
- ❌ Inconsistent icon systems on the same surface
- ❌ Mobile screens ignoring safe areas or touch target sizing

## Expected Outcomes

After using this skill, components will:
- ✅ Show professional loading states
- ✅ Look like Stripe/Linear/Vercel quality
- ✅ Render instantly with shimmer placeholders
- ✅ Be fully production-ready
- ✅ Pass all visual sophistication standards
- ✅ Reuse actual repo tokens and visual patterns instead of inventing new ones

## Validator Script

Run the heuristic validator when you want a fast scan before review:

```powershell
pwsh ./.github/skills/premium-ui/scripts/validate-premium-ui.ps1 -Path dashboard/app
pwsh ./.github/skills/premium-ui/scripts/validate-premium-ui.ps1 -Path mobile/src
```

## Skill Invocation

The agent will automatically load this skill when you mention:
- "premium UI"
- "royal-grade UI"
- "sophisticated UI"
- "production-ready UI"
- "review UI for quality"
- "create component with loading states"
- "global standard UI/UX"
- "mobile UI polish"
- "accessibility review"
- "responsive polish"
- "design tokens"

Or invoke manually: `/premium-ui [component name or "review [file]"]`