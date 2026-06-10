/**
 * 태그 클라우드 유틸리티
 *
 * 일자별 레포트에서 태그/색터/종목명을 모아 빈도를 계산하고,
 * 빈도에 따라 폰트 사이즈를 차등 부여한다.
 */

/**
 * 주어진 레포트 배열에서 모든 태그 키워드를 추출하고 빈도를 집계한다.
 *
 * @param {Array} reports - normalizeReportItem() 처리된 레포트 배열
 * @returns {Array<{keyword: string, count: number, fontSize: number}>}
 *   빈도 내림차순 정렬, fontSize가 포함된 태그 배열
 */
export function buildDateTagCloud(reports) {
  if (!Array.isArray(reports) || reports.length === 0) return [];

  const freq = new Map();

  for (const report of reports) {
    // sector
    if (report.sector) {
      const s = report.sector.trim();
      if (s) freq.set(s, (freq.get(s) || 0) + 1);
    }

    // stock_names
    if (Array.isArray(report.stock_names)) {
      for (const name of report.stock_names) {
        const n = String(name).trim();
        if (n) freq.set(n, (freq.get(n) || 0) + 1);
      }
    }

    // tags
    if (Array.isArray(report.tags)) {
      for (const tag of report.tags) {
        const t = String(tag).trim();
        if (t) freq.set(t, (freq.get(t) || 0) + 1);
      }
    }
  }

  if (freq.size === 0) return [];

  const entries = Array.from(freq.entries()).map(([keyword, count]) => ({
    keyword,
    count,
  }));

  const counts = entries.map((e) => e.count);
  const minCount = Math.min(...counts);
  const maxCount = Math.max(...counts);

  const MIN_FONT = 0.7;
  const MAX_FONT = 1.5;

  for (const entry of entries) {
    if (maxCount === minCount) {
      entry.fontSize = (MIN_FONT + MAX_FONT) / 2;
    } else {
      const ratio = (entry.count - minCount) / (maxCount - minCount);
      entry.fontSize = MIN_FONT + (MAX_FONT - MIN_FONT) * ratio;
    }
    // 소수점 둘째 자리
    entry.fontSize = Math.round(entry.fontSize * 100) / 100;
  }

  // 빈도 내림차순, 동률이면 키워드 가나다순
  entries.sort((a, b) => b.count - a.count || a.keyword.localeCompare(b.keyword, 'ko'));

  return entries;
}

/**
 * 태그 클릭 시 검색 쿼리를 생성한다.
 *
 * @param {string} keyword - 클릭된 태그 키워드
 * @returns {{ query: string, category: string }}
 */
export function createTagSearch(keyword) {
  return { query: keyword, category: 'tag' };
}
