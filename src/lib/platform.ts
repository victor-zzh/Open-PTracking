export type Platform =
  | 'xiaohongshu'
  | 'weixin'
  | 'twitter'
  | 'producthunt'
  | 'github'
  | 'news'
  | 'web'
  | 'unknown';

const PLATFORM_RULES: { platform: Platform; patterns: RegExp[] }[] = [
  {
    platform: 'xiaohongshu',
    patterns: [/xiaohongshu\.com/, /xhslink\.com/, /redbook\./],
  },
  {
    platform: 'weixin',
    patterns: [/mp\.weixin\.qq\.com/, /weixin\.qq\.com/],
  },
  {
    platform: 'twitter',
    patterns: [/twitter\.com/, /x\.com/, /t\.co/],
  },
  {
    platform: 'producthunt',
    patterns: [/producthunt\.com/],
  },
  {
    platform: 'github',
    patterns: [/github\.com/],
  },
  {
    platform: 'news',
    patterns: [
      /techcrunch\.com/,
      /theverge\.com/,
      /wired\.com/,
      /36kr\.com/,
      /geekpark\.net/,
      /jiqizhixin\.com/,
      /huxiu\.com/,
      /pingwest\.com/,
    ],
  },
];

const PLATFORM_LABELS: Record<Platform, string> = {
  xiaohongshu: '小红书',
  weixin: '公众号',
  twitter: 'Twitter',
  producthunt: 'Product Hunt',
  github: 'GitHub',
  news: 'News',
  web: 'Web',
  unknown: 'Web',
};

export function detectPlatform(url: string): { platform: Platform; label: string } {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();

    for (const rule of PLATFORM_RULES) {
      for (const pattern of rule.patterns) {
        if (pattern.test(hostname)) {
          return { platform: rule.platform, label: PLATFORM_LABELS[rule.platform] };
        }
      }
    }

    return { platform: 'web', label: 'Web' };
  } catch {
    return { platform: 'unknown', label: 'Web' };
  }
}

export function isProductPage(url: string): boolean {
  const platform = detectPlatform(url);
  // Social media and news platforms may reference products
  // We still analyze them but flag appropriately
  return platform.platform === 'web' || platform.platform === 'producthunt' || platform.platform === 'github';
}
