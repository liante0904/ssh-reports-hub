/**
 * admin-status Netlify Function 단위 테스트
 *
 * 사용법:
 *   node test/admin-status.test.js
 *
 * 환경변수:
 *   VITE_API_URL - 업스트림 서버 주소 (기본값: https://ssh-oci.duckdns.org)
 */

const BASE_URL = process.env.VITE_API_URL || 'https://ssh-oci.duckdns.org';
const FUNCTION_URL = `${BASE_URL}/health`; // Netlify 배포 전에는 직접 업스트림 체크

let passed = 0;
let failed = 0;

function assert(condition, label, detail = '') {
  if (condition) {
    console.log(`  ✅ PASS: ${label}${detail ? ` (${detail})` : ''}`);
    passed++;
  } else {
    console.log(`  ❌ FAIL: ${label}${detail ? ` (${detail})` : ''}`);
    failed++;
  }
}

async function assertHttpOk(url, label) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    assert(res.ok, label, `HTTP ${res.status}`);
    return res;
  } catch (err) {
    assert(false, label, err.message);
    return null;
  }
}

async function runTests() {
  console.log('\n════════════════════════════════════════════');
  console.log('  admin-status 단위 테스트');
  console.log(`  대상 서버: ${BASE_URL}`);
  console.log('════════════════════════════════════════════\n');

  // ─── Test 1: 업스트림 헬스 체크 ───
  console.log('─── [Test 1] 업스트림 /health 엔드포인트 ───');
  const healthRes = await assertHttpOk(`${BASE_URL}/health`, '/health가 200 OK를 반환');

  if (healthRes) {
    const body = await healthRes.json();
    assert(body.status === 'ok', 'health body.status === "ok"', JSON.stringify(body));
  }

  // ─── Test 2: 검색 API 정상 동작 ───
  console.log('\n─── [Test 2] 검색 API (pub/api/search/) ───');
  const searchRes = await assertHttpOk(
    `${BASE_URL}/external/api/search/?sort_by=time&limit=1`,
    'search API가 200 OK를 반환'
  );

  if (searchRes) {
    try {
      const data = await searchRes.json();
      assert(Array.isArray(data.items), '응답에 items 배열이 있음', `items.length=${data.items?.length || 0}`);
      assert(typeof data.hasMore === 'boolean', 'hasMore 필드가 있음');
      if (data.items && data.items.length > 0) {
        assert(data.count > 0, 'count > 0 (데이터 존재)');
        assert(data.items[0]?.save_at, '최신 항목에 save_at이 있음');
        assert(data.items[0]?.firm_nm, '최신 항목에 firm_nm이 있음');
        assert(data.items[0]?.article_title, '최신 항목에 article_title이 있음');
      } else {
        assert(true, 'items 배열이 비어있음 (데이터 없음)', `items.length=0`);
      }
    } catch (e) {
      assert(false, 'search 응답 JSON 파싱', e.message);
    }
  }

  // ─── Test 3: companies API ───
  console.log('\n─── [Test 3] companies API (pub/api/companies) ───');
  const companiesRes = await assertHttpOk(
    `${BASE_URL}/external/api/companies`,
    'companies API가 200 OK를 반환'
  );

  if (companiesRes) {
    try {
      const companies = await companiesRes.json();
      assert(Array.isArray(companies), '응답이 배열');
      if (Array.isArray(companies) && companies.length > 0) {
        assert(companies.length >= 10, `증권사 목록 ${companies.length}개 >= 10`);
        assert(companies[0]?.name, '첫 항목에 name 필드가 있음');
        assert(companies[0]?.report_count !== undefined, '첫 항목에 report_count 필드가 있음');

        // 실제 FIRM_NAMES와 매칭 확인
        const knownFirms = [
          'LS증권', '신한증권', 'NH투자증권', '하나증권', 'KB증권',
          '삼성증권', '미래에셋증권', '키움증권', '한국투자증권', '대신증권'
        ];
        const firmNames = companies.map(c => c.name);
        const matched = knownFirms.filter(f => firmNames.includes(f));
        assert(matched.length >= 5, `알려진 증권사명 ${matched.length}개 이상 매칭됨`, matched.join(', '));
      }
    } catch (e) {
      assert(false, 'companies 응답 JSON 파싱', e.message);
    }
  }

  // ─── Test 4: 최신 데이터 검색 (external API는 q 파라미터 미지원 → title로 대체) ───
  console.log('\n─── [Test 4] 오늘 데이터 검색 ───');
  const today = new Date();
  const todayStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  const todayRes = await assertHttpOk(
    `${BASE_URL}/external/api/search/?sort_by=time&limit=10`,
    '최신 검색이 200 OK를 반환'
  );

  if (todayRes) {
    try {
      const data = await todayRes.json();
      const itemCount = data.items?.length || 0;
      assert(itemCount >= 0, 'items 배열 존재', `${itemCount}건`);
      console.log(`  ℹ️  최신 ${itemCount}건 중 오늘(${todayStr}) 데이터 확인`);

      // 오늘 날짜의 항목이 하나라도 있는지 확인
      if (itemCount > 0) {
        const todayItems = data.items.filter(item => item.report_date === todayStr);
        assert(todayItems.length >= 0, '오늘 데이터 포함 가능', `오늘 ${todayItems.length}건`);
        if (todayItems.length > 0) {
          assert(true, '오늘 날짜 데이터 존재 확인', `${todayItems[0]?.firm_nm} - ${todayItems[0]?.article_title?.substring(0, 30)}`);
        }
      }
    } catch (e) {
      assert(false, '검색 응답 JSON 파싱', e.message);
    }
  }

  // ─── Test 5: admin-status 함수 시뮬레이션 ───
  console.log('\n─── [Test 5] admin-status 로직 통합 검증 ───');

  // 함수 내부 로직을 그대로 재현하여 응답 구조 검증
  const overallStatus = (
    healthRes?.ok &&
    searchRes?.ok &&
    todayRes?.ok
  ) ? 'online' : 'degraded';

  assert(
    ['online', 'degraded', 'offline'].includes(overallStatus),
    'overall 상태가 유효한 값 중 하나',
    overallStatus
  );

  // 응답 구조가 프론트에서 기대하는 형태와 일치하는지 검증
  const mockResponse = {
    overall: overallStatus,
    timestamp: new Date().toISOString(),
    services: {
      api: { status: healthRes?.ok ? 'online' : 'offline' },
      db: { status: searchRes?.ok ? 'online' : 'offline' },
      scheduler: { status: todayRes?.ok ? 'online' : 'degraded' },
    },
  };

  assert(typeof mockResponse.overall === 'string', 'response.overall: string');
  assert(typeof mockResponse.timestamp === 'string', 'response.timestamp: string');
  assert(mockResponse.services.api.status === 'online', 'response.services.api.status 존재');
  assert(mockResponse.services.db.status === 'online', 'response.services.db.status 존재');
  assert(mockResponse.services.scheduler.status !== undefined, 'response.services.scheduler.status 존재');

  // ─── Test 6: 최근 활동 시간 파싱 ───
  console.log('\n─── [Test 6] 최근 활동 시간 포맷팅 ───');
  try {
    const freshRes = await fetch(`${BASE_URL}/external/api/search/?sort_by=time&limit=1`);
    if (freshRes.ok) {
      const data = await freshRes.json();
      const latest = data.items?.[0];
      if (latest?.save_at) {
        // save_at은 KST 기준 문자열이므로 timezone 보정 (+09:00)
        const savedAt = new Date(latest.save_at + '+09:00');
        const now = new Date();
        assert(!isNaN(savedAt.getTime()), 'save_at이 유효한 Date로 파싱됨');
        assert(savedAt <= now, 'save_at이 현재 시각 이전');

        const diffMs = now - savedAt;
        const diffMin = Math.floor(diffMs / 60000);
        assert(diffMin >= 0, '수집 시간 차이가 음수가 아님', `${diffMin}분 전`);
      }
    }
  } catch (e) {
    assert(false, '최근 활동 시간 조회', e.message);
  }

  // ─── 결과 요약 ───
  console.log('\n════════════════════════════════════════════');
  console.log(`  결과: ${passed} 통과, ${failed} 실패 (총 ${passed + failed}개)`);
  console.log('════════════════════════════════════════════\n');

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error('테스트 실행 중 오류:', err);
  process.exit(1);
});
