# Theme Customization — Dark & Light Mode

Raven ships with a full **dark/light theme system** across both the Tenant Dashboard and Admin Console. This guide explains how it works and how to customize the colors.

---

## How the Theme System Works

### Architecture

```
User clicks sun/moon toggle
        ↓
ThemeProvider updates state + localStorage
        ↓
"dark" class added/removed from <html> element
        ↓
Tailwind's darkMode: 'class' activates dark styles
        ↓
CSS overrides in globals.css apply dark colors
```

### Key Files

| File | Purpose |
|---|---|
| `dashboard/lib/theme-context.tsx` | Theme state + toggle for dashboard |
| `admin-console/lib/theme-context.tsx` | Theme state + toggle for admin console |
| `dashboard/app/globals.css` | CSS dark mode overrides (dashboard) |
| `admin-console/app/globals.css` | CSS dark mode overrides (admin console) |
| `dashboard/tailwind.config.ts` | `darkMode: 'class'` + primary color CSS vars |
| `admin-console/tailwind.config.ts` | `darkMode: 'class'` + primary color palette |
| `dashboard/app/layout.tsx` | ThemeProvider wrapper + flash-prevention script |
| `admin-console/app/layout.tsx` | ThemeProvider wrapper + flash-prevention script |
| `dashboard/components/Header.tsx` | Sun/moon toggle button |
| `admin-console/components/AdminHeader.tsx` | Sun/moon toggle button |

### Storage

- Dashboard stores theme in `localStorage` key: `"raven-theme"`
- Admin Console stores theme in `localStorage` key: `"raven-admin-theme"`
- A small inline `<script>` in each `layout.tsx` reads localStorage before React hydrates, preventing a flash of wrong theme on page load.

---

## Changing the Primary Color Palette

### Dashboard

The dashboard uses **CSS custom properties** for its primary colors. Edit `dashboard/app/globals.css`:

```css
:root {
  /* ── Primary color (currently sky-blue) ── */
  --primary-50:  240 249 255;   /* lightest tint */
  --primary-100: 224 242 254;
  --primary-500: 14 165 233;    /* main brand color */
  --primary-600: 2 132 199;     /* hover states */
  --primary-700: 3 105 161;     /* active / dark accents */
}
```

To change the brand color (e.g., to indigo):

```css
:root {
  --primary-50:  238 242 255;
  --primary-100: 224 231 255;
  --primary-500: 99 102 241;
  --primary-600: 79 70 229;
  --primary-700: 67 56 202;
}
```

These variables are consumed via Tailwind in `dashboard/tailwind.config.ts`:

```ts
primary: {
  50:  'rgb(var(--primary-50) / <alpha-value>)',
  100: 'rgb(var(--primary-100) / <alpha-value>)',
  500: 'rgb(var(--primary-500) / <alpha-value>)',
  600: 'rgb(var(--primary-600) / <alpha-value>)',
  700: 'rgb(var(--primary-700) / <alpha-value>)',
}
```

> **No rebuild needed for CSS-only changes if using dev mode.** For production, run `npm run build` after editing.

### Admin Console

The admin console uses **hardcoded Tailwind values** in `admin-console/tailwind.config.ts`:

```ts
primary: {
  50:  '#f0f9ff',
  100: '#e0f2fe',
  200: '#bae6fd',
  300: '#7dd3fc',
  400: '#38bdf8',
  500: '#0ea5e9',   // ← Main brand color
  600: '#0284c7',
  700: '#0369a1',
  800: '#075985',
  900: '#0c4a6e',
}
```

Replace these hex values with your desired palette. Use [Tailwind Color Generator](https://uicolors.app/create) or [Coolors](https://coolors.co/) to generate a full 50–900 palette from a single brand color.

---

## Changing Dark Mode Background Colors

Both `globals.css` files define dark mode overrides. The key sections:

### Dark backgrounds

```css
/* ── Main backgrounds ── */
html.dark body {
  background-color: #0f172a;    /* slate-900 — page background */
  color: #e2e8f0;               /* slate-200 — default text */
}

html.dark main [class~="bg-white"] {
  background-color: #1e293b;    /* slate-800 — cards, panels */
}

html.dark main [class~="bg-gray-50"] {
  background-color: #0f172a;    /* slate-900 — secondary background */
}
```

To change dark mode to a **warmer tone** (e.g., dark brown instead of dark blue):

```css
html.dark body {
  background-color: #1c1917;    /* stone-900 */
  color: #e7e5e4;               /* stone-200 */
}

html.dark main [class~="bg-white"] {
  background-color: #292524;    /* stone-800 */
}

html.dark main [class~="bg-gray-50"] {
  background-color: #1c1917;    /* stone-900 */
}
```

### Dark text colors

```css
html.dark main [class~="text-gray-900"] { color: #f1f5f9; }  /* → slate-100 */
html.dark main [class~="text-gray-700"] { color: #cbd5e1; }  /* → slate-300 */
html.dark main [class~="text-gray-500"] { color: #94a3b8; }  /* → slate-400 */
```

### Dark borders

```css
html.dark main [class~="border-gray-200"] { border-color: #334155; }  /* slate-700 */
html.dark main [class~="border-gray-300"] { border-color: #334155; }
```

---

## Changing Light Mode Colors

The light mode uses standard Tailwind utility classes (`bg-white`, `text-gray-900`, etc.) throughout the components. To change light mode colors:

1. **Background:** Modify `body { background: white; }` in `globals.css`
2. **Component colors:** Search for Tailwind classes in component files (e.g., `bg-sky-500` → `bg-indigo-500`)
3. **Accent colors:** grep for `emerald`, `sky`, `blue` in dashboard and admin-console components

---

## Adding New Theme Presets

To offer users multiple theme choices beyond just light/dark:

### 1. Extend the ThemeProvider

In `dashboard/lib/theme-context.tsx`:

```tsx
// Change from:
type Theme = 'light' | 'dark'

// To:
type Theme = 'light' | 'dark' | 'midnight' | 'warm'
```

### 2. Apply CSS class per theme

```tsx
// In the toggle/set function:
document.documentElement.className = '' // clear all
document.documentElement.classList.add(theme)
```

### 3. Add CSS rules

```css
html.midnight body { background-color: #020617; color: #e2e8f0; }
html.warm body { background-color: #faf5ff; color: #1e1b4b; }
```

---

## Common Color Palettes

Here are some production-ready palettes to drop in:

### Indigo (Professional)
```
50: #eef2ff, 100: #e0e7ff, 500: #6366f1, 600: #4f46e5, 700: #4338ca
```

### Emerald (Growth / Finance)
```
50: #ecfdf5, 100: #d1fae5, 500: #10b981, 600: #059669, 700: #047857
```

### Rose (Creative / Marketing)
```
50: #fff1f2, 100: #ffe4e6, 500: #f43f5e, 600: #e11d48, 700: #be123c
```

### Amber (Warm / Hospitality)
```
50: #fffbeb, 100: #fef3c7, 500: #f59e0b, 600: #d97706, 700: #b45309
```

### Violet (Premium / Luxury)
```
50: #f5f3ff, 100: #ede9fe, 500: #8b5cf6, 600: #7c3aed, 700: #6d28d9
```

---

## After Changing Colors

1. **Rebuild the affected frontend:**
   ```bash
   cd dashboard && npm run build && cd ..
   cd admin-console && npm run build && cd ..
   ```

2. **Deploy:**
   ```powershell
   .\scripts\deploy-to-prod.ps1 -Service dash
   .\scripts\deploy-to-prod.ps1 -Service admin
   ```

3. **Clear browser cache** — users may need a hard refresh (Ctrl+Shift+R) to see the new colors.

---

*The theme system is intentionally simple — CSS variables + Tailwind class-based dark mode. No runtime JavaScript color calculations, no theme engines, no external dependencies.*
