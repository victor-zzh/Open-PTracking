import type { CrawlOptions, FetchResult } from '../lib/types';

const DEFAULT_OPTIONS: CrawlOptions = {
  timeout: 15000,
  maxRetries: 2,
  usePlaywright: true,
};

const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
];

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string, options: CrawlOptions): Promise<FetchResult> {
  let lastError: string | undefined;

  for (let attempt = 0; attempt < options.maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), options.timeout);

      const response = await fetch(url, {
        headers: {
          'User-Agent': USER_AGENTS[attempt % USER_AGENTS.length]!,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        },
        redirect: 'follow',
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (response.status === 429) {
        // Rate limited — exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        await sleep(delay);
        continue;
      }

      if (response.status === 403 || response.status === 401) {
        return {
          html: '',
          finalUrl: response.url,
          statusCode: response.status,
          error: 'blocked',
        };
      }

      const html = await response.text();

      return {
        html,
        finalUrl: response.url,
        statusCode: response.status,
      };
    } catch (err: unknown) {
      lastError = err instanceof Error ? err.message : String(err);
      if (lastError.includes('abort')) {
        lastError = 'timeout';
      }
      if (attempt < options.maxRetries - 1) {
        await sleep(Math.pow(2, attempt) * 500);
      }
    }
  }

  return {
    html: '',
    finalUrl: url,
    statusCode: 0,
    error: lastError || 'fetch_failed',
  };
}

async function fetchWithPlaywright(url: string, timeout: number): Promise<FetchResult> {
  try {
    const { chromium } = await import('playwright');

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: USER_AGENTS[0],
    });
    const page = await context.newPage();

    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout,
    });

    const html = await page.content();
    const finalUrl = page.url();

    await browser.close();

    return { html, finalUrl, statusCode: 200 };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('timeout') || msg.includes('Timeout')) {
      return { html: '', finalUrl: url, statusCode: 0, error: 'timeout' };
    }
    return { html: '', finalUrl: url, statusCode: 0, error: msg };
  }
}

export async function crawlUrl(
  url: string,
  opts: Partial<CrawlOptions> = {}
): Promise<FetchResult> {
  const options = { ...DEFAULT_OPTIONS, ...opts };

  if (options.usePlaywright) {
    // Race fetch against Playwright — first valid result wins
    return new Promise<FetchResult>(resolve => {
      let resolved = false;

      const finish = (result: FetchResult) => {
        if (!resolved) {
          resolved = true;
          resolve(result);
        }
      };

      // Fast path: direct fetch
      fetchWithRetry(url, options).then(result => {
        if (result.html && result.html.length > 200 && !result.error) {
          finish(result);
        }
      });

      // Slow path: Playwright
      fetchWithPlaywright(url, options.timeout).then(result => {
        if (!resolved && result.html && result.html.length > 200 && !result.error) {
          finish(result);
        }
      });

      // Overall timeout
      setTimeout(() => {
        // If neither resolved, return the fetch result
        fetchWithRetry(url, { ...options, maxRetries: 1 }).then(result => {
          if (!result.error) {
            finish(result);
          } else {
            finish({
              html: '',
              finalUrl: url,
              statusCode: 0,
              error: 'timeout',
            });
          }
        });
      }, options.timeout);
    });
  }

  return fetchWithRetry(url, options);
}
