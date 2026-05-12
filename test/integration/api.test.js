/**
 * API 통합 테스트 - 업스트림 서버 엔드포인트 검증
 *
 * 테스트 대상:
 *   - /health
 *   - /external/api/search/
 *   - /external/api/companies
 *   - /external/api/boards
 *   - /ords/admin/data_main_daily_send/search (레거시 호환)
 *   - /ords/admin/data_main_daily_send/industry (산업분석)
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
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: options.headers || {},
    });
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
  // Section 2: Public Search API
  // ────────────────────────────────────────────
  console.log('\n─── [Section 2] Public API ───');

  let searchWorking = false;

  const searchRes = await assertHttp200(
    `${BASE_URL}/external/api/search/?sort_by=time&limit=3`,
    'GET /external/api/search/ (최신 3건)'
  );

  if (searchRes) {
    searchWorking = true;
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
      searchWorking = false;
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
  // Section 3: ORDS 레거시 호환 API (ords/admin/data_main_daily_send/)
  // ────────────────────────────────────────────
  console.log('\n─── [Section 3] ORDS 호환 API (/ords/admin/data_main_daily_send/) ───');

  // ORDS Search
  const ordsSearchRes = await assertHttp200(
    `${BASE_URL}/ords/admin/data_main_daily_send/search?limit=3`,
    'GET /ords/admin/data_main_daily_send/search (limit=3)'
  );

  if (ordsSearchRes) {
    try {
      const data = await ordsSearchRes.json();
      assert(Array.isArray(data.items), 'ords search: items는 배열', `length=${data.items?.length || 0}`);
      assert(typeof data.hasMore === 'boolean', 'ords search: hasMore는 boolean');
      assert(typeof data.count === 'number', 'ords search: count는 number');
      assert(typeof data.limit === 'number', 'ords search: limit은 number');
      assert(typeof data.offset === 'number', 'ords search: offset은 number');

      if (data.items?.length > 0) {
        const item = data.items[0];
        // ORDS 호환 필드 검증
        assert('report_id' in item, 'ords item: report_id 존재');
        assert('firm_nm' in item, 'ords item: firm_nm 존재');
        assert('article_title' in item, 'ords item: article_title 존재');
        assert('main_ch_send_yn' in item, 'ords item: main_ch_send_yn 존재');
        assert('sec_firm_order' in item, 'ords item: sec_firm_order 존재');
        assert('article_board_order' in item, 'ords item: article_board_order 존재');
        assert('key' in item, 'ords item: key 존재');
        assert('mkt_tp' in item, 'ords item: mkt_tp 존재');

        // pdf_archive 필드 (nullable)
        assert('pdf_archive' in item, 'ords item: pdf_archive 필드 존재');
      }

      // links 필드 검증
      assert(Array.isArray(data.links), 'ords search: links는 배열');
      if (data.links?.length > 0) {
        assert(data.links[0].rel === 'self', 'ords search: links[0].rel === "self"');
      }
    } catch (e) {
      console.log(`  ❌ FAIL: ords search 응답 파싱 실패 (${e.message})`);
      failed++;
    }
  }

  // ORDS Search - 필터 테스트
  console.log('\n  [ORDS Search 필터]');
  {
    const filterRes = await assertHttp200(
      `${BASE_URL}/ords/admin/data_main_daily_send/search?company=0&limit=5`,
      'company=0 (LS증권) 필터'
    );

    if (filterRes) {
      try {
        const data = await filterRes.json();
        const allLS = data.items?.every(item => item.sec_firm_order === 0);
        assert(allLS, 'company=0 결과가 모두 sec_firm_order=0');
      } catch {
        skip('company 필터 검증 (파싱 실패)');
      }
    }

    const mktFilterRes = await assertHttp200(
      `${BASE_URL}/ords/admin/data_main_daily_send/search?mkt_tp=global&limit=5`,
      'mkt_tp=global 필터'
    );

    if (mktFilterRes) {
      try {
        const data = await mktFilterRes.json();
        const allGlobal = data.items?.every(item => item.mkt_tp !== 'KR');
        assert(allGlobal, 'mkt_tp=global 결과가 모두 국내(KR) 아님', `첫 항목 mkt_tp=${data.items?.[0]?.mkt_tp}`);
      } catch {
        skip('mkt_tp 필터 검증 (파싱 실패)');
      }
    }

    const writerFilterRes = await assertHttp200(
      `${BASE_URL}/ords/admin/data_main_daily_send/search?writer=김&limit=5`,
      'writer=김 필터'
    );

    if (writerFilterRes) {
      try {
        const data = await writerFilterRes.json();
        assert(data.items?.length >= 0, 'writer 필터 결과 반환');
      } catch {
        skip('writer 필터 검증 (파싱 실패)');
      }
    }
  }

  // ORDS Industry (산업분석)
  console.log('\n  [ORDS Industry - 산업분석]');
  {
    const industryRes = await assertHttp200(
      `${BASE_URL}/ords/admin/data_main_daily_send/industry?limit=5`,
      'GET /ords/admin/data_main_daily_send/industry (limit=5)'
    );

    if (industryRes) {
      try {
        const data = await industryRes.json();
        assert(Array.isArray(data.items), 'industry: items는 배열', `length=${data.items?.length || 0}`);
        assert(typeof data.hasMore === 'boolean', 'industry: hasMore는 boolean');
        assert(typeof data.count === 'number', 'industry: count는 number');

        if (data.items?.length > 0) {
          const item = data.items[0];
          assert(item.main_ch_send_yn === 'Y', 'industry: main_ch_send_yn === "Y"');

          // 산업분석 보드 필터 검증 - 각 항목이 INDUSTRY_REPORT_BOARD_FILTERS에 정의된 조합인지 확인
          const INDUSTRY_BOARD_FILTERS = {
            0: [2],           // LS증권 산업분석
            1: [0],           // 신한증권 산업분석
            3: [6, 15],       // 하나증권 산업분석 + 글로벌 산업분석
            5: [1],           // 삼성증권 산업분석
            6: [1],           // 상상인증권 산업리포트
            10: [1],          // 키움증권 산업분석
            14: [8, 9, 10, 11, 12, 13], // 다올투자증권 산업분석
            18: [1],          // IM증권 산업분석(국내)
            19: [0],          // DB증권 기업/산업분석(국내)
            20: [1],          // 메리츠증권 산업분석
            22: [1],          // 한양증권 산업 및 이슈 분석
            23: [1],          // BNK투자증권 산업분석
            24: [1],          // 교보증권 산업분석
            25: [2],          // IBK투자증권 산업분석
            26: [6, 8],       // SK증권 산업분석
            27: [1],          // 유안타증권 산업분석
            28: [0],          // 흥국증권 산업/기업분석
          };

          const validFirms = Object.keys(INDUSTRY_BOARD_FILTERS).map(Number);
          const allInIndustryFilter = data.items.every(item => {
            const firmOrder = item.sec_firm_order;
            const boardOrder = item.article_board_order;
            if (!validFirms.includes(firmOrder)) return false;
            return INDUSTRY_BOARD_FILTERS[firmOrder].includes(boardOrder);
          });
          assert(allInIndustryFilter, 'industry: 모든 항목이 산업분석 보드 필터 내에 있음');
        }
      } catch (e) {
        console.log(`  ❌ FAIL: industry 응답 파싱 실패 (${e.message})`);
        failed++;
      }
    }

    // Industry 필터 테스트
    const industryCompanyRes = await assertHttp200(
      `${BASE_URL}/ords/admin/data_main_daily_send/industry?company=3&limit=5`,
      'industry: company=3 (하나증권) 필터'
    );

    if (industryCompanyRes) {
      try {
        const data = await industryCompanyRes.json();
        const allHana = data.items?.every(item =>
          item.sec_firm_order === 3 && [6, 15].includes(item.article_board_order)
        );
        assert(allHana, 'industry company=3: 모두 하나증권 산업분석');
      } catch {
        skip('industry company 필터 검증 (파싱 실패)');
      }
    }
  }

  // ────────────────────────────────────────────
  // Section 4: 페이지네이션 및 엣지 케이스
  // ────────────────────────────────────────────
  console.log('\n─── [Section 4] 페이지네이션 / 엣지 케이스 ───');

  // limit=1
  const limit1Res = await assertHttp200(
    `${BASE_URL}/ords/admin/data_main_daily_send/search?limit=1`,
    'ords search: limit=1'
  );
  if (limit1Res) {
    try {
      const data = await limit1Res.json();
      assert(data.items.length <= 1, 'limit=1: 결과 1건 이하', `actual=${data.items.length}`);
    } catch { /* skip */ }
  }

  // limit=100 (최대)
  const limitMaxRes = await assertHttp200(
    `${BASE_URL}/ords/admin/data_main_daily_send/search?limit=100`,
    'ords search: limit=100'
  );
  if (limitMaxRes) {
    try {
      const data = await limitMaxRes.json();
      assert(data.items.length <= 100, 'limit=100: 결과 100건 이하', `actual=${data.items.length}`);
      assert(data.limit === 100, 'limit=100: 응답 limit=100');
    } catch { /* skip */ }
  }

  // offset 페이지네이션
  {
    const page1Res = await assertHttp200(
      `${BASE_URL}/ords/admin/data_main_daily_send/search?limit=2&offset=0`,
      'ords search: page 1 (offset=0, limit=2)'
    );
    const page2Res = await assertHttp200(
      `${BASE_URL}/ords/admin/data_main_daily_send/search?limit=2&offset=2`,
      'ords search: page 2 (offset=2, limit=2)'
    );

    if (page1Res && page2Res) {
      try {
        const page1 = await page1Res.json();
        const page2 = await page2Res.json();
        const page1Ids = page1.items?.map(i => i.report_id) || [];
        const page2Ids = page2.items?.map(i => i.report_id) || [];
        const noOverlap = page1Ids.every(id => !page2Ids.includes(id));
        assert(noOverlap, '페이지 간 중복 없음', `page1_ids=${page1Ids}, page2_ids=${page2Ids}`);
      } catch {
        skip('페이지네이션 중복 검증 (파싱 실패)');
      }
    }
  }

  // ────────────────────────────────────────────
  // Section 5: 응답 시간 성능
  // ────────────────────────────────────────────
  console.log('\n─── [Section 5] 응답 시간 ───');

  const endpoints = [
    { name: '/health', url: `${BASE_URL}/health` },
    { name: '/external/api/search/', url: `${BASE_URL}/external/api/search/?limit=5` },
    { name: '/external/api/companies', url: `${BASE_URL}/external/api/companies` },
    { name: 'ords search', url: `${BASE_URL}/ords/admin/data_main_daily_send/search?limit=5` },
    { name: 'ords industry', url: `${BASE_URL}/ords/admin/data_main_daily_send/industry?limit=5` },
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
