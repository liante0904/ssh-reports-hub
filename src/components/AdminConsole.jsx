import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReport } from '../context/useReport';
import { FIRM_NAMES } from '../constants/firms';
import { CONFIG } from '../constants/config';
import './AdminConsole.css';

/* ===== Reprocess Log ===== */
const REPROCESS_TASKS = [
  { id: 'today', label: '오늘건 재처리' },
  { id: 'failed', label: '실패건 재처리' },
  { id: 'all-firms', label: '전체 증권사 재수집' },
  { id: 'pdf-regen', label: 'PDF 재생성' },
];

/* ===== Log Content Colorizer ===== */

const LOG_LEVEL_COLORS = {
  ERROR: '#ff3b30',
  WARNING: '#ff9500',
  INFO: '#34c759',
  SUCCESS: '#30d158',
  DEBUG: '#007aff',
};

/** URL 정규식 */
const URL_RE = /https?:\/\/[^\s'")>]+/g;

/**
 * 텍스트 조각 안에 URL이 있으면 <a>로 감싼 배열로 쪼갠다.
 */
function linkify(text, lineIdx, offset) {
  const pieces = [];
  let last = 0;
  let m;
  // eslint-disable-next-line no-cond-assign
  while ((m = URL_RE.exec(text)) !== null) {
    if (m.index > last) pieces.push(text.slice(last, m.index));
    pieces.push(
      <a key={`u${lineIdx}_${offset + m.index}`}
         href={m[0]}
         target="_blank"
         rel="noopener noreferrer"
         className="log-url">
        {m[0]}
      </a>
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) pieces.push(text.slice(last));
  return pieces.length > 0 ? pieces : text;
}

function LogContent({ text }) {
  const lines = text.split('\n');
  // 정규식: "2026-05-08 00:02:31 | DEBUG    | ..."
  // 캡처: (앞부분) (LEVEL) (뒷부분)
  const LEVEL_RE = /^(\S+\s+\S+\s+\|\s+)(\w+)(\s+\|.*)$/;

  return (
    <pre className="log-viewer-pre">
      {lines.map((line, i) => {
        const m = line.match(LEVEL_RE);
        if (m) {
          const level = m[2];
          const color = LOG_LEVEL_COLORS[level];
          return (
            <div key={i} className="log-line">
              {linkify(m[1], i, 0)}
              {color ? (
                <span style={{ color, fontWeight: 600 }}>{level}</span>
              ) : (
                level
              )}
              {linkify(m[3], i, m[1].length + level.length)}
            </div>
          );
        }
        // 레벨 패턴 없으면 일반 줄 (URL만 링크)
        return (
          <div key={i} className="log-line">
            {linkify(line, i, 0)}
          </div>
        );
      })}
    </pre>
  );
}

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

  const [firmRecords, setFirmRecords] = useState([]);
  const [archiveHistory, setArchiveHistory] = useState([]);
  const [summary, setSummary] = useState({
    totalArchived: 0, todayCount: 0,
    activeFirms: 0, totalFirms: FIRM_NAMES.length,
    pendingReprocess: 0,
  });
  const [systemStatus, setSystemStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusError, setStatusError] = useState(null);
  const [processing, setProcessing] = useState({});
  const [logLines, setLogLines] = useState([]);
  const [refreshIntervalMs, setRefreshIntervalMs] = useState(60000);
  const [manualRefreshKey, setManualRefreshKey] = useState(0);
  const [firmHealth, setFirmHealth] = useState(null);

  const REFRESH_OPTIONS = [
    { label: '30초', value: 30000 },
    { label: '1분', value: 60000 },
    { label: '3분', value: 180000 },
    { label: '5분', value: 300000 },
  ];

  // FastAPI `/admin/metrics` 조회
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

        // 증권사별 실적
        const byFirm = (data.reports?.by_firm_today || []).map(f => ({
          name: f.firm,
          todayCount: f.count,
        }));
        setFirmRecords(byFirm);

        // 아카이브 히스토리
        const hist = (data.reports?.archive_history || []).map(h => ({
          label: h.label,
          count: h.count,
        }));
        setArchiveHistory(hist);

        // Firm Health
        try {
          const healthRes = await fetch(`${baseUrl}/admin/firm-health`, {
            headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
          });
          if (healthRes.ok) setFirmHealth(await healthRes.json());
        } catch (_) {}

        // 요약
        const totalArchived = hist.reduce((sum, d) => sum + d.count, 0);
        const todayCount = hist.length > 0 ? hist[hist.length - 1].count : 0;
        setSummary({
          totalArchived,
          todayCount,
          activeFirms: data.reports?.active_firms_today ?? 0,
          totalFirms: FIRM_NAMES.length,
          pendingReprocess: 0,
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
    const interval = setInterval(fetchMetrics, refreshIntervalMs);
    return () => { cancelled = true; clearInterval(interval); };
  }, [refreshIntervalMs, manualRefreshKey]);

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

      {/* ===== Refresh Controls ===== */}
      <div className="refresh-bar">
        <button
          className="refresh-btn"
          onClick={() => setManualRefreshKey(k => k + 1)}
          disabled={statusLoading}
          title="수동 갱신"
        >
          ↻ {statusLoading ? '갱신 중...' : '새로고침'}
        </button>
        <span className="refresh-label">자동 갱신:</span>
        <div className="refresh-interval-group">
          {REFRESH_OPTIONS.map(opt => (
            <button
              key={opt.value}
              className={`refresh-interval-btn ${refreshIntervalMs === opt.value ? 'active' : ''}`}
              onClick={() => setRefreshIntervalMs(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

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

      {/* ===== Firm Health ===== */}
      <div className="section-card">
        <div className="section-title">
          🩺 증권사 건강검진 (마지막 레포트)
          {firmHealth && (
            <span className="badge" style={{ marginLeft: 8 }}>
              {firmHealth.stale_count > 0 ? `🛑 ${firmHealth.stale_count} STALE` : ''}
              {firmHealth.warn_count > 0 ? ` ⚠️ ${firmHealth.warn_count} WARN` : ''}
              {firmHealth.stale_count === 0 && firmHealth.warn_count === 0 ? '✅ All OK' : ''}
            </span>
          )}
        </div>
        {firmHealth ? (
          <div className="firm-health-table">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #333', color: '#888' }}>
                  <th style={{ textAlign: 'left', padding: '4px 8px' }}>증권사</th>
                  <th style={{ textAlign: 'right', padding: '4px 8px' }}>전체</th>
                  <th style={{ textAlign: 'right', padding: '4px 8px' }}>마지막일자</th>
                  <th style={{ textAlign: 'right', padding: '4px 8px' }}>Days</th>
                  <th style={{ textAlign: 'center', padding: '4px 8px' }}>상태</th>
                </tr>
              </thead>
              <tbody>
                {firmHealth.firms.map((f) => {
                  const statusColor = f.status === 'STALE' ? '#ff3b30' : f.status === 'WARN' ? '#ff9500' : f.status === 'FUTURE' ? '#007aff' : '#34c759';
                  const statusBg = f.status === 'STALE' ? 'rgba(255,59,48,0.12)' : f.status === 'WARN' ? 'rgba(255,149,0,0.12)' : 'rgba(52,199,89,0.08)';
                  return (
                    <tr key={f.sec_firm_order} style={{ borderBottom: '1px solid #1a1a2e', background: f.status !== 'OK' ? statusBg : 'transparent' }}>
                      <td style={{ padding: '3px 8px', fontWeight: f.status === 'STALE' ? 600 : 400 }}>{f.firm_nm}</td>
                      <td style={{ textAlign: 'right', padding: '3px 8px', color: '#888' }}>{f.total.toLocaleString()}</td>
                      <td style={{ textAlign: 'right', padding: '3px 8px', fontFamily: 'monospace' }}>{f.last_reg_dt || '-'}</td>
                      <td style={{ textAlign: 'right', padding: '3px 8px', color: statusColor, fontWeight: 600 }}>{f.days_ago >= 0 ? `${f.days_ago}d` : '?'}</td>
                      <td style={{ textAlign: 'center', padding: '3px 8px' }}>
                        <span style={{ color: statusColor, fontWeight: 600, fontSize: '11px' }}>{f.status}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: 16, color: '#888', textAlign: 'center' }}>로딩 중...</div>
        )}
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
            <div className="log-viewer-content" ref={logViewerRef}>
              {logViewer.content
                ? <LogContent text={logViewer.content} />
                : '(빈 파일)'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AdminConsole;
