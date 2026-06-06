import { FNGUIDE_KEYWORD_GROUPS } from '../constants/fnguideKeywords.js';

const FINANCIAL_METRIC_PATTERN = new RegExp(
  [
    '(?:(?:Target|목표|타겟|적정)\\s*)?(?:PER|PBR|ROE)(?:은|는|이|가)?\\s*[:：]?\\s*[\\d,.]+\\s*(?:x|배|%|%p)?',
    '(?:YoY|QoQ|성장률|증가율|감소율|전년비|전년(?:\\s*동기)?\\s*대비)\\s*[:：]?\\s*[+-]?\\d+(?:\\.\\d+)?%p?',
    '[+-]?\\d+(?:\\.\\d+)?%p?',
    '(?:매출(?:액)?|영업이익|(?:지배|당기)?순이익)(?:률|\\s*추정(?:치)?)?\\s*[:：]?\\s*(?:[\\d,.]+\\s*조(?:\\s*[\\d,.]+\\s*억)?|[\\d,.]+\\s*억|[\\d,.]+\\s*만|[\\d,.]+)\\s*원',
    '목표(?:주가|가)?\\s*[\\d,.]+\\s*(?:조|억|만)?\\s*원',
  ].join('|'),
  'gi'
);

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const INVESTMENT_KEYWORD_GROUPS = FNGUIDE_KEYWORD_GROUPS.map((group) => ({
  ...group,
  pattern: new RegExp(
    [...group.keywords]
      .sort((a, b) => b.length - a.length)
      .map((keyword) => keyword.trim().split(/\s+/).map(escapeRegex).join('\\s*'))
      .join('|'),
    'gi'
  ),
}));

export function tokenizeFinancialHighlights(text) {
  if (!text) return [];

  const source = String(text);
  const matches = [
    ...Array.from(source.matchAll(FINANCIAL_METRIC_PATTERN), (match) => ({
      index: match.index ?? 0,
      text: match[0],
      kind: 'financial',
    })),
    ...INVESTMENT_KEYWORD_GROUPS.flatMap(({ kind, pattern }) => (
      Array.from(source.matchAll(pattern), (match) => ({
        index: match.index ?? 0,
        text: match[0],
        kind,
      }))
    )),
  ].sort((a, b) => (
    a.index - b.index
    || Number(a.kind === 'financial') - Number(b.kind === 'financial')
    || b.text.length - a.text.length
  ));

  const tokens = [];
  let cursor = 0;

  for (const match of matches) {
    const index = match.index;
    const end = index + match.text.length;
    if (index < cursor) {
      if (match.kind === 'financial' && end > cursor) {
        tokens.push({
          text: match.text.slice(cursor - index),
          highlighted: true,
          kind: 'financial',
        });
        cursor = end;
      }
      continue;
    }
    if (index > cursor) {
      tokens.push({ text: source.slice(cursor, index), highlighted: false, kind: 'text' });
    }
    tokens.push({ text: match.text, highlighted: true, kind: match.kind });
    cursor = end;
  }

  if (cursor < source.length) {
    tokens.push({ text: source.slice(cursor), highlighted: false, kind: 'text' });
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

function incrementFacet(map, value) {
  const normalized = String(value || '').trim();
  if (!normalized) return;
  map.set(normalized, (map.get(normalized) || 0) + 1);
}

function toSortedFacets(map) {
  return Array.from(map, ([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'ko'));
}

export function buildFnGuideFacets(summaries) {
  const companies = new Map();
  const providers = new Map();
  const authors = new Map();

  summaries.forEach((item) => {
    incrementFacet(companies, item.company_name);
    incrementFacet(providers, item.provider);
    String(item.author || '')
      .split(/[.,/·]+/)
      .forEach((author) => incrementFacet(authors, author));
  });

  return {
    company: toSortedFacets(companies),
    provider: toSortedFacets(providers),
    author: toSortedFacets(authors),
  };
}

export function getFnGuideFacetScale(count, maxCount) {
  if (!count || !maxCount || maxCount <= 1) return 1;
  const ratio = Math.sqrt((count - 1) / (maxCount - 1));
  return Number((1 + ratio * 0.7).toFixed(3));
}

export function matchesFnGuideFacet(item, facet) {
  if (!facet?.value || !facet?.type) return true;
  if (facet.type === 'company') return item.company_name === facet.value;
  if (facet.type === 'provider') return item.provider === facet.value;
  if (facet.type === 'author') {
    return String(item.author || '')
      .split(/[.,/·]+/)
      .some((author) => author.trim() === facet.value);
  }
  return true;
}
