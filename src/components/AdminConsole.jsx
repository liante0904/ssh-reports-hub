import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReport } from '../context/useReport';
import { FIRM_NAMES } from '../constants/firms';
import { CONFIG } from '../constants/config';
import './AdminConsole.css';

/* ===== Mock Data Generators (나머지 섹션용) ===== */

function generateMockFirmRecords() {
  return FIRM_NAMES.map((name) => ({
    name,
    todayCount: Math.floor(Math.random() * 40) + 1,
  })).sort((a, b) => b.todayCount - a.todayCount);
}

function generateMockArchiveHistory() {
  const days = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const label = `${d.getMonth() + 1}/${d.getDate()}`;
    days.push({
      label,
      count: Math.floor(Math.random() * 150) + 30,
    });
  }
  return days;
}

function generateMockSummary(archiveHistory) {
  const totalArchived = archiveHistory.reduce((sum, d) => sum + d.count, 0);
  const todayCount = archiveHistory[archiveHistory.length - 1]?.count || 0;
  return {
    totalArchived,
    todayCount,
    activeFirms: Math.floor(Math.random() * 3) + 26, // 26~28
    totalFirms: FIRM_NAMES.length,
    pendingReprocess: Math.floor(Math.random() * 5),
  };
}

/* ===== Reprocess Log ===== */
const REPROCESS_TASKS = [
  { id: 'today', label: '오늘건 재처리' },
  { id: 'failed', label: '실패건 재처리' },
  { id: 'all-firms', label: '전체 증권사 재수집' },
  { id: 'pdf-regen', label: 'PDF 재생성' },
];

/* ===== Main Component ===== */

function AdminConsole() {
  const navigate = useNavigate();
  const { telegramUser } = useReport();

  // Redirect if not admin
  useEffect(() => {
    if (!telegramUser?.is_admin) {
      navigate('/', { replace: true });
    }
  }, [telegramUser, navigate]);

  const [firmRecords] = useState(generateMockFirmRecords);
  const [archiveHistory] = useState(generateMockArchiveHistory);
  const [summary] = useState(() => generateMockSummary(archiveHistory));
  const [systemStatus, setSystemStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusError, setStatusError] = useState(null);
  const [processing, setProcessing] = useState({});
  const [logLines, setLogLines] = useState([]);

  // FastAPI `/admin/metrics` 리얼데이터 조회 (서버 배포 완료)
  useEffect(() => {
    let cancelled = false;
    const fetchMetrics = async () => {
      setStatusLoading(true);
      setStatusError(null);
      try {
        const authToken = localStorage.getItem('auth_token');
        const baseUrl = 'https://ssh-oci.duckdns.org';
        const res = await fetch(`${baseUrl}/admin/metrics`, {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        });
        if (res.status === 401) throw new Error('인증 필요 - 관리자 로그인 확인');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;

        let lastCrawlDisplay = '-', lastPdfGenDisplay = '-';
        if (data.last_activity?.last_save_time) {
          const savedAt = new Date(data.last_activity.last_save_time);
          const now = new Date();
          const diffMin = Math.floor((now - savedAt) / 60000);
          if (diffMin < 1) lastCrawlDisplay = '방금 전';
          else if (diffMin < 60) lastCrawlDisplay = `${diffMin}분 전`;
          else lastCrawlDisplay = `${Math.floor(diffMin / 60)}시간 전`;
          lastPdfGenDisplay = lastCrawlDisplay;
        }

        setSystemStatus({
          overall: data.overall || 'unknown',
          db: data.database?.status || 'unknown',
          api: data.overall === 'online' ? 'online' : 'degraded',
          cpu: data.cpu?.percent ?? '-',
          cpuCores: data.cpu?.cores ?? 0,
          cpuFreq: data.cpu?.frequency_mhz,
          memoryPercent: data.memory?.percent ?? 0,
          memoryUsed: data.memory?.used_gb ?? 0,
          memoryTotal: data.memory?.total_gb ?? 0,
          diskPercent: data.disk?.percent ?? 0,
          diskUsed: data.disk?.used_gb ?? 0,
          diskTotal: data.disk?.total_gb ?? 0,
          lastCrawl: lastCrawlDisplay,
          lastPdfGen: lastPdfGenDisplay,
          totalReports: data.reports?.total?.toLocaleString() ?? '-',
          todayReports: data.reports?.today_inserts ?? 0,
          uptimeDays: data.system?.uptime_days ?? 0,
        });
      } catch (err) {
        if (!cancelled) {
          setStatusError(err.message);
          setSystemStatus({
            overall: 'degraded', db: 'unknown', api: 'unknown',
            cpu: 0, cpuCores: 0, cpuFreq: null,
            memoryPercent: 0, memoryUsed: 0, memoryTotal: 0,
            diskPercent: 0, diskUsed: 0, diskTotal: 0,
            lastCrawl: err.message === '인증 필요 - 관리자 로그인 확인' ? '(관리자 로그인 필요)' : '(연결 실패)',
            lastPdfGen: '-', totalReports: '-', todayReports: 0, uptimeDays: 0,
          });
        }
      } finally {
        if (!cancelled) setStatusLoading(false);
      }
    };
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 60000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const maxCount = Math.max(...firmRecords.map((f) => f.todayCount), 1);

  const addLog = useCallback((msg) => {
    const now = new Date();
    const ts = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    setLogLines((prev) => [...prev, `[${ts}] ${msg}`]);
  }, []);

  const handleReprocess = useCallback(
    async (taskId, taskLabel) => {
      if (processing[taskId]) return;
      setProcessing((prev) => ({ ...prev, [taskId]: true }));
      addLog(`▶ ${taskLabel} 시작...`);

      // Simulate async reprocess
      const steps = [
        { delay: 600, msg: '  작업 큐에 등록됨' },
        { delay: 1200, msg: '  데이터 수집 시작...' },
        { delay: 2000, msg: `  ${Math.floor(Math.random() * 30) + 10}건 처리 완료` },
        { delay: 800, msg: '  PDF 변환 중...' },
        { delay: 1000, msg: `  ✅ ${taskLabel} 완료` },
      ];

      for (const step of steps) {
        await new Promise((r) => setTimeout(r, step.delay));
        addLog(step.msg);
      }

      setProcessing((prev) => ({ ...prev, [taskId]: false }));
    },
    [processing, addLog]
  );

  const clearLog = useCallback(() => {
    setLogLines([]);
  }, []);

  /* ===== Log Browser (서버 로그 파일 탐색/보기) ===== */
  const API_BASE = CONFIG.API.BASE_URL;
  const authToken = localStorage.getItem('auth_token');
  const authHeaders = React.useMemo(
    () => (authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    [authToken]
  );

  const [logBrowser, setLogBrowser] = useState({
    entries: [],
    currentPath: null,
    loading: false,
    error: null,
  });
  const [logViewer, setLogViewer] = useState({
    file: null,
    content: '',
    loading: false,
    error: null,
  });
  const logViewerRef = useRef(null);

  const fetchLogDir = useCallback(async (path) => {
    setLogBrowser((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const params = path ? `?path=${encodeURIComponent(path)}` : '';
      const res = await fetch(`${API_BASE}/admin/logs${params}`, {
        headers: authHeaders,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setLogBrowser({
        entries: data.entries || [],
        currentPath: data.current_path || null,
        loading: false,
        error: null,
      });
    } catch (err) {
      setLogBrowser((prev) => ({ ...prev, loading: false, error: err.message }));
    }
  }, [API_BASE, authHeaders]);

  const fetchLogFile = useCallback(async (filePath, opts = {}) => {
    const { tail = false, lines = 500 } = opts;
    setLogViewer({ file: filePath, content: '', loading: true, error: null });
    try {
      const params = new URLSearchParams({
        file: filePath,
        lines: String(lines),
        tail: String(tail),
      });
      const res = await fetch(`${API_BASE}/admin/logs/view?${params}`, {
        headers: authHeaders,
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setLogViewer({
        file: filePath,
        content: data.content || '',
        loading: false,
        error: null,
      });
      // 자동 스크롤 (tail 모드에서 bottom)
      setTimeout(() => {
        if (logViewerRef.current) {
          logViewerRef.current.scrollTop = logViewerRef.current.scrollHeight;
        }
      }, 50);
    } catch (err) {
      setLogViewer((prev) => ({ ...prev, loading: false, error: err.message }));
    }
  }, [API_BASE, authHeaders]);

  const openLogDir = useCallback((path) => {
    setLogViewer({ file: null, content: '', loading: false, error: null });
    fetchLogDir(path);
  }, [fetchLogDir]);

  const goLogRoot = useCallback(() => {
    setLogViewer({ file: null, content: '', loading: false, error: null });
    fetchLogDir(null);
  }, [fetchLogDir]);

  // 최초 마운트 시 로그 디렉토리 로드
  useEffect(() => {
    if (telegramUser?.is_admin) {
      fetchLogDir(null);
    }
  }, [telegramUser?.is_admin, fetchLogDir]);

  if (!telegramUser?.is_admin) {
    return null;
  }

  const statusColor = (val) => {
    if (val === 'online') return 'online';
    if (val === 'offline') return 'offline';
    return 'partial';
  };

  return (
    <div className="admin-console container">
      <h1>🛠️ 관리자 콘솔</h1>
      <p className="subtitle">
        {telegramUser.first_name || telegramUser.username} 님, 환영합니다 ·{' '}
        {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
      </p>

      {/* ===== Summary Cards ===== */}
      <div className="summary-row">
        <div className="summary-card">
          <div className="card-icon">📄</div>
          <div className="card-value">{summary.totalArchived.toLocaleString()}</div>
          <div className="card-label">최근 7일 아카이브</div>
        </div>
        <div className="summary-card">
          <div className="card-icon">📥</div>
          <div className="card-value">{summary.todayCount.toLocaleString()}</div>
          <div className="card-label">오늘 Insert</div>
        </div>
        <div className="summary-card">
          <div className="card-icon">🏦</div>
          <div className="card-value">{summary.activeFirms}</div>
          <div className="card-label">활성 증권사 / {summary.totalFirms}</div>
        </div>
        <div className="summary-card">
          <div className="card-icon">⏳</div>
          <div className="card-value">{summary.pendingReprocess}</div>
          <div className="card-label">재처리 대기</div>
        </div>
      </div>

      {/* ===== System Status (맨 위) ===== */}
      <div className="section-card">
        <div className="section-title">
          ⚙️ 시스템 운영 상태
          {statusLoading && <span className="badge">갱신 중...</span>}
          {statusError && <span className="badge" style={{ background: '#ff3b30' }}>오류</span>}
        </div>
        {systemStatus ? (
          <div className="status-grid">
            <div className="status-item">
              <span className="status-label">DB 연결</span>
              <span className={`status-value ${statusColor(systemStatus.db)}`}>
                <span className={`status-dot ${statusColor(systemStatus.db)}`} /> {systemStatus.db === 'online' ? 'Online' : 'Offline'}
              </span>
            </div>
            <div className="status-item">
              <span className="status-label">API 서버</span>
              <span className={`status-value ${statusColor(systemStatus.api)}`}>
                <span className={`status-dot ${statusColor(systemStatus.api)}`} /> {systemStatus.api === 'online' ? 'Online' : 'Offline'}
              </span>
            </div>
            <div className="status-item">
              <span className="status-label">CPU</span>
              <span className="status-value">{systemStatus.cpu}% {systemStatus.cpuFreq ? `(${systemStatus.cpuFreq}MHz)` : ''}</span>
            </div>
            <div className="status-item">
              <span className="status-label">RAM</span>
              <span className="status-value">{systemStatus.memoryPercent}% ({systemStatus.memoryUsed}GB / {systemStatus.memoryTotal}GB)</span>
            </div>
            <div className="status-item">
              <span className="status-label">디스크</span>
              <span className="status-value">{systemStatus.diskPercent}% ({systemStatus.diskUsed}GB / {systemStatus.diskTotal}GB)</span>
            </div>
            <div className="status-item">
              <span className="status-label">서버 가동시간</span>
              <span className="status-value">{systemStatus.uptimeDays}일</span>
            </div>
            <div className="status-item">
              <span className="status-label">마지막 수집</span>
              <span className="status-value">{systemStatus.lastCrawl}</span>
            </div>
            <div className="status-item">
              <span className="status-label">오늘 Insert</span>
              <span className="status-value">{systemStatus.todayReports}건</span>
            </div>
          </div>
        ) : (
          <div className="status-grid">
            <div className="status-item">
              <span className="status-label">상태 로딩 중...</span>
              <span className="status-value">⏳</span>
            </div>
          </div>
        )}
      </div>

      {/* ===== PDF Archive History (Bar Chart) ===== */}
      <div className="section-card">
        <div className="section-title">
          📊 PDF 아카이브 현황
          <span className="badge">최근 7일</span>
        </div>
        <div className="archive-history">
          {archiveHistory.map((day) => {
            const maxVal = Math.max(...archiveHistory.map((d) => d.count), 1);
            const heightPct = Math.max((day.count / maxVal) * 100, 4);
            return (
              <div className="history-bar" key={day.label}>
                <div className="bar" style={{ height: `${heightPct}%` }} title={`${day.count}건`} />
                <div className="bar-label">{day.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ===== Securities Firm Records ===== */}
      <div className="section-card">
        <div className="section-title">
          🏦 증권사별 오늘 Insert 건수
          <span className="badge">{new Date().toLocaleDateString('ko-KR')}</span>
        </div>
        <div className="firm-list">
          {firmRecords.map((firm) => (
            <div className="firm-row" key={firm.name}>
              <span className="firm-name">{firm.name}</span>
              <div className="firm-bar-bg">
                <div
                  className="firm-bar-fill"
                  style={{ width: `${(firm.todayCount / maxCount) * 100}%` }}
                />
              </div>
              <span className="firm-count">{firm.todayCount}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ===== Reprocess ===== */}
      <div className="section-card reprocess-section">
        <div className="section-title">
          🔄 재처리
        </div>
        <div className="reprocess-grid">
          {REPROCESS_TASKS.map((task) => (
            <button
              key={task.id}
              className={`reprocess-btn ${processing[task.id] ? 'processing' : ''}`}
              disabled={processing[task.id]}
              onClick={() => handleReprocess(task.id, task.label)}
            >
              {processing[task.id] ? '⏳ 처리 중...' : task.label}
            </button>
          ))}
        </div>

        {logLines.length > 0 && (
          <div className="reprocess-log">
            {logLines.map((line, i) => (
              <div className="log-line" key={i}>{line}</div>
            ))}
            <button
              onClick={clearLog}
              style={{
                marginTop: 8,
                padding: '4px 12px',
                background: 'transparent',
                border: '1px solid var(--primary-color, #007aff)',
                color: 'var(--primary-color, #007aff)',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: '0.85em',
              }}
            >
              로그 지우기
            </button>
          </div>
        )}
      </div>

      {/* ===== Log Browser (서버 로그 파일 탐색/보기) ===== */}
      <div className="section-card log-browser-section">
        <div className="section-title">
          📂 서버 로그 파일
          {logBrowser.currentPath && (
            <span className="badge" style={{ cursor: 'pointer' }} onClick={goLogRoot}>
              ← 루트
            </span>
          )}
          <button
            className="refresh-btn"
            onClick={() => fetchLogDir(logBrowser.currentPath)}
            disabled={logBrowser.loading}
            title="새로고침"
          >
            ↻
          </button>
        </div>

        {/* 에러 */}
        {logBrowser.error && (
          <div className="log-browser-error">
            로그 목록 로딩 실패: {logBrowser.error}
          </div>
        )}

        {/* 파일 목록 */}
        {logBrowser.loading ? (
          <div className="log-browser-loading">⏳ 로그 목록 로딩 중...</div>
        ) : logBrowser.entries.length === 0 && !logBrowser.error ? (
          <div className="log-browser-empty">로그 디렉토리가 없습니다.</div>
        ) : (
          <div className="log-browser-list">
            {logBrowser.entries.map((entry, i) => (
              <div
                key={i}
                className={`log-entry ${entry.type === 'directory' ? 'log-entry-dir' : ''} ${entry.archived ? 'log-entry-archived' : ''}`}
                onClick={() => {
                  if (entry.type === 'directory') {
                    openLogDir(entry.full_path);
                  } else if (!entry.archived) {
                    fetchLogFile(entry.full_path, { tail: true });
                  }
                }}
              >
                <span className="log-entry-icon">
                  {entry.type === 'directory' ? '📁' : entry.archived ? '📦' : '📄'}
                </span>
                <span className="log-entry-name">{entry.name}</span>
                <span className="log-entry-meta">
                  {entry.description && (
                    <span className="log-entry-desc">{entry.description}</span>
                  )}
                  {entry.size && <span className="log-entry-size">{entry.size}</span>}
                  {entry.modified && <span className="log-entry-modified">{entry.modified}</span>}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ===== Log Viewer (파일 내용 보기) ===== */}
      {logViewer.file && (
        <div className="section-card log-viewer-section">
          <div className="section-title">
            <span className="log-viewer-title" onClick={goLogRoot} style={{ cursor: 'pointer' }}>
              📄 {logViewer.file.split('/').pop()}
            </span>
            <span className="badge">tail 500</span>
            <button
              className="refresh-btn"
              onClick={() => fetchLogFile(logViewer.file, { tail: true })}
              disabled={logViewer.loading}
              title="새로고침"
            >
              ↻
            </button>
            <button
              className="close-btn"
              onClick={() => setLogViewer({ file: null, content: '', loading: false, error: null })}
              title="닫기"
            >
              ✕
            </button>
          </div>

          {logViewer.error && (
            <div className="log-browser-error">
              로그 읽기 실패: {logViewer.error}
            </div>
          )}

          {logViewer.loading ? (
            <div className="log-browser-loading">⏳ 로그 내용 로딩 중...</div>
          ) : (
            <pre className="log-viewer-content" ref={logViewerRef}>
              {logViewer.content || '(빈 파일)'}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

export default AdminConsole;
