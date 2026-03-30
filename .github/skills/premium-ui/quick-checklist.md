# Quick Validation Checklist

Use this for rapid component review before deployment.

## 30-Second Gate Check

Run through these in order. If ANY fail, component is not production-ready.

### Critical (Must Pass All)

- [ ] **No bare async buttons** — search for `<button onClick={async` or `onClick={() => api.`
- [ ] **No bare mobile async touchables** — search for `TouchableOpacity` doing network work without `isLoading`, `ActivityIndicator`, or disabled logic
- [ ] **No bare CTA links** — search for `<Link href` or `<a href` outside card structure
- [ ] **No full-page loaders** — search for `if (isLoading) return`
- [ ] **No console.log** — search codebase
- [ ] **No TODO comments** — search codebase

### High Priority (Should Pass All)

- [ ] All buttons use `<Button isLoading={...} loadingText="...">`
- [ ] All CTAs have icon container + labels + badge button structure
- [ ] All data pages render shell immediately, shimmer data cells
- [ ] Dark mode classes present (`dark:bg-...`, `dark:text-...`)
- [ ] Responsive classes present (`sm:`, `md:`, `lg:`)
- [ ] Icon system is consistent per surface (`lucide-react` admin-console, `Ionicons` mobile, existing page pattern in dashboard)
- [ ] Mobile screens respect safe areas and keep touch targets in the 44-56px range

### Medium Priority (Nice to Have)

- [ ] TypeScript no `any` types
- [ ] Proper error handling in all async functions
- [ ] Loading state cleanup in `finally` blocks
- [ ] Consistent naming conventions
- [ ] No code duplication

## Visual Sophistication Spot Check

Open the page, visually scan:

1. **CTAs look like cards, not links** — bordered, icon box, labels, badge button
2. **Buttons show spinner when clicked** — disable immediately, show loading text
3. **Page shell renders before data** — no white screen flash, structure present
4. **Colors match theme** — consistent opacity patterns (bg/15, ring/30, etc.)
5. **Dark mode works** — toggle, check all elements
6. **No amateur glow effects** — blur should be blur-lg max, opacity ≤0.2
7. **Mobile feels native to Raven** — navy/orange accents, card borders, soft elevation, safe-area-aware spacing

## Red Flags (Instant Fail)

If you see ANY of these, stop and fix immediately:

🚨 `<button onClick={async () => ...}>` without loading state  
🚨 `<TouchableOpacity onPress={...}>` making async calls with no loading indicator or disabled state  
🚨 `<Link className="underline">Sign up</Link>` (bare text link)  
🚨 `if (isLoading) return <LoadingSpinner />`  
🚨 `console.log` anywhere  
🚨 `// TODO: ...` comments  
🚨 `opacity-50` or `opacity-60` on glow effects  
🚨 `blur-xl` on border glows  
🚨 No dark mode styles  
🚨 Placeholder text ("Lorem ipsum", "Test", "Foo Bar")  
🚨 Mixed icon systems on a single surface without a reason

## Pass/Fail Decision

- **All Critical** ✅ → Can proceed to High Priority
- **Any Critical** ❌ → Fix before continuing
- **All High Priority** ✅ → Production-ready (recommend Medium fixes)
- **Any High Priority** ❌ → Not production-ready, must fix

## Time Budget

- Quick scan: 30 seconds
- Full checklist: 2-3 minutes
- Fix critical violations: 5-10 minutes per issue
- Full component refactor: 20-40 minutes

If violations are severe (multiple missing loading states, all CTAs are bare links), estimate 1-2 hours for full premium UI upgrade.
