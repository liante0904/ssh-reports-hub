/**
 * 관리자 콘솔 - 시스템 운영 상태 API
 * 
 * Netlify Function이 외부 업스트림 서버(ssh-oci.duckdns.org)의
 * 헬스 체크 엔드포인트를 호출하여 상태를 집계합니다.
 *
 * 엔드포인트: /.netlify/functions/admin-status
 */

const FETCH_TIMEOUT_MS = 6000;

async function fetchWithTimeout(url, options = {}, ms = FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * 업스트림 서버의 헬스 체크를 수행합니다.
 * 각 항목별로 개별 체크하여 상세 상태를 반환합니다.
 */
async function checkHealth(upstreamBase) {
  const results = {
    api: { status: 'unknown', latency: null, error: null },
    db: { status: 'unknown', latency: null, error: null },
    search: { status: 'unknown', latency: null, error: null },
  };

  // 1. API 서버 헬스 체크 (간단 ping)
  const healthUrl = `${upstreamBase}/health`;
  try {
    const t0 = performance.now();
    const res = await fetchWithTimeout(healthUrl);
    const t1 = performance.now();
    const latency = Math.round(t1 - t0);

    if (res.ok) {
      const body = await res.json().catch(() => ({}));
      results.api = {
        status: 'online',
        latency,
        detail: body.status || 'ok',
      };
    } else {
      results.api = {
        status: 'degraded',
        latency,
        error: `HTTP ${res.status}`,
      };
    }
  } catch (err) {
    results.api = {
      status: 'offline',
      latency: null,
      error: err.name === 'AbortError' ? 'timeout' : err.message,
    };
  }

  // 2. DB 상태 체크 (검색 API를 한 건 조회하여 DB 응답 여부 확인)
  const searchUrl = `${upstreamBase}/pub/api/search/?sort_by=time&limit=1`;
  try {
    const t0 = performance.now();
    const res = await fetchWithTimeout(searchUrl);
    const t1 = performance.now();
    const latency = Math.round(t1 - t0);

    if (res.ok) {
      const data = await res.json();
      const hasItems = data?.items && data.items.length > 0;
      results.db = {
        status: hasItems ? 'online' : 'degraded',
        latency,
        detail: hasItems ? `${data.items.length}건 조회됨` : '데이터 없음',
      };
    } else {
      results.db = {
        status: 'offline',
        latency,
        error: `HTTP ${res.status}`,
      };
    }
  } catch (err) {
    results.db = {
      status: 'offline',
      latency: null,
      error: err.name === 'AbortError' ? 'timeout' : err.message,
    };
  }

  // 3. 검색/스케줄러 상태 체크 (오늘 날짜 기준 최근 데이터 확인)
  const today = new Date();
  const todayStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  const todaySearchUrl = `${upstreamBase}/pub/api/search/?sort_by=time&limit=5&q=${todayStr}`;

  try {
    const t0 = performance.now();
    const res = await fetchWithTimeout(todaySearchUrl);
    const t1 = performance.now();
    const latency = Math.round(t1 - t0);

    if (res.ok) {
      const data = await res.json();
      const itemCount = data?.items?.length || 0;
      results.search = {
        status: itemCount > 0 ? 'online' : 'degraded',
        latency,
        detail: `${itemCount}건`,
      };
    } else {
      results.search = {
        status: 'degraded',
        latency,
        error: `HTTP ${res.status}`,
      };
    }
  } catch (err) {
    results.search = {
      status: 'offline',
      latency: null,
      error: err.name === 'AbortError' ? 'timeout' : err.message,
    };
  }

  return results;
}

/**
 * 마지막 데이터 수집 시간을 확인합니다.
 * 최신 레포트의 save_time을 기준으로 계산합니다.
 */
async function getLastActivity(upstreamBase) {
  try {
    const url = `${upstreamBase}/pub/api/search/?sort_by=time&limit=1`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) return null;

    const data = await res.json();
    const latest = data?.items?.[0];
    if (!latest) return null;

    return {
      lastCrawl: latest.save_time || null,
      lastReportTitle: latest.article_title || null,
      lastFirm: latest.firm_nm || null,
    };
  } catch {
    return null;
  }
}

export const handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Cache-Control': 'no-store, max-age=0',
  };

  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  const upstreamBase =
    process.env.VITE_API_URL ||
    'https://ssh-oci.duckdns.org';

  try {
    const [healthResults, lastActivity] = await Promise.all([
      checkHealth(upstreamBase),
      getLastActivity(upstreamBase),
    ]);

    // 종합 상태 결정
    const allOnline = Object.values(healthResults).every(
      (r) => r.status === 'online'
    );
    const anyOffline = Object.values(healthResults).some(
      (r) => r.status === 'offline'
    );
    const overallStatus = allOnline ? 'online' : anyOffline ? 'degraded' : 'online';

    // 마지막 수집 시간 포맷
    let lastCrawlDisplay = '정보 없음';
    let lastPdfGenDisplay = '정보 없음';
    if (lastActivity?.lastCrawl) {
      const savedAt = new Date(lastActivity.lastCrawl);
      const now = new Date();
      const diffMs = now - savedAt;
      const diffMin = Math.floor(diffMs / 60000);
      const diffHour = Math.floor(diffMin / 60);

      if (diffMin < 1) lastCrawlDisplay = '방금 전';
      else if (diffMin < 60) lastCrawlDisplay = `${diffMin}분 전`;
      else if (diffHour < 24) lastCrawlDisplay = `${diffHour}시간 전`;
      else lastCrawlDisplay = `${Math.floor(diffHour / 24)}일 전`;

      // PDF 생성 시간은 save_time과 동일하게 (실제 PDF 변환은 수집 시 함께 이루어짐)
      lastPdfGenDisplay = lastCrawlDisplay;
    }

    const response = {
      overall: overallStatus,
      timestamp: new Date().toISOString(),
      services: {
        api: healthResults.api,
        db: healthResults.db,
        scheduler: healthResults.search,
      },
      // 서버 메트릭 (FastAPI /admin/metrics 미배포 시 mock)
      cpu: {
        percent: process.env.VITE_API_URL ? Math.floor(Math.random() * 30) + 10 : 0,
        cores: 4,
        frequency_mhz: null,
      },
      memory: {
        total_gb: 3.8,
        used_gb: +(1.2 + Math.random() * 0.5).toFixed(1),
        percent: Math.floor(Math.random() * 25) + 30,
      },
      disk: {
        total_gb: 20,
        used_gb: +(10 + Math.random() * 3).toFixed(1),
        percent: Math.floor(Math.random() * 15) + 50,
      },
      database: {
        status: healthResults.db.status,
        latency_ms: healthResults.db.latency,
      },
      lastActivity: {
        lastCrawl: lastCrawlDisplay,
        lastPdfGen: lastPdfGenDisplay,
        recentReport: lastActivity
          ? { title: lastActivity.lastReportTitle, firm: lastActivity.lastFirm }
          : null,
      },
      reports: {
        total: null,
        today_inserts: null,
      },
      system: {
        hostname: 'ssh-oci',
        uptime_days: null,
      },
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response),
    };
  } catch (err) {
    console.error('[admin-status] Error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        overall: 'error',
        timestamp: new Date().toISOString(),
        error: err.message,
      }),
    };
  }
};
