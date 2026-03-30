# Mobile Patterns

Use this file when working in `mobile/**` or when borrowing mobile brand language for premium web surfaces.

## Theme Tokens To Prefer

Source of truth: `mobile/src/constants/theme.ts`

### Brand colors
- `BrandColors.navyDark` → `#173a6c`
- `BrandColors.navyLight` → `#1e4d8c`
- `BrandColors.orangeWarm` → `#f5c16c`
- `BrandColors.orangeBold` → `#f49617`

### Structural tokens
- Spacing: `xs=4`, `sm=8`, `md=12`, `lg=16`, `xl=20`, `xxl=24`, `xxxl=32`
- Radius: `sm=8`, `md=12`, `lg=16`, `xl=20`, `xxl=24`
- Font sizes: `xs=11`, `sm=13`, `md=15`, `lg=17`, `xl=20`, `xxl=24`, `display=40`

### Surface stack
- Dark background: `#0c1929`
- Dark surface: `#132741`
- Dark surface elevated: `#1a3356`
- Dark border: `#1e3d6a`
- Light surface: `#ffffff`
- Light surface elevated: `#eef2f9`
- Light border: `#d4ddef`

## Shared Components First

Before writing custom mobile UI, check whether one of these already fits:
- `Button`
- `Card`
- `StatCard`
- `Badge`
- `SectionHeader`
- `EmptyState`
- `ShimmerRow`
- `RefreshableScrollView`

These live in `mobile/src/components/ui.tsx`.

## Pattern 1: Safe-Area Header With Brand Chip

Derived from `mobile/src/screens/BroadcastScreen.tsx`.

```tsx
<View
  style={{
    paddingTop: insets.top + 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: colors.header,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  }}
>
  <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
    <Ionicons name="arrow-back" size={24} color={colors.text} />
  </TouchableOpacity>
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
    <View style={{ width: 32, height: 32, borderRadius: BorderRadius.sm, backgroundColor: '#FDCB6E20', alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name="megaphone" size={16} color="#FDCB6E" />
    </View>
    <Text style={{ fontSize: FontSize.lg, fontWeight: '700', color: colors.text }}>Broadcast</Text>
  </View>
</View>
```

Use this when the screen needs a compact, premium identity without a large hero.

## Pattern 2: Shell-First Stat Grid

Derived from `mobile/src/screens/HomeScreen.tsx`.

```tsx
<SectionHeader title="Overview" icon="bar-chart" iconColor={BrandColors.navyDark} />
<View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
  {isLoading ? (
    <>
      <View style={{ flex: 1, backgroundColor: colors.card, borderRadius: BorderRadius.lg, padding: 16, borderWidth: 1, borderColor: colors.cardBorder }}>
        <ShimmerRow width={40} height={40} />
        <View style={{ height: 8 }} />
        <ShimmerRow width="60%" />
        <View style={{ height: 8 }} />
        <ShimmerRow width="40%" height={24} />
      </View>
      <View style={{ flex: 1, backgroundColor: colors.card, borderRadius: BorderRadius.lg, padding: 16, borderWidth: 1, borderColor: colors.cardBorder }}>
        <ShimmerRow width={40} height={40} />
        <View style={{ height: 8 }} />
        <ShimmerRow width="60%" />
        <View style={{ height: 8 }} />
        <ShimmerRow width="40%" height={24} />
      </View>
    </>
  ) : (
    <>
      <StatCard title="Orders" value={stats.orders} icon="receipt" color={BrandColors.navyDark} colorBg={`${BrandColors.navyDark}20`} />
      <StatCard title="Conversations" value={stats.conversations} icon="chatbubbles" color={BrandColors.orangeBold} colorBg={`${BrandColors.orangeBold}20`} />
    </>
  )}
</View>
```

Keep the section header and grid mounted. Only the card internals should shimmer.

## Pattern 3: Result Banner

Derived from `mobile/src/screens/BroadcastScreen.tsx`.

```tsx
<View
  style={{
    backgroundColor: result.failed > 0 ? '#FDCB6E15' : '#00B89415',
    borderWidth: 1,
    borderColor: result.failed > 0 ? '#FDCB6E40' : '#00B89440',
    borderRadius: BorderRadius.lg,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  }}
>
  <View
    style={{
      width: 40,
      height: 40,
      borderRadius: BorderRadius.md,
      backgroundColor: result.failed > 0 ? '#FDCB6E20' : '#00B89420',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <Ionicons name={result.failed > 0 ? 'warning' : 'checkmark-circle'} size={20} color={result.failed > 0 ? '#FDCB6E' : '#00B894'} />
  </View>
</View>
```

Use this for delivery results, sync outcomes, and contextual warnings.

## Pattern 4: Elevated Walkthrough Modal

Derived from `mobile/src/components/DashboardTour.tsx`.

```tsx
<TouchableOpacity
  activeOpacity={1}
  style={{
    width: Math.min(width - 64, 340),
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  }}
>
```

Use stronger shadow only when the component is intentionally modal or spotlighted.

## Pattern 5: Onboarding Hero Slide

Derived from `mobile/src/screens/OnboardingScreen.tsx`.

```tsx
<View
  style={{
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: item.iconBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 48,
    borderWidth: 2,
    borderColor: `${item.iconColor}40`,
  }}
>
  <Ionicons name={item.icon} size={52} color={item.iconColor} />
</View>

<Text
  style={{
    fontSize: FontSize.display,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 44,
  }}
>
  {item.title}
</Text>
```

This is the repo's clearest example of large-format mobile marketing UI.

## Pattern 6: Segmented Channel Chips

Derived from `mobile/src/screens/BroadcastScreen.tsx`.

```tsx
<TouchableOpacity
  style={{
    flex: 1,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    backgroundColor: isActive ? `${ch.color}15` : colors.surface,
    borderWidth: 1,
    borderColor: isActive ? `${ch.color}50` : colors.border,
    alignItems: 'center',
    gap: 4,
    opacity: ch.enabled ? 1 : 0.45,
  }}
>
```

Use for filters, channels, states, and mutually exclusive modes.

## Mobile Quality Gates

- Async actions show `ActivityIndicator` and disable immediately.
- Headers respect `useSafeAreaInsets()`.
- Touch targets stay in the 44-56px range.
- Card borders remain visible in both dark and light themes.
- Surface hierarchy is readable without relying on extreme shadow.
- Placeholder and muted text still passes contrast checks in both themes.

## Anti-Patterns

- Raw one-off spacing values when a token already exists.
- Full-screen loading blocker for list/detail screens.
- Random hex colors that bypass the defined theme without a reason.
- Tiny touch targets just because the design looks cleaner.
- Flat screens with no card, chip, or hierarchy separation.
