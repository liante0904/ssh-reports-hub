export const REPORT_SECTIONS = {
  fnguide: {
    key: 'fnguide',
    title: '종목요약',
    description: 'FnGuide에서 수집한 종목별 요약 리포트',
    path: '/fnguide',
  },
  recent: {
    key: 'recent',
    title: '최근 레포트',
    description: '실시간으로 수집되는 최신 증권사 리포트',
    path: '/recent',
  },
  industry: {
    key: 'industry',
    title: '산업레포트',
    description: '업종과 테마 흐름을 빠르게 확인하는 산업 리포트',
    path: '/industry',
  },
  global: {
    key: 'global',
    title: '글로벌',
    description: '해외 시장과 글로벌 기업 관련 최신 리포트',
    path: '/global',
  },
  favorites: {
    key: 'favorites',
    title: '즐겨찾기',
    description: '저장해 둔 관심 레포트를 모아 확인합니다',
    path: '/favorites',
  },
  aiSummary: {
    key: 'aiSummary',
    title: 'AI 요약',
    description: 'AI 요약이 생성된 레포트를 모아 확인합니다',
    path: '/ai-summary',
  },
  outlook: {
    key: 'outlook',
    title: '전망 레포트',
    description: '시장 전망과 연간 전망 관련 리포트를 모아 확인합니다',
    path: '/outlook',
  },
};

export const HOME_SECTIONS = [
  REPORT_SECTIONS.fnguide,
  REPORT_SECTIONS.recent,
  REPORT_SECTIONS.industry,
  REPORT_SECTIONS.global,
];

export function getReportSectionByPath(pathname) {
  if (pathname === '/fnguide') return REPORT_SECTIONS.fnguide;
  if (pathname === '/recent') return REPORT_SECTIONS.recent;
  if (pathname === '/industry') return REPORT_SECTIONS.industry;
  if (pathname === '/global') return REPORT_SECTIONS.global;
  if (pathname.includes('favorites')) return REPORT_SECTIONS.favorites;
  if (pathname.includes('ai-summary')) return REPORT_SECTIONS.aiSummary;
  if (pathname.includes('outlook')) return REPORT_SECTIONS.outlook;
  return null;
}
