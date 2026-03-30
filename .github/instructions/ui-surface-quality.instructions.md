---
name: "UI Surface Quality"
description: "Use when implementing dashboard, admin-console, or mobile UI. Covers premium SaaS UI quality, shimmer-first loading, stateful buttons, CTA polish, responsive behavior, and complete user flow planning."
applyTo: "dashboard/**/*.{ts,tsx,css}, admin-console/**/*.{ts,tsx,css}, mobile/**/*.{ts,tsx,js,jsx}"
---
# UI Surface Quality

- Load and follow [premium UI skill](../skills/premium-ui/SKILL.md) for all work in dashboard, admin-console, and mobile.
- Deliver complete sequences, not isolated screens: entry or onboarding, primary action, secondary escape path, loading, empty, error, retry, confirmation, and post-success feedback.
- Reuse the existing surface patterns in [admin-console/components/Button.tsx](../../admin-console/components/Button.tsx), [admin-console/app/globals.css](../../admin-console/app/globals.css), [dashboard/app/globals.css](../../dashboard/app/globals.css), [mobile/src/components/ui.tsx](../../mobile/src/components/ui.tsx), and [mobile/src/constants/theme.ts](../../mobile/src/constants/theme.ts).
- Every async action must disable immediately and show a loading state. Do not ship raw async buttons that can be double-submitted.
- Prefer shimmer-first loading inside the mounted shell. Do not replace full pages with blocking loaders for data-fetching views.
- Keep CTA treatment polished, layouts responsive, and surfaces dark-mode-safe where the app already supports it. Do not leave placeholders, mock-only states, or bare text CTAs.
- If a feature crosses dashboard, admin-console, mobile, or backend surfaces, map the full user and operator journey before editing so each state stays coherent across the flow.
