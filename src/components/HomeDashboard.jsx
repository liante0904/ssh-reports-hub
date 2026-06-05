import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CONFIG } from '../constants/config';
import { HOME_SECTIONS } from '../constants/reportSections';
import { request } from '../utils/api';
import { normalizeReportItem } from '../utils/reportNormalizer';
import { getDirectUrl } from '../utils/reportLinks';
import './HomeDashboard.css';

const PREVIEW_LIMIT = 5;

function formatPreviewDate(rawDate) {
  if (!rawDate) return '';
  const value = String(rawDate);
  if (/^\d{8}$/.test(value)) {
    return `${value.slice(4, 6)}.${value.slice(6, 8)}`;
  }
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[2]}.${match[3]}` : value;
}

function normalizeFnGuideItem(item) {
  return {
    id: item.summary_id,
    title: item.report_title || '제목 없음',
    meta: [item.company_name, item.provider].filter(Boolean).join(' · '),
    date: formatPreviewDate(item.report_date),
  };
}

function normalizeReportPreview(item) {
  const report = normalizeReportItem(item);
  if (!report) return null;
  return {
    id: report.id,
    title: report.title,
    meta: [report.firm, report.writer].filter(Boolean).join(' · '),
    date: formatPreviewDate(report.date),
    rawReport: report,
  };
}

function HomeDashboard() {
  const navigate = useNavigate();
  const [sections, setSections] = useState(() => ({
    fnguide: { items: [], isLoading: true, error: '' },
    recent: { items: [], isLoading: true, error: '' },
    industry: { items: [], isLoading: true, error: '' },
    global: { items: [], isLoading: true, error: '' },
  }));

  useEffect(() => {
    const controller = new AbortController();

    const setSectionState = (key, nextState) => {
      setSections((prev) => ({
        ...prev,
        [key]: { ...prev[key], ...nextState },
      }));
    };

    const loadFnGuide = async () => {
      try {
        const data = await request(
          `${CONFIG.API.BASE_URL}/api/fnguide/report-summaries?limit=${PREVIEW_LIMIT}&offset=0`,
          { signal: controller.signal, logoutOn401: false }
        );
        setSectionState('fnguide', {
          items: Array.isArray(data) ? data.map(normalizeFnGuideItem) : [],
          isLoading: false,
          error: '',
        });
      } catch (error) {
        if (error.name === 'AbortError') return;
        setSectionState('fnguide', { items: [], isLoading: false, error: '종목요약을 불러오지 못했습니다.' });
      }
    };

    const loadRecent = async () => {
      try {
        const data = await request(
          `${CONFIG.API.REPORT_API_URL}/search?limit=${PREVIEW_LIMIT}&offset=0`,
          { signal: controller.signal }
        );
        setSectionState('recent', {
          items: Array.isArray(data?.items) ? data.items.map(normalizeReportPreview).filter(Boolean) : [],
          isLoading: false,
          error: '',
        });
      } catch (error) {
        if (error.name === 'AbortError') return;
        setSectionState('recent', { items: [], isLoading: false, error: '최근 레포트를 불러오지 못했습니다.' });
      }
    };

    const loadIndustry = async () => {
      try {
        const data = await request(
          `${CONFIG.API.REPORT_API_URL}/industry?limit=${PREVIEW_LIMIT}&offset=0`,
          { signal: controller.signal }
        );
        setSectionState('industry', {
          items: Array.isArray(data?.items) ? data.items.map(normalizeReportPreview).filter(Boolean) : [],
          isLoading: false,
          error: '',
        });
      } catch (error) {
        if (error.name === 'AbortError') return;
        setSectionState('industry', { items: [], isLoading: false, error: '산업레포트를 불러오지 못했습니다.' });
      }
    };

    const loadGlobal = async () => {
      try {
        const data = await request(
          `${CONFIG.API.REPORT_API_URL}/search?limit=${PREVIEW_LIMIT}&offset=0&mkt_tp=global`,
          { signal: controller.signal }
        );
        setSectionState('global', {
          items: Array.isArray(data?.items) ? data.items.map(normalizeReportPreview).filter(Boolean) : [],
          isLoading: false,
          error: '',
        });
      } catch (error) {
        if (error.name === 'AbortError') return;
        setSectionState('global', { items: [], isLoading: false, error: '글로벌 리포트를 불러오지 못했습니다.' });
      }
    };

    loadFnGuide();
    loadRecent();
    loadIndustry();
    loadGlobal();

    return () => controller.abort();
  }, []);

  return (
    <div className="home-dashboard">
      <section className="home-dashboard-header">
        <h1>리포트 홈</h1>
        <p>종목요약, 최근 레포트, 산업레포트, 글로벌 리포트를 먼저 확인하세요.</p>
      </section>

      <section className="home-section-grid" aria-label="주요 리포트 섹션">
        {HOME_SECTIONS.map((section) => (
          <article
            key={section.path}
            className={`home-section-card ${section.wide ? 'wide' : ''}`}
          >
            <div className="home-section-heading">
              <div>
                <h2>{section.title}</h2>
                <p>{section.description}</p>
              </div>
              <button type="button" onClick={() => navigate(section.path)}>
                더보기
              </button>
            </div>

            <div className="home-preview-list">
              {sections[section.key].isLoading ? (
                <div className="home-preview-state">불러오는 중...</div>
              ) : sections[section.key].error ? (
                <div className="home-preview-state">{sections[section.key].error}</div>
              ) : sections[section.key].items.length === 0 ? (
                <div className="home-preview-state">표시할 항목이 없습니다.</div>
              ) : (
                sections[section.key].items.map((item) => {
                  const isFnGuide = section.key === 'fnguide';
                  if (isFnGuide) {
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className="home-preview-row"
                        onClick={() => navigate(section.path)}
                      >
                        <span className="home-preview-main">
                          <span className="home-preview-title">{item.title}</span>
                          {item.meta && <span className="home-preview-meta">{item.meta}</span>}
                        </span>
                        {item.date && <span className="home-preview-date">{item.date}</span>}
                      </button>
                    );
                  }

                  const directUrl = getDirectUrl(item.rawReport);
                  return (
                    <a
                      key={item.id}
                      href={directUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="home-preview-row"
                    >
                      <span className="home-preview-main">
                        <span className="home-preview-title">{item.title}</span>
                        {item.meta && <span className="home-preview-meta">{item.meta}</span>}
                      </span>
                      {item.date && <span className="home-preview-date">{item.date}</span>}
                    </a>
                  );
                })
              )}
            </div>
          </article>
        ))}
      </section>

      <div className="home-secondary-actions">
        <button type="button" onClick={() => navigate('/recent')}>
          최신 레포트 전체 보기
        </button>
      </div>
    </div>
  );
}

export default HomeDashboard;
