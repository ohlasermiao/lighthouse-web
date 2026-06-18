export type Lang = 'zh' | 'en';

export const langPrefix: Record<Lang, string> = { zh: '', en: '/en' };

export function getLangFromUrl(url: URL): Lang {
  const [, first] = url.pathname.split('/');
  if (first === 'en') return 'en';
  return 'zh';
}

/** 各语言已存在的路由（语言切换器只链接真实存在的页面，绝不产生死链） */
export const translatedRoutes: Record<string, Partial<Record<Lang, string>>> = {
  home:    { zh: '/',         en: '/en/' },
  about:   { zh: '/about/',   en: '/en/about/' },
  pricing: { zh: '/pricing/', en: '/en/pricing/' },
  apply:   { zh: '/apply/',   en: '/en/apply/' },
  contact: { zh: '/contact/', en: '/en/contact/' },
  inside:  { zh: '/inside/' },
  faq:     { zh: '/faq/' },
  news:    { zh: '/news/' },
  account: { zh: '/account/' },
  welcome: { zh: '/welcome/' },
};

export const ui = {
  zh: {
    'brand.tag': '全球华人生活社区',
    'nav.about': '关于',
    'nav.inside': '板块',
    'nav.pricing': '价格',
    'nav.faq': 'FAQ',
    'nav.news': '公告',
    'nav.login': '登录',
    'nav.apply': '申请加入',
    'nav.menu': '打开菜单',
    'footer.tagline': '面向全球华人的会员制生活交流社区。\n聊旅行、美食、见闻、宠物、玄学与日常。',
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
    'brand.tag': 'A community for Chinese speakers worldwide',
    'nav.about': 'About',
    'nav.inside': 'Channels',
    'nav.pricing': 'Pricing',
    'nav.faq': 'FAQ',
    'nav.news': 'News',
    'nav.login': 'Log in',
    'nav.apply': 'Apply to join',
    'nav.menu': 'Open menu',
    'footer.tagline': 'A membership community for Chinese speakers worldwide.\nTravel, food, daily news, pets, tarot and everyday life.',
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
  };
}
