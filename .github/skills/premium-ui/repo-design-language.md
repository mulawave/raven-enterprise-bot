# Repo Design Language

Use this file before inventing new UI. The best premium result in this repo usually comes from tightening an existing surface language, not replacing it.

## Dashboard Signals

### Core traits
- Tailwind utility-first layouts with light surfaces and a dark adaptation layer.
- Accent families already in use: indigo, emerald, sky, violet, amber, orange.
- Rounded icon chips and pill actions are common when the page is already more polished.
- Premium marketing surfaces lean darker and more atmospheric than CRUD screens.

### Concrete references
- `dashboard/app/globals.css`
  - Defines sky-primary CSS variables.
  - Adapts legacy light classes into dark mode instead of requiring full rewrites.
- `dashboard/app/bots/page.tsx`
  - Strong example of compact CTA cards with icon chips and pill actions.
- `dashboard/app/analytics/page.tsx`
  - Good stat-card shimmer pattern using gradient skeletons inside the real layout shell.
- `dashboard/app/rba_sales/page.tsx`
  - Stronger premium language: atmospheric dark surfaces, colored icon chips, framed screenshots, accent pills.

### Web card formula already present
```tsx
<div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5">
  <div className="flex items-center gap-3">
    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/15 ring-1 ring-violet-400/30">
      <svg className="h-4 w-4 text-violet-500" />
    </div>
    <div>
      <p className="text-xs font-semibold text-gray-900">FAQs</p>
      <p className="text-xs text-gray-400">12 questions</p>
    </div>
  </div>
  <Link className="inline-flex items-center gap-1 rounded-lg bg-violet-500/20 px-2.5 py-1 text-xs font-semibold text-violet-600 ring-1 ring-violet-400/40">
    Manage
  </Link>
</div>
```

## Admin Console Signals

### Core traits
- Cleaner and more operational than dashboard pages.
- `lucide-react` is the default icon system.
- White cards, slate borders, restrained shadows, crisp spacing.
- Uses the shared `Button` component for loading/disabled states.

### Concrete references
- `admin-console/components/Button.tsx`
  - Canonical async button behavior: `isLoading`, `loadingText`, disabled-on-submit.
- `admin-console/app/admin/api-keys/page.tsx`
  - Strong loading/save/error pattern with lucide icons and status text.
- `admin-console/app/globals.css`
  - Canonical shimmer gradient plus `animate-slide-in-right` and `animate-shake`.

### Canonical shimmer recipe
```css
.animate-shimmer {
  animation: shimmer 2s infinite linear;
  background: linear-gradient(to right, #f1f5f9 0%, #e2e8f0 50%, #f1f5f9 100%);
  background-size: 1000px 100%;
}

html.dark .animate-shimmer {
  background: linear-gradient(to right, #1e293b 0%, #334155 50%, #1e293b 100%);
  background-size: 1000px 100%;
}
```

## Mobile Signals

### Core traits
- The mobile app has the clearest explicit design tokens in the repo.
- Default experience is dark, with light mode supported.
- Brand leans navy + orange rather than indigo.
- Cards use border-first definition with soft elevation in light mode.
- Shared primitives already exist. Reuse them before writing custom controls.

### Concrete references
- `mobile/src/constants/theme.ts`
  - Defines brand palette, surfaces, borders, shimmer color, spacing, font sizes, and radius scale.
- `mobile/src/components/ui.tsx`
  - Shared `Button`, `Card`, `StatCard`, `Badge`, `SectionHeader`, `EmptyState`, `ShimmerRow`, `RefreshableScrollView`.
- `mobile/src/screens/HomeScreen.tsx`
  - Shell-first stat grid with card placeholders and brand-tinted icon blocks.
- `mobile/src/screens/BroadcastScreen.tsx`
  - Success/warning banners, info cards, safe-area header chip, segmented channel controls.
- `mobile/src/components/DashboardTour.tsx`
  - Elevated modal card, progress bars, premium walkthrough flow.
- `mobile/src/screens/OnboardingScreen.tsx`
  - Large display typography, circular feature marks, compact pagination.

### Mobile surface formula
```tsx
<View
  style={{
    backgroundColor: colors.card,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: Spacing.lg,
  }}
>
  {children}
</View>
```

### Mobile banner formula
```tsx
<View
  style={{
    backgroundColor: '#FDCB6E15',
    borderWidth: 1,
    borderColor: '#FDCB6E40',
    borderRadius: BorderRadius.lg,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  }}
/>
```

## Brand Palette

These are the strongest explicit brand tokens in the repo today.

| Token | Hex | Typical Use |
|-------|-----|-------------|
| Navy Dark | `#173a6c` | brand headers, premium info accents, shadow tint |
| Navy Light | `#1e4d8c` | supportive accents, secondary brand emphasis |
| Orange Warm | `#f5c16c` | halos, badges, warnings, highlight panels |
| Orange Bold | `#f49617` | primary CTA, active progress, hero emphasis |
| Dark Background | `#0c1929` | mobile dark shell |
| Dark Surface | `#132741` | mobile dark card surface |
| Dark Border | `#1e3d6a` | mobile dark card border |

## Cross-Surface Mapping

### Icons
- Admin console: `lucide-react`
- Mobile: `Ionicons`
- Dashboard: preserve the page's existing icon language, often inline SVGs

### Chips and icon boxes
- Web: `bg-color/15 ring-1 ring-color/30`
- Mobile: `backgroundColor: '#HEX20'` with the icon colored using the full hex token

### Loading states
- Web/admin: gradient shimmer is preferred when skeletons are visible
- Mobile: `ShimmerRow` or card-shaped placeholders are enough unless the screen is especially premium

### Surfaces
- Admin: white/slate, restrained, operational
- Dashboard: can be lighter CRUD or darker premium, depending on route
- Mobile: border-defined cards, tighter spacing rhythm, larger touch targets

## Do / Don't

### Do
- Translate the same idea across surfaces instead of forcing identical markup.
- Reuse repo tokens before choosing new colors.
- Keep premium motion subtle and purposeful.
- Preserve the native icon system of the surface you are editing.

### Don't
- Port generic gradient-heavy trends into operational screens.
- Mix `lucide-react`, `Ionicons`, and random SVG packs on one surface.
- Replace the mobile brand palette with unrelated colors unless the task explicitly calls for a rebrand.
- Use dynamic Tailwind color class construction in examples unless the classes are safelisted.
