const BLOCKED_DOMAINS = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '[::1]',
];

const UTM_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];

export function validateUrl(raw: string): { valid: boolean; url?: URL; error?: string } {
  if (!raw || raw.trim().length === 0) {
    return { valid: false, error: 'URL is empty' };
  }

  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    // Try adding https://
    try {
      url = new URL(`https://${raw.trim()}`);
    } catch {
      return { valid: false, error: 'Invalid URL format' };
    }
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    return { valid: false, error: 'Only HTTP and HTTPS URLs are supported' };
  }

  const hostname = url.hostname.toLowerCase();

  // Must contain at least one dot (quick sanity check for DNS-resolvable domains)
  if (!hostname.includes('.') && hostname !== 'localhost') {
    return { valid: false, error: 'URL must contain a valid domain (e.g., example.com)' };
  }

  if (BLOCKED_DOMAINS.some(d => hostname === d || hostname.endsWith(`.${d}`))) {
    return { valid: false, error: 'Internal URLs are not supported' };
  }

  return { valid: true, url };
}

export function normalizeUrl(raw: string): string {
  const result = validateUrl(raw);
  if (!result.valid || !result.url) return raw;

  const url = result.url;
  // Lowercase hostname
  url.hostname = url.hostname.toLowerCase();
  // Remove trailing slash
  let pathname = url.pathname;
  if (pathname.endsWith('/') && pathname.length > 1) {
    pathname = pathname.slice(0, -1);
  }
  url.pathname = pathname;
  // Keep only UTM params from search
  const keptParams = new URLSearchParams();
  url.searchParams.forEach((value, key) => {
    if (UTM_PARAMS.includes(key)) {
      keptParams.set(key, value);
    }
  });
  url.search = keptParams.toString();
  // Remove hash
  url.hash = '';

  return url.toString();
}

export async function followRedirects(
  url: string,
  maxRedirects = 5
): Promise<{ finalUrl: string; redirectChain: string[] }> {
  const chain: string[] = [url];
  let currentUrl = url;

  for (let i = 0; i < maxRedirects; i++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(currentUrl, {
        method: 'HEAD',
        redirect: 'manual',
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('location');
        if (!location) break;

        // Resolve relative URLs
        const resolved = new URL(location, currentUrl).toString();
        chain.push(resolved);
        currentUrl = resolved;
      } else {
        break;
      }
    } catch {
      break;
    }
  }

  return { finalUrl: currentUrl, redirectChain: chain };
}
