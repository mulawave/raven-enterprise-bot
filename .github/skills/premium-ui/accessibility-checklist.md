# Accessibility Checklist

Use this before calling a UI production-ready. The goal is not checkbox theater; the goal is a UI that remains usable under keyboard, screen reader, touch, reduced precision, slow loading, and low-contrast conditions.

## Universal Gates

- Every interactive control has a clear accessible name.
- Color is never the only signal for status or meaning.
- Success, warning, and error states are visible and understandable without animation.
- Loading state changes are perceivable.
- Placeholder text is not the only label.
- Body copy stays readable at realistic zoom and device sizes.

## Web Checklist

### Structure
- Use real headings in descending order.
- Keep forms grouped with labels and helper text.
- Use semantic buttons for actions and links for navigation.
- Ensure card-style CTAs still have meaningful link text.

### Keyboard and focus
- Every action is reachable by keyboard.
- Focus order matches the visual flow.
- Focus styles remain visible on dark and light backgrounds.
- Modal dialogs trap focus and restore focus on close.

### Feedback
- Async buttons communicate busy state with visible loading text.
- Validation errors are placed near the relevant field.
- Success and error banners are announced in an appropriate live region when needed.
- Disabled buttons still have an adjacent explanation when the reason is not obvious.

### Visual accessibility
- Contrast is acceptable for primary text, muted text, borders, and chips.
- Tiny gray text on white or dark backgrounds is avoided.
- Decorative glow never interferes with text readability.
- Shimmer placeholders do not become the only source of orientation; the shell remains visible.

## Mobile Checklist

### Touch and layout
- Tap targets stay in the 44-56px range.
- Back buttons and small icon controls have extra hit area when needed.
- Safe areas are respected at top and bottom.
- Important actions are reachable without awkward thumb gymnastics when practical.

### Screen reader support
- Icon-only buttons have `accessibilityLabel`.
- Use `accessibilityRole` for buttons, links, switches, and tabs.
- Grouped content that behaves like a card or summary is announced coherently.
- Do not rely on visual chip color alone for state.

### Motion and state
- Loading indicators appear during async actions.
- Pull-to-refresh does not hide current content while loading.
- Result banners explain what succeeded or failed in text, not just iconography.
- Carousels and onboarding flows expose current step clearly.

## Async Interaction Checklist

- Web: `Button isLoading loadingText` is used for async actions.
- Mobile: `ActivityIndicator` or shared `Button` loading state is used for async actions.
- Buttons disable immediately on submit.
- Progress text is descriptive: `Saving…`, `Sending…`, `Deleting…`, `Creating…`.
- Cleanup happens in `finally` so the UI does not get stuck.

## Content Checklist

- Titles describe the page, not the internal implementation.
- Empty states explain what happened and what to do next.
- CTA sublabels say what the action will do.
- Status badges have plain-language labels.
- Error messages help the user recover.

## Fast Failure Conditions

If any of these are true, the component is not ready:
- Keyboard users cannot complete the task.
- Screen readers would encounter unlabeled icon actions.
- Loading removes the entire layout shell.
- Error state is color-only.
- Tap targets are too small.
- Focus style disappears into the background.
