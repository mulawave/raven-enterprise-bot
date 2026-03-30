---
name: "End To End Feature Rollout"
description: "Implement a feature end to end across frontend, backend, worker, and operator flows. Use when a change spans user experience, API behavior, data writes, and validation."
argument-hint: "Describe the feature or change to implement"
agent: "agent"
---
Implement the requested feature or change end to end using the prompt arguments as the source task.

Before editing:
1. Map the affected flow: user entry point, admin or operator path, backend modules, worker or background effects, data reads or writes, permissions, success states, failure states, retry paths, empty states, and post-success feedback.
2. Search for existing patterns, contracts, and docs before inventing new structure. Use [workspace instructions](../copilot-instructions.md), [backend deploy guardrails](../instructions/backend-prisma-deploy.instructions.md), and [UI surface quality](../instructions/ui-surface-quality.instructions.md) when relevant.

Then implement:
- Make the smallest complete change that satisfies the request across every touched surface.
- For dashboard, admin-console, or mobile UI, follow [premium UI skill](../skills/premium-ui/SKILL.md) and deliver stateful buttons, shimmer-first loading, polished CTAs, responsive behavior, and dark-mode-safe surfaces where supported.
- For backend or Prisma work, read [backend/prisma/schema.prisma](../../backend/prisma/schema.prisma) first, preserve [backend/libs](../../backend/libs) boundaries, and keep any deployment guidance aligned with [scripts/deploy-to-prod.ps1](../../scripts/deploy-to-prod.ps1).
- Do not stop at partial UI stubs, partial API wiring, or undocumented state gaps if they are required to complete the requested flow.

Before finishing:
- Run targeted build, test, or verification commands for every touched surface.
- Summarize the flows changed, validation performed, files touched, and any remaining risks or follow-up checks.
