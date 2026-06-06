const FINANCIAL_METRIC_PATTERN = new RegExp(
  [
    '(?:Target\\s*)?(?:PER|PBR|ROE)\\s*[\\d,.]+\\s*(?:x|배|%|%p)?',
    '(?:YoY|QoQ)\\s*[+-]?\\d+(?:\\.\\d+)?%p?',
    '[+-]?\\d+(?:\\.\\d+)?%p?',
    '(?:지배)?순이익\\s*[\\d,.]+\\s*(?:조|억|만)?\\s*원',
    '영업이익(?:률)?\\s*[\\d,.]+\\s*(?:조|억|만)?\\s*원',
    '목표(?:주가|가)?\\s*[\\d,.]+\\s*(?:조|억|만)?\\s*원',
  ].join('|'),
  'gi'
);

export function tokenizeFinancialHighlights(text) {
  if (!text) return [];

  const tokens = [];
  let cursor = 0;

  for (const match of String(text).matchAll(FINANCIAL_METRIC_PATTERN)) {
    const index = match.index ?? 0;
    if (index > cursor) {
      tokens.push({ text: text.slice(cursor, index), highlighted: false });
    }
    tokens.push({ text: match[0], highlighted: true });
    cursor = index + match[0].length;
  }

  if (cursor < text.length) {
    tokens.push({ text: text.slice(cursor), highlighted: false });
  }

  return tokens;
}

export function groupFnGuideSummaries(summaries) {
  const dateMap = new Map();

  summaries.forEach((item) => {
    const date = item.report_date || '날짜 미상';
    if (!dateMap.has(date)) dateMap.set(date, new Map());

    const companyKey = item.company_code || item.company_name || `summary-${item.summary_id}`;
    const companyMap = dateMap.get(date);
    if (!companyMap.has(companyKey)) {
      companyMap.set(companyKey, {
        key: companyKey,
        companyName: item.company_name || '종목 미상',
        companyCode: item.company_code || '',
        items: [],
      });
    }
    companyMap.get(companyKey).items.push(item);
  });

  return Array.from(dateMap, ([date, companyMap]) => {
    const companyGroups = Array.from(companyMap.values());
    const repeated = companyGroups
      .filter((group) => group.items.length > 1)
      .sort((a, b) => b.items.length - a.items.length);
    const singles = companyGroups.filter((group) => group.items.length === 1);

    return {
      date,
      reportCount: companyGroups.reduce((sum, group) => sum + group.items.length, 0),
      repeated,
      singles,
    };
  });
}
