import React from 'react';
import { render } from '@testing-library/react';
import ReportItem from '../../src/components/report/ReportItem';

// context 모킹
jest.mock('../../src/context/useReport', () => ({
  useReport: () => ({
    setViewerReport: jest.fn()
  })
}));

// utils 모킹
jest.mock('../../src/utils/reportLinks', () => ({
  getDirectUrl: jest.fn(() => 'https://example.com/direct'),
  prefetchPdf: jest.fn()
}));

// react-markdown 및 remark-gfm 모킹 (ESM 파싱 방지 및 가볍게 처리)
jest.mock('react-markdown', () => {
  return function DummyMarkdown({ children }) {
    return <div data-testid="markdown">{children}</div>;
  };
});
jest.mock('remark-gfm', () => ({}));

describe('ReportItem Component', () => {
  const mockReport = {
    id: 1,
    title: '테스트 리포트',
    writer: '홍길동',
    gemini_summary: 'AI 핵심 요약 내용',
    fnguide_summary: {
      summary_text: 'FnGuide 요약 내용입니다. 레이아웃 오버플로우 방지 처리가 되었는지 검증합니다.',
      opinion: 'Buy',
      target_price: '100,000'
    },
    firm: '현대차증권',
    pdf_url: 'https://example.com/test.pdf',
    tags: ['반도체'],
    stock_names: ['삼성전자'],
    sector: 'IT'
  };

  it('should render FnGuide summary with break styles to prevent layout overflow', () => {
    // ReportItem 렌더링
    // isSummaryExpanded를 true로 설정하여 요약 영역이 즉시 보이게 함
    const { container } = render(
      <ReportItem
        report={mockReport}
        isFavorite={false}
        isSummaryExpanded={true}
        onToggleFavorite={jest.fn()}
        onToggleSummary={jest.fn()}
        onOpenShareMenu={jest.fn()}
        showFirmTag={true}
      />
    );

    // FnGuide 요약 영역의 summary-text 요소 선택
    const fnguideSummaryContainer = container.querySelector('.fnguide-summary-section .summary-text');
    expect(fnguideSummaryContainer).not.toBeNull();

    // 인라인 스타일에 wordBreak: 'break-all' 및 overflowWrap: 'break-word'가 올바르게 적용되어 있는지 검증
    const style = fnguideSummaryContainer.style;
    expect(style.wordBreak).toBe('break-all');
    expect(style.overflowWrap).toBe('break-word');
    expect(fnguideSummaryContainer.textContent).toContain('FnGuide 요약 내용입니다.');
  });
});
