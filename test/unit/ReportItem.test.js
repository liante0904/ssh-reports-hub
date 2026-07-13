import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
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
    pdf_file_url: 'https://example.com/test.pdf',
    tags: ['반도체'],
    stock_names: ['삼성전자'],
    stock_tickers: ['005930'],
    sector: 'IT',
    target_price: 100000,
    rating: 'BUY',
    revision_type: 'UPGRADE',
    report_type: 'COMPANY'
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

  it('should show direct investment signals when the API provides them', () => {
    const { container } = render(
      <ReportItem report={mockReport} onToggleSummary={jest.fn()} />
    );

    const signals = container.querySelector('.report-signals');
    expect(signals).not.toBeNull();
    expect(signals.textContent).toContain('의견 BUY');
    expect(signals.textContent).toContain('목표가 100,000');
    expect(signals.textContent).toContain('UPGRADE');
    expect(signals.textContent).toContain('005930');
  });

  it('should render re-summarize options for admin when summary already exists', () => {
    const mockOnTriggerSummary = jest.fn();
    const { container } = render(
      <ReportItem
        report={mockReport}
        isFavorite={false}
        isSummaryExpanded={true}
        onToggleFavorite={jest.fn()}
        onToggleSummary={jest.fn()}
        onOpenShareMenu={jest.fn()}
        showFirmTag={true}
        isAdmin={true}
        onTriggerSummary={mockOnTriggerSummary}
      />
    );

    // 이미 요약이 존재함 (mockReport.gemini_summary가 있으므로)
    // admin-summary-confirm 영역 확인
    const adminSummaryConfirm = container.querySelector('.admin-summary-confirm');
    expect(adminSummaryConfirm).not.toBeNull();

    // DeepSeek 및 Antigravity 재처리 버튼 존재 여부 확인
    const deepseekBtn = container.querySelector('.deepseek-btn');
    const antigravityBtn = container.querySelector('.antigravity-btn');
    expect(deepseekBtn).not.toBeNull();
    expect(antigravityBtn).not.toBeNull();

    // Antigravity 재처리 버튼 클릭
    act(() => {
      fireEvent.click(antigravityBtn);
    });

    // ⚠️ 이미 요약이 존재합니다. 재처리하시겠습니까? 툴팁이 렌더링되는지 검증
    const tooltip = container.querySelector('.re-summarize-tooltip');
    expect(tooltip).not.toBeNull();
    expect(tooltip.textContent).toContain('이미 요약이 존재합니다. 재처리하시겠습니까?');

    // 확인 버튼(✓) 클릭
    const confirmYesBtn = container.querySelector('.confirm-yes');
    expect(confirmYesBtn).not.toBeNull();
    act(() => {
      fireEvent.click(confirmYesBtn);
    });

    // onTriggerSummary가 올바른 파라미터(id=1, engine='ag', force=true)로 호출되었는지 검증
    expect(mockOnTriggerSummary).toHaveBeenCalledWith(
      1,
      'ag',
      true,
      expect.objectContaining({ id: 1 })
    );

    // 토스트 UI가 노출되었는지 검증
    const toastContainer = container.querySelector('.toast-container');
    expect(toastContainer).not.toBeNull();
    expect(toastContainer.textContent).toContain('기존 요약이 존재하여 AI 재처리 요약을 요청합니다...');
  });
});
