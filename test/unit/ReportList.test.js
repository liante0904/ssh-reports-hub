import React from 'react';
import { render } from '@testing-library/react';
import ReportList from '../../src/components/ReportList';

// react-router-dom 모킹
jest.mock('react-router-dom', () => ({
  useLocation: () => ({
    pathname: '/recent'
  })
}));

// react-infinite-scroll-component 모킹
jest.mock('react-infinite-scroll-component', () => {
  return function DummyInfiniteScroll({ children }) {
    return <div data-testid="infinite-scroll">{children}</div>;
  };
});

// context 모킹
jest.mock('../../src/context/useReport', () => ({
  useReport: () => ({
    searchQuery: { query: '', category: '' },
    sortBy: 'date',
    setSortBy: jest.fn(),
    telegramUser: null
  })
}));

// useReportFetch 모킹
const mockFetchReports = jest.fn();
let mockReportsData = {};
let mockIsLoading = false;
let mockHasMore = false;

jest.mock('../../src/hooks/useReportFetch', () => ({
  useReportFetch: () => ({
    reports: mockReportsData,
    isLoading: mockIsLoading,
    hasMore: mockHasMore,
    offset: 0,
    fetchReports: mockFetchReports
  })
}));

// constants/config 모킹 (import.meta.env 파싱 SyntaxError 원천 회피)
jest.mock('../../src/constants/config', () => ({
  CONFIG: {
    API: {
      BASE_URL: 'https://example.com',
      COMPANIES_URL: 'https://example.com/companies',
      BOARDS_URL: 'https://example.com/boards'
    },
    STORAGE_KEYS: {
      AUTH_TOKEN: 'auth_token',
      TELEGRAM_USER: 'telegram_user',
      THEME: 'theme'
    }
  }
}));

// constants/reportSections 모킹
jest.mock('../../src/constants/reportSections', () => ({
  getReportSectionByPath: () => ({
    title: '최신 리포트',
    description: '최신 증권사 분석 리포트입니다.'
  })
}));

// utils/reportLinks 및 reportNormalizer 모킹
jest.mock('../../src/utils/reportLinks', () => ({
  isDsReport: () => false,
  prefetchPdf: jest.fn()
}));

jest.mock('../../src/utils/reportNormalizer', () => ({
  normalizeReportItem: (item) => item
}));

// 하위 컴포넌트 전체 모킹 (CSS 파싱 에러 방지를 위한 격리 처리)
jest.mock('../../src/components/MenuSummary', () => {
  return function DummyMenuSummary() {
    return <div data-testid="menu-summary" />;
  };
});

jest.mock('../../src/components/ShareMenu', () => {
  return function DummyShareMenu() {
    return <div data-testid="share-menu" />;
  };
});

jest.mock('../../src/components/report/ReportGroup', () => {
  return function DummyReportGroup() {
    return <div data-testid="report-group" />;
  };
});

// CSS 파일 강제 모킹 (혹시 모를 CSS 로딩 에러 원천 차단)
jest.mock('../../src/components/ReportList.css', () => ({}));

// API request 모킹
jest.mock('../../src/utils/api', () => ({
  request: jest.fn(() => Promise.resolve({ items: [] }))
}));

describe('ReportList Component - Null Safety Refactoring Verification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReportsData = {};
    mockIsLoading = false;
    mockHasMore = false;
  });

  it('should render safely without crashing when reports is undefined or null', () => {
    // reports를 의도적으로 null로 설정하여 Null safety 방어 코드를 태웁니다.
    mockReportsData = null;
    mockIsLoading = false;

    const { container } = render(<ReportList onWriterClick={jest.fn()} />);

    // 크래시 없이 정상적으로 컨테이너 및 래퍼가 생성되었는지 확인
    const wrapper = container.querySelector('.report-list-wrapper');
    expect(wrapper).not.toBeNull();
  });

  it('should render safely when reports is a valid empty object', () => {
    mockReportsData = {};
    mockIsLoading = false;

    const { container } = render(<ReportList onWriterClick={jest.fn()} />);
    const wrapper = container.querySelector('.report-list-wrapper');
    expect(wrapper).not.toBeNull();
  });

  it('should show loading indicator safely during initial load when reports is null', () => {
    mockReportsData = null;
    mockIsLoading = true;

    const { container } = render(<ReportList onWriterClick={jest.fn()} />);
    
    // 로딩 문구가 정상 표시되는지 검증
    const loadingOverlay = container.querySelector('.loading-overlay');
    expect(loadingOverlay).not.toBeNull();
    expect(loadingOverlay.textContent).toBe('로딩 중...');
  });
});
