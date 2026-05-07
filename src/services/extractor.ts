import TurndownService from 'turndown';
import type { ExtractedContent } from '../lib/types';

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  emDelimiter: '*',
  bulletListMarker: '-',
});

// Remove noisy elements before conversion
turndown.remove(['script', 'style', 'nav', 'footer', 'iframe', 'noscript', 'svg']);

// Keep links but clean them
turndown.addRule('links', {
  filter: 'a',
  replacement: (content, node) => {
    const el = node as HTMLElement;
    const href = el.getAttribute('href') || '';
    if (!content.trim() || content.trim() === href) return '';
    return `[${content.trim()}](${href})`;
  },
});

function extractMeta(html: string, name: string): string {
  // Try name attribute
  const nameMatch = html.match(
    new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']*)["']`, 'i')
  );
  if (nameMatch) return nameMatch[1] || '';

  // Try property attribute (Open Graph)
  const propMatch = html.match(
    new RegExp(`<meta[^>]+property=["']${name}["'][^>]+content=["']([^"']*)["']`, 'i')
  );
  if (propMatch) return propMatch[1] || '';

  return '';
}

function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return match ? match[1]?.trim() || '' : '';
}

function extractH1(html: string): string {
  const match = html.match(/<h1[^>]*>([^<]*)<\/h1>/i);
  return match ? match[1]?.trim() || '' : '';
}

function detectLanguage(text: string): string {
  // Count CJK characters vs Latin characters in first 1000 chars
  const sample = text.slice(0, 1000);
  const cjkCount = (sample.match(/[一-鿿㐀-䶿]/g) || []).length;
  const totalChars = sample.replace(/\s/g, '').length || 1;
  return cjkCount / totalChars > 0.3 ? 'zh' : 'en';
}

function truncateText(text: string, maxChars: number): { text: string; truncated: boolean } {
  if (text.length <= maxChars) return { text, truncated: false };
  return { text: text.slice(0, maxChars), truncated: true };
}

export function extractContent(html: string, url: string): ExtractedContent {
  const ogTitle = extractMeta(html, 'og:title');
  const ogDescription = extractMeta(html, 'og:description');
  const title = extractTitle(html);
  const h1Text = extractH1(html);
  const metaDescription = extractMeta(html, 'description');

  // Convert HTML to Markdown
  const markdown = turndown.turndown(html);

  // Strip remaining HTML tags for plain text
  const textContent = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-z]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const language = detectLanguage(textContent);

  // Truncate to ~30k chars for LLM (roughly 8-10k tokens)
  const { text: truncatedMd } = truncateText(markdown, 30000);
  const { text: truncatedText } = truncateText(textContent, 30000);

  return {
    title: title || ogTitle || h1Text,
    metaDescription: metaDescription || ogDescription,
    ogTitle,
    ogDescription,
    h1Text,
    markdown: truncatedMd,
    textContent: truncatedText,
    language,
    wordCount: textContent.split(/\s+/).length,
  };
}
