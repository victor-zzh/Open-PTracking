---
name: webapp-testing
description: Test local web applications with Playwright. Use when asked to verify frontend functionality, debug UI behavior, capture browser screenshots, or inspect browser logs.
---

# Web Application Testing

Test local web applications using Playwright scripts.

## Decision Tree

1. **Is it static HTML?**
   - Yes → Read the HTML file directly to identify selectors
   - No → Go to step 2

2. **Is the server already running?**
   - No → Use `scripts/with_server.py` to manage server lifecycle, then test
   - Yes → Follow reconnaissance-then-action pattern directly

## Reconnaissance-Then-Action Pattern

1. Navigate and wait for `networkidle`
2. Take a screenshot or inspect the DOM
3. Identify selectors from the rendered state
4. Execute actions with discovered selectors

## Using with_server.py

For this Bun/Hono project:

```bash
python scripts/with_server.py --server "bun run dev" --port 3000 -- python your_test.py
```

## Project-Specific Testing

This project (Open-PTracking) uses Bun + Hono. The dev server runs on port 3000.

### Key endpoints:
- `GET /` — Static frontend (HTML + JS)
- `POST /api/analyze` — Main analysis endpoint, accepts `{"url": "..."}`

### Key UI elements:
- `#urlInput` — URL input field
- `#analyzeBtn` — Analyze button
- `#loadingSection` — Loading state (hidden by default)
- `#errorSection` — Error state (hidden by default)
- `#resultsSection` — Results (hidden by default)
- `#markdownView` — Markdown rendered output
- `#jsonView` — JSON raw output
- `#tabMarkdown` / `#tabJson` — View toggle tabs

### TypeScript Playwright Tests

This project has `playwright` installed as a devDependency. Use TypeScript tests directly:

```typescript
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

// Test the frontend
await page.goto('http://localhost:3000');
await page.waitForLoadState('networkidle');

// Fill in a URL and analyze
await page.fill('#urlInput', 'https://cursor.sh');
await page.click('#analyzeBtn');

// Wait for results
await page.waitForSelector('#resultsSection:not(.hidden)', { timeout: 35000 });

// Verify results
const productName = await page.textContent('.markdown-body h1');
console.log('Product:', productName);

await browser.close();
```

## Best Practices

- Always wait for `networkidle` before inspecting dynamic pages
- Use `sync_playwright()` for Python, `chromium.launch()` for TypeScript
- Always close the browser when done
- Use descriptive selectors: `text=`, `role=`, CSS selectors, or IDs
- Add appropriate waits: `page.waitForSelector()` or `page.waitForTimeout()`
- Treat bundled scripts as black boxes
