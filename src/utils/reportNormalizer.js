import { formatDate } from './date';

export function normalizeReportItem(item) {
  if (!item) return null;
  const firm = item.firm_nm ? item.firm_nm.trim() : 'Unknown';

  return {
    id: item.report_id,
    title: item.article_title || '제목 없음',
    writer: item.writer || '작성자 미상',
    link: item.telegram_url || item.download_url || item.article_url || '#',
    gemini_summary: item.gemini_summary,
    firm,
    date: formatDate(item.reg_dt),
  };
}
