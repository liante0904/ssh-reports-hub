/**
 * API 통합 테스트 - 업스트림 서버 엔드포인트 검증
 *
 * 테스트 대상:
 *   - /health
 *   - /external/api/search/
 *   - /external/api/companies
 *   - /external/api/boards
 *   - /external/auth/telegram
 *   - /api/fnguide/report-summaries
 *   - /keywords, /keywords/sync
 *   - /favorites
 *   - /admin/metrics
 *   - /external/api/reports/notifications, /external/api/reports/send-history
 *
 * 사용법:
 *   node test/integration/api.test.js
 *
 * 환경변수:
 *   VITE_API_URL - 업스트림 서버 주소 (기본값: https://ssh-oci.duckdns.org)
 */

const BASE_URL = (process.env.VITE_API_URL || 'https://ssh-oci.duckdns.org').replace(/\/$/, '');

let passed = 0;
let failed = 0;
let skipped = 0;

function assert(condition, label, detail = '') {
  if (condition) {
    console.log(`  ✅ PASS: ${label}${detail ? ` (${detail})` : ''}`);
    passed++;
  } else {
    console.log(`  ❌ FAIL: ${label}${detail ? ` (${detail})` : ''}`);
    failed++;
  }
}

function skip(label, reason = '') {
  console.log(`  ⏭️ SKIP: ${label}${reason ? ` (${reason})` : ''}`);
  skipped++;
}

async function assertHttpOk(url, label, options = {}) {
  const timeoutMs = options.timeout || 10000;
  const method = options.method || 'GET';
  const body = options.body || undefined;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const fetchOptions = {
      method,
      signal: controller.signal,
      headers: options.headers || {},
    };
    if (body) {
      fetchOptions.body = body;
      fetchOptions.headers['Content-Type'] = 'application/json';
    }
    const res = await fetch(url, fetchOptions);
    clearTimeout(timeout);
    return { res, ok: res.ok, status: res.status };
  } catch (err) {
    return { res: null, ok: false, status: 0, error: err.message };
  }
}

async function assertHttp200(url, label, options = {}) {
  const { res, ok, status, error } = await assertHttpOk(url, label, options);
  if (ok) {
    console.log(`  ✅ PASS: ${label} (HTTP ${status})`);
    passed++;
    return res;
  } else {
    console.log(`  ❌ FAIL: ${label} (HTTP ${status || error})`);
    failed++;
    return null;
  }
}

async function runTests() {
  console.log('\n════════════════════════════════════════════');
  console.log('  API 통합 테스트');
  console.log(`  대상 서버: ${BASE_URL}`);
  console.log('════════════════════════════════════════════\n');

  // ────────────────────────────────────────────
  // Section 1: 기본 헬스 체크
  // ────────────────────────────────────────────
  console.log('─── [Section 1] 기본 인프라 ───');

  const healthRes = await assertHttp200(`${BASE_URL}/health`, '/health (서버 상태)');

  if (healthRes) {
    try {
      const body = await healthRes.json();
      assert(body.status === 'ok', 'health body.status === "ok"', JSON.stringify(body));
    } catch {
      skip('health 응답 JSON 파싱');
    }
  }

  // ────────────────────────────────────────────
  // Section 2.1: Industry API
  // ────────────────────────────────────────────
  console.log('\n─── [Section 2.1] Industry API ───');

  const industryRes = await assertHttp200(
    `${BASE_URL}/external/api/industry?limit=5&offset=0`,
    'GET /external/api/industry (산업 리포트 5건)'
  );

  if (industryRes) {
    try {
      const data = await industryRes.json();
      assert(Array.isArray(data.items), 'industry 응답: items는 배열', `length=${data.items?.length || 0}`);
      assert(typeof data.hasMore === 'boolean', 'industry 응답: hasMore는 boolean');
      assert(typeof data.count === 'number', 'industry 응답: count는 number', `count=${data.count}`);

      if (data.items?.length > 0) {
        const item = data.items[0];
        assert(typeof item.report_id === 'number', 'industry 아이템: report_id 있음');
        assert(typeof item.firm_nm === 'string', 'industry 아이템: firm_nm 있음');
        assert(typeof item.article_title === 'string', 'industry 아이템: article_title 있음');

        // page_count 검증: 있으면 10 이상이어야 함
        const archive = item.pdf_archive;
        if (archive && archive.page_count !== null && archive.page_count !== undefined) {
          assert(archive.page_count >= 10,
            'industry page_count >= 10', `page_count=${archive.page_count}`);
        }
        // page_count가 없는 리포트는 통과 (필터링 안 함)
        if (!archive || archive.page_count == null) {
          console.log(`  ℹ️ INFO: page_count 정보 없는 리포트 통과 (report_id=${item.report_id})`);
        }
      }
    } catch (e) {
      console.log(`  ❌ FAIL: industry 응답 파싱 실패 (${e.message})`);
      failed++;
    }
  }

  // ────────────────────────────────────────────
  // Section 2.2: FnGuide Summary API
  // ────────────────────────────────────────────
  console.log('\n─── [Section 2.2] FnGuide Summary API ───');

  const fnguideRes = await assertHttpOk(
    `${BASE_URL}/api/fnguide/report-summaries?limit=3&offset=0`,
    'GET /api/fnguide/report-summaries (종목요약 3건)'
  );

  assert(fnguideRes.status === 200 || fnguideRes.status === 401,
    '/api/fnguide/report-summaries 응답이 200 또는 401', `HTTP ${fnguideRes.status}`);

  if (fnguideRes.res && fnguideRes.status === 200) {
    try {
      const data = await fnguideRes.res.json();
      assert(Array.isArray(data), 'fnguide report-summaries 응답: 배열', `length=${data.length}`);
      if (data.length > 0) {
        const item = data[0];
        assert(item.summary_id !== undefined, 'fnguide 아이템: summary_id 있음');
        assert(typeof item.report_title === 'string', 'fnguide 아이템: report_title 있음');
        // pdf_url 필드 존재 검증 (PDF 보기 버튼용)
        const hasPdfUrl = item.pdf_url !== undefined;
        assert(hasPdfUrl, 'fnguide 아이템: pdf_url 필드 있음');
        if (item.pdf_url) {
          assert(typeof item.pdf_url === 'string', 'fnguide 아이템: pdf_url이 문자열');
        }
      }
    } catch (e) {
      console.log(`  ❌ FAIL: fnguide report-summaries 응답 파싱 실패 (${e.message})`);
      failed++;
    }
  }

  // ────────────────────────────────────────────
  // Section 2.3: LLM Setting (Public) API
  // ────────────────────────────────────────────
  console.log('\n─── [Section 2.3] LLM Setting (Public) API ───');

  const llmSettingCheck = await assertHttpOk(
    `${BASE_URL}/external/api/reports/llm-setting`,
    'GET /external/api/reports/llm-setting (LLM 요약 설정)'
  );

  if (llmSettingCheck.status === 404) {
    skip('GET /external/api/reports/llm-setting', '서버가 아직 신규 API 배포 전 상태입니다.');
  } else {
    assert(llmSettingCheck.status === 200, 'GET /external/api/reports/llm-setting 응답 성공', `HTTP ${llmSettingCheck.status}`);
    if (llmSettingCheck.res && llmSettingCheck.status === 200) {
      try {
        const data = await llmSettingCheck.res.json();
        assert(typeof data.visibility === 'string', 'llm-setting 응답: visibility 문자열 존재', `visibility=${data.visibility}`);
        assert(['admin', 'telegram'].includes(data.visibility), 'llm-setting 응답: visibility 값 범위 확인');
      } catch (e) {
        console.log(`  ❌ FAIL: llm-setting 응답 파싱 실패 (${e.message})`);
        failed++;
      }
    }
  }

  // ────────────────────────────────────────────
  // Section 2.4: AI Summary Notifications API
  // ────────────────────────────────────────────
  console.log('\n─── [Section 2.4] AI Summary Notifications API ───');

  const notificationsCheck = await assertHttpOk(
    `${BASE_URL}/external/api/reports/notifications?limit=5`,
    'GET /external/api/reports/notifications (알림 목록)'
  );

  if (notificationsCheck.status === 404) {
    skip('GET /external/api/reports/notifications', '서버가 아직 신규 API 배포 전 상태입니다.');
  } else {
    assert(notificationsCheck.status === 200 || notificationsCheck.status === 401, 'GET /external/api/reports/notifications 응답 상태 확인', `HTTP ${notificationsCheck.status}`);
    if (notificationsCheck.res && notificationsCheck.status === 200) {
      try {
        const data = await notificationsCheck.res.json();
        assert(Array.isArray(data), 'notifications 응답: 배열 형태 확인', `length=${data.length}`);
        if (data.length > 0) {
          const item = data[0];
          assert(typeof item.id === 'number', 'notification 아이템: id는 숫자');
          assert(typeof item.report_id === 'number', 'notification 아이템: report_id는 숫자');
          assert(typeof item.message === 'string', 'notification 아이템: message는 문자열');
        }
      } catch (e) {
        console.log(`  ❌ FAIL: notifications 응답 파싱 실패 (${e.message})`);
        failed++;
      }
    }
  }


  // ────────────────────────────────────────────
  // Section 2.4b: Telegram Send History API
  // ────────────────────────────────────────────
  console.log('\n─── [Section 2.4b] Telegram Send History API ───');

  const sendHistoryCheck = await assertHttpOk(
    `${BASE_URL}/external/api/reports/send-history?limit=5`,
    'GET /external/api/reports/send-history (통합 알림 내역)'
  );

  if (sendHistoryCheck.status === 404) {
    skip('GET /external/api/reports/send-history', '서버가 아직 신규 API 배포 전 상태입니다.');
  } else {
    assert(sendHistoryCheck.status === 200 || sendHistoryCheck.status === 401, 'GET /external/api/reports/send-history 응답 상태 확인', `HTTP ${sendHistoryCheck.status}`);
    if (sendHistoryCheck.res && sendHistoryCheck.status === 200) {
      try {
        const data = await sendHistoryCheck.res.json();
        assert(Array.isArray(data), 'send-history 응답: 배열 형태 확인', `length=${data.length}`);
        if (data.length > 0) {
          const item = data[0];
          assert(typeof item.id === 'number', 'send-history 아이템: id는 숫자');
          assert(typeof item.report_id === 'number', 'send-history 아이템: report_id는 숫자');
          assert(item.sent_at || item.created_at, 'send-history 아이템: 발송 시각 존재');
        }
      } catch (e) {
        console.log(`  ❌ FAIL: send-history 응답 파싱 실패 (${e.message})`);
        failed++;
      }
    }
  }


  // ────────────────────────────────────────────
  // Section 2: Public Search API (existing)
  // ────────────────────────────────────────────
  console.log('\n─── [Section 2] Public API ───');

  const searchRes = await assertHttp200(
    `${BASE_URL}/external/api/search/?sort_by=time&limit=3`,
    'GET /external/api/search/ (최신 3건)'
  );

  if (searchRes) {
    try {
      const data = await searchRes.json();
      assert(Array.isArray(data.items), 'search 응답: items는 배열', `length=${data.items?.length || 0}`);
      assert(typeof data.hasMore === 'boolean', 'search 응답: hasMore는 boolean');
      assert(typeof data.count === 'number', 'search 응답: count는 number', `count=${data.count}`);

      if (data.items?.length > 0) {
        const item = data.items[0];
        assert(typeof item.report_id === 'number', '아이템에 report_id 있음');
        assert(typeof item.firm_nm === 'string', '아이템에 firm_nm 있음');
        assert(typeof item.article_title === 'string', '아이템에 article_title 있음');
        assert(typeof item.reg_dt === 'string', '아이템에 reg_dt 있음');
        assert(typeof item.save_time === 'string', '아이템에 save_time 있음');
      }
    } catch (e) {
      console.log(`  ❌ FAIL: search 응답 파싱 실패 (${e.message})`);
      failed++;
    }
  }

  // Companies API
  const companiesRes = await assertHttp200(
    `${BASE_URL}/external/api/companies`,
    'GET /external/api/companies'
  );

  if (companiesRes) {
    try {
      const companies = await companiesRes.json();
      assert(Array.isArray(companies), 'companies 응답: 배열', `length=${companies.length}`);
      if (companies.length > 0) {
        assert(typeof companies[0].name === 'string', 'company.name 있음');
        assert(typeof companies[0].report_count === 'number', 'company.report_count 있음');
      }

      const knownFirms = ['LS증권', '삼성증권', '키움증권', '한국투자증권', '대신증권'];
      const firmNames = companies.map(c => c.name);
      const matched = knownFirms.filter(f => firmNames.includes(f));
      assert(matched.length >= 3, `알려진 증권사명 ${matched.length}개 매칭`, matched.join(', '));
    } catch (e) {
      console.log(`  ❌ FAIL: companies 응답 파싱 실패 (${e.message})`);
      failed++;
    }
  }

  // Boards API (company 파라미터 필수)
  const boardsRes = await assertHttp200(
    `${BASE_URL}/external/api/boards?company=0`,
    'GET /external/api/boards?company=0'
  );

  if (boardsRes) {
    try {
      const boards = await boardsRes.json();
      assert(Array.isArray(boards), 'boards 응답: 배열', `length=${boards.length}`);
    } catch (e) {
      console.log(`  ❌ FAIL: boards 응답 파싱 실패 (${e.message})`);
      failed++;
    }
  }

  // ────────────────────────────────────────────
  // Section 2.5: 인증 필요 API (토큰 없으면 401 → 존재 확인으로 충분)
  // ────────────────────────────────────────────
  console.log('\n─── [Section 2.5] 인증 필요 API ───');

  {
    const telegramAuthRes = await assertHttpOk(`${BASE_URL}/external/auth/telegram`, 'POST /external/auth/telegram',
      { method: 'POST', body: JSON.stringify({}) });
    assert([400, 401, 422].includes(telegramAuthRes.status),
      '/external/auth/telegram 더미 요청 응답이 400/401/422', `HTTP ${telegramAuthRes.status}`);
  }
  {
    const kwRes = await assertHttpOk(`${BASE_URL}/keywords`, 'GET /keywords');
    assert(kwRes.status === 200 || kwRes.status === 401,
      '/keywords 응답이 200 또는 401', `HTTP ${kwRes.status}`);
  }
  {
    const syncRes = await assertHttpOk(`${BASE_URL}/keywords/sync`, 'POST /keywords/sync',
      { method: 'POST', body: JSON.stringify({ keywords: [] }) });
    assert(syncRes.status === 200 || syncRes.status === 401 || syncRes.status === 405,
      '/keywords/sync 응답이 200/401/405', `HTTP ${syncRes.status}`);
  }
  {
    const favRes = await assertHttpOk(`${BASE_URL}/favorites`, 'GET /favorites');
    assert(favRes.status === 200 || favRes.status === 401,
      '/favorites 응답이 200 또는 401', `HTTP ${favRes.status}`);
  }
  {
    const favIdRes = await assertHttpOk(`${BASE_URL}/favorites/1`, 'POST /favorites/{id}',
      { method: 'POST' });
    assert(favIdRes.status === 200 || favIdRes.status === 401 || favIdRes.status === 404,
      'POST /favorites/{id} 응답이 200/401/404', `HTTP ${favIdRes.status}`);
  }
  {
    const metricRes = await assertHttpOk(`${BASE_URL}/admin/metrics`, 'GET /admin/metrics');
    assert(metricRes.status === 200 || metricRes.status === 401,
      '/admin/metrics 응답이 200 또는 401', `HTTP ${metricRes.status}`);
  }
  {
    const dsSummarizeRes = await assertHttpOk(`${BASE_URL}/admin/reports/1/summarize?engine=deepseek`, 'POST /admin/reports/{id}/summarize?engine=deepseek (미인증)',
      { method: 'POST' });
    assert([401, 403, 404].includes(dsSummarizeRes.status),
      '/admin/reports/{id}/summarize?engine=deepseek 미인증 401/403/404 통제 검증', `HTTP ${dsSummarizeRes.status}`);
  }
  {
    const agSummarizeRes = await assertHttpOk(`${BASE_URL}/admin/reports/1/summarize?engine=ag`, 'POST /admin/reports/{id}/summarize?engine=ag (미인증)',
      { method: 'POST' });
    assert([401, 403, 404].includes(agSummarizeRes.status),
      '/admin/reports/{id}/summarize?engine=ag 미인증 401/403/404 통제 검증', `HTTP ${agSummarizeRes.status}`);
  }
  {
    const adminLlmGetRes = await assertHttpOk(`${BASE_URL}/admin/llm-setting`, 'GET /admin/llm-setting (미인증)');
    if (adminLlmGetRes.status === 404) {
      skip('/admin/llm-setting GET 미인증 401/403 통제 검증', '서버가 아직 신규 API 배포 전 상태입니다.');
    } else {
      assert([401, 403].includes(adminLlmGetRes.status),
        '/admin/llm-setting GET 미인증 401/403 통제 검증', `HTTP ${adminLlmGetRes.status}`);
    }
  }
  {
    const adminLlmPostRes = await assertHttpOk(`${BASE_URL}/admin/llm-setting`, 'POST /admin/llm-setting (미인증)',
      { method: 'POST', body: JSON.stringify({ visibility: 'telegram' }) });
    if (adminLlmPostRes.status === 404) {
      skip('/admin/llm-setting POST 미인증 401/403 통제 검증', '서버가 아직 신규 API 배포 전 상태입니다.');
    } else {
      assert([401, 403].includes(adminLlmPostRes.status),
        '/admin/llm-setting POST 미인증 401/403 통제 검증', `HTTP ${adminLlmPostRes.status}`);
    }
  }


  // ────────────────────────────────────────────
  // Section 3: 응답 시간 성능
  // ────────────────────────────────────────────
  console.log('\n─── [Section 3] 응답 시간 ───');

  const endpoints = [
    { name: '/health', url: `${BASE_URL}/health` },
    { name: '/external/api/search/', url: `${BASE_URL}/external/api/search/?limit=5` },
    { name: '/external/api/companies', url: `${BASE_URL}/external/api/companies` },
  ];

  for (const ep of endpoints) {
    const start = Date.now();
    try {
      const res = await fetch(ep.url, { signal: AbortSignal.timeout(10000) });
      const elapsed = Date.now() - start;
      if (res.ok) {
        const perfOk = elapsed < 3000;
        if (perfOk) {
          console.log(`  ✅ PASS: ${ep.name} 응답시간 ${elapsed}ms (< 3000ms)`);
          passed++;
        } else {
          console.log(`  ⚠️ WARN: ${ep.name} 응답시간 ${elapsed}ms (>= 3000ms)`);
          skipped++;
        }
      } else {
        console.log(`  ❌ FAIL: ${ep.name} 응답 실패 HTTP ${res.status} (${elapsed}ms)`);
        failed++;
      }
    } catch {
      const elapsed = Date.now() - start;
      console.log(`  ❌ FAIL: ${ep.name} 타임아웃/실패 (${elapsed}ms)`);
      failed++;
    }
  }

  // ─── 결과 요약 ───
  console.log('\n════════════════════════════════════════════');
  console.log(`  결과: ${passed} 통과, ${failed} 실패, ${skipped} 건너뜀 (총 ${passed + failed + skipped}개)`);
  console.log('════════════════════════════════════════════\n');

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error('테스트 실행 중 오류:', err);
  process.exit(1);
});
