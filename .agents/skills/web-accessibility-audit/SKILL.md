---
name: web-accessibility-audit
description: Audit web apps for WCAG 2.0/2.1/2.2 accessibility compliance. Identify common violations and provide remediation guidance for color contrast, keyboard navigation, screen reader support, and ARIA usage.
---

# Web Accessibility Audit

Audit web apps against WCAG 2.0/2.1/2.2 standards. Identify violations and provide remediation guidance.

## When to Use

- User requests accessibility audit, a11y check, or WCAG compliance review
- Pre-launch QA checklist

## Audit Process (4 Phases)

### Phase 1: Automated Testing

**Lighthouse (for this project):**
```bash
npx lighthouse http://localhost:3000 --only-categories=accessibility --output=json --output-path=./lighthouse-a11y.json
```

**axe-core check:**
```bash
grep -r "axe-core" package.json || echo "axe-core not installed"
```

### Phase 2: Manual Code Inspection

Key grep patterns for this Hono/Bun project:

```bash
# Missing alt text on images
grep -rn '<img' public/

# Focus indicators
grep -rn 'outline' public/

# Form inputs without labels
grep -rn '<input\|<textarea\|<select' public/

# Language attribute on html tag
grep -rn '<html' public/

# Color values for contrast checking
grep -rn 'color:\|background:' public/

# Heading structure (h1-h6)
grep -rn '<h[1-6]' public/
```

### Phase 3: Prioritize by Severity

**Critical (fix immediately):**
- Keyboard traps, missing focus indicators
- Missing form labels, missing alt text on functional images
- Insufficient color contrast on interactive elements

**Serious (fix before launch):**
- Missing page language, improper heading structure
- Non-descriptive link text, missing skip links

**Moderate (fix soon):**
- Missing ARIA labels on icons, inconsistent navigation

### Phase 4: Manual Testing

- Keyboard navigation: Tab through the entire page
- Screen reader: VoiceOver (Mac), NVDA (Windows)
- Zoom to 200%: Content should reflow
- Reduced motion: `@media (prefers-reduced-motion: reduce)`
- High contrast mode

## Project-Specific Checklist (Open-PTracking)

### Current audit (public/index.html):
- [ ] `<html lang>` attribute present
- [ ] All `<input>` elements have associated labels
- [ ] Color contrast ratios meet WCAG AA (4.5:1 normal, 3:1 large)
- [ ] Focus indicators visible on all interactive elements
- [ ] Dynamic content (loading/error/results) has `aria-live` regions
- [ ] Error messages use `role="alert"`
- [ ] Buttons have accessible names
- [ ] `prefers-reduced-motion` respected for loading animations

## Most Common Violations (WebAIM Million)

1. Low Color Contrast (86.4% of sites) — AA: 4.5:1 normal text, 3:1 large text
2. Missing Alt Text (60.6%)
3. Missing Form Labels (39.6%)
4. Missing Language Attribute (28.9%)
5. Improper Heading Structure
6. Empty Links / Poor Link Text

## Output Format

Audit reports should include:
- Summary with issue count by severity
- Per-issue: severity, element, file location, WCAG criterion, fix code
- Testing recommendations
- Prioritized next steps
