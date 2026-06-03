import { useNavigate } from 'react-router-dom';
import './HomeDashboard.css';

const HOME_SECTIONS = [
  {
    title: '종목요약',
    description: 'FnGuide에서 수집한 종목별 요약 리포트',
    path: '/fnguide',
    action: '종목요약 보기',
  },
  {
    title: '산업레포트',
    description: '업종과 테마 흐름을 빠르게 확인하는 산업 리포트',
    path: '/industry',
    action: '산업레포트 보기',
  },
  {
    title: '글로벌',
    description: '해외 시장과 글로벌 기업 관련 최신 리포트',
    path: '/global',
    action: '글로벌 보기',
    wide: true,
  },
];

function HomeDashboard() {
  const navigate = useNavigate();

  return (
    <div className="home-dashboard">
      <section className="home-dashboard-header">
        <h1>리포트 홈</h1>
        <p>종목요약, 산업레포트, 글로벌 리포트를 먼저 확인하세요.</p>
      </section>

      <section className="home-section-grid" aria-label="주요 리포트 섹션">
        {HOME_SECTIONS.map((section) => (
          <article
            key={section.path}
            className={`home-section-card ${section.wide ? 'wide' : ''}`}
          >
            <div>
              <h2>{section.title}</h2>
              <p>{section.description}</p>
            </div>
            <button type="button" onClick={() => navigate(section.path)}>
              {section.action}
            </button>
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
