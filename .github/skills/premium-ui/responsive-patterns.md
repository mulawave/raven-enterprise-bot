# Responsive Patterns

Premium UI is not just desktop UI shrunk down. Use these patterns when building or reviewing layouts across dashboard, admin-console, and mobile-inspired surfaces.

## Web Layout Strategy

### Default stance
- Start with a single-column structure that works at phone width.
- Add columns only when the information density clearly benefits.
- Keep the page shell intact while cards and tables adapt inside it.

### Recommended grid patterns
- Stats: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
- CTA cards: `grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3`
- Dense admin cards: `grid grid-cols-1 lg:grid-cols-2`
- Marketing showcase blocks: stack on mobile, split into 2 columns on `lg` or above

### Spacing rules
- Reduce horizontal padding on mobile before collapsing information hierarchy.
- Keep card padding generous enough to preserve quality; do not crush premium cards into cramped boxes.
- Let vertical rhythm open up on larger screens.

## Tables and Dense Data

### Preferred behavior
- Keep headers and table shell mounted during loading.
- On narrow screens, either:
  - reduce nonessential columns,
  - move secondary data into stacked subtext,
  - or switch to card rows if the table becomes unreadable.

### Avoid
- Horizontal overflow as the first and only responsive strategy for every table.
- Tiny text to force more columns onto the screen.
- Replacing the entire page with a loader while table data fetches.

## CTA and Navigation Cards

- Full-width on small screens.
- Keep icon, copy, and action pill aligned even when wrapping.
- Avoid multi-line badge buttons when a full-card tap target is more natural.
- Back/home cards should still feel substantial on mobile widths.

## Forms

- Inputs should fill available width.
- Multi-column forms should collapse to one column on smaller screens.
- Helper text and inline validation should remain directly associated with the field.
- Primary action should stay visible without becoming visually aggressive.

## Typography

- Large headings can scale down, but hierarchy should remain obvious.
- Supporting copy should not become unreadably faint on smaller devices.
- Preserve comfortable line length rather than forcing long paragraphs into narrow columns.

## Motion and Visual Effects

- Background effects should simplify on smaller screens.
- Glow and shadow should not overpower content density on mobile widths.
- Staggered reveals are useful, but the layout must still make sense with animation disabled.

## Mobile-App-Inspired Rules For Web

When borrowing from the mobile app:
- Use brand chips and bordered cards, not giant floating gradients.
- Translate mobile token intent into Tailwind classes instead of copying literal values blindly.
- Keep the strong navy/orange palette for moments that benefit from brand emphasis, not every CRUD surface.

## Mobile App Responsiveness

### Safe areas
- Use `useSafeAreaInsets()` for top and bottom spacing.
- Do not hardcode top padding where status bar and notch behavior vary.

### Scroll behavior
- Keep main screens vertically scrollable.
- Avoid placing critical actions outside reachable scroll flow without reason.
- Use refresh controls without hiding current content.

### Touch density
- Chips and segmented controls need enough padding to remain tappable.
- Icon-only controls should have enlarged hit areas.
- Bottom-aligned actions need breathing room from the safe area.

## Review Questions

Ask these before signing off:
- Does the layout still look intentional at phone width?
- Do cards keep their hierarchy when stacked?
- Does the loading state preserve orientation?
- Are actions still obvious and reachable?
- Does the mobile version feel designed, not merely compressed?
