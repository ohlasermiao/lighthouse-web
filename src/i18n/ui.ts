export type Lang = 'zh' | 'en' | 'ja';

export const langPrefix: Record<Lang, string> = { zh: '', en: '/en', ja: '/ja' };

export function getLangFromUrl(url: URL): Lang {
  const [, first] = url.pathname.split('/');
  if (first === 'en' || first === 'ja') return first;
  return 'zh';
}

/** 各语言已存在的路由（语言切换器只链接真实存在的页面，绝不产生死链） */
export const translatedRoutes: Record<string, Partial<Record<Lang, string>>> = {
  home:    { zh: '/',         en: '/en/',         ja: '/ja/' },
  about:   { zh: '/about/',   en: '/en/about/',   ja: '/ja/about/' },
  pricing: { zh: '/pricing/', en: '/en/pricing/', ja: '/ja/pricing/' },
  apply:   { zh: '/apply/',   en: '/en/apply/',   ja: '/ja/apply/' },
  contact: { zh: '/contact/', en: '/en/contact/', ja: '/ja/contact/' },
  inside:  { zh: '/inside/' },
  faq:     { zh: '/faq/' },
  news:    { zh: '/news/' },
  account: { zh: '/account/' },
  welcome: { zh: '/welcome/' },
};

export const ui = {
  zh: {
    'brand.tag': '全球华人青年社区',
    'nav.about': '关于',
    'nav.inside': '板块',
    'nav.pricing': '价格',
    'nav.faq': 'FAQ',
    'nav.news': '公告',
    'nav.login': '登录',
    'nav.apply': '申请加入',
    'nav.menu': '打开菜单',
    'footer.tagline': '在时代的海上，和同航的人一起看见光。\n全球华人青年的会员制交流社区。',
    'footer.community': '社区',
    'footer.support': '支持',
    'footer.account': '会员中心 / 登录',
    'footer.contact': '联系我们',
    'footer.news': '公告 / 社区状态',
    'footer.operator': '運営会社',
    'legal.tos': '服务条款',
    'legal.guidelines': '社区公约',
    'legal.privacy': '隐私政策',
    'legal.tokushoho': '特定商取引法に基づく表記',
    'skip': '跳到主要内容',
  },
  en: {
    'brand.tag': 'A community for global Chinese youth',
    'nav.about': 'About',
    'nav.inside': 'Channels',
    'nav.pricing': 'Pricing',
    'nav.faq': 'FAQ',
    'nav.news': 'News',
    'nav.login': 'Log in',
    'nav.apply': 'Apply to join',
    'nav.menu': 'Open menu',
    'footer.tagline': 'Finding the light together, on the sea of our times.\nA membership community for global Chinese youth.',
    'footer.community': 'Community',
    'footer.support': 'Support',
    'footer.account': 'Member portal / Log in',
    'footer.contact': 'Contact us',
    'footer.news': 'News / Status',
    'footer.operator': 'Operated by',
    'legal.tos': 'Terms of Service (zh)',
    'legal.guidelines': 'Community Guidelines (zh)',
    'legal.privacy': 'Privacy Policy (zh)',
    'legal.tokushoho': 'Legal Disclosure (ja)',
    'skip': 'Skip to main content',
  },
  ja: {
    'brand.tag': '中国語圏の若者のためのコミュニティ',
    'nav.about': 'About',
    'nav.inside': 'ボード',
    'nav.pricing': '料金',
    'nav.faq': 'FAQ',
    'nav.news': 'お知らせ',
    'nav.login': 'ログイン',
    'nav.apply': '入会申請',
    'nav.menu': 'メニューを開く',
    'footer.tagline': '時代の海の上で、同じ航路の仲間と光を見つける。\n中国語圏の若者のための会員制コミュニティ。',
    'footer.community': 'コミュニティ',
    'footer.support': 'サポート',
    'footer.account': '会員センター / ログイン',
    'footer.contact': 'お問い合わせ',
    'footer.news': 'お知らせ',
    'footer.operator': '運営会社',
    'legal.tos': '利用規約（中文）',
    'legal.guidelines': 'コミュニティガイドライン（中文）',
    'legal.privacy': 'プライバシーポリシー（中文）',
    'legal.tokushoho': '特定商取引法に基づく表記',
    'skip': '本文へスキップ',
  },
} as const;

export function useT(lang: Lang) {
  return (key: keyof (typeof ui)['zh']): string => ui[lang][key] ?? ui.zh[key];
}

/** 当前页在各语言的对应 URL（无对应译文时返回该语言首页） */
export function altUrls(routeKey: string | undefined): Record<Lang, string> {
  const r = routeKey ? translatedRoutes[routeKey] : undefined;
  return {
    zh: r?.zh ?? '/',
    en: r?.en ?? '/en/',
    ja: r?.ja ?? '/ja/',
  };
}
