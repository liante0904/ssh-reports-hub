import { formatDate } from './date';

export function normalizeReportItem(item) {
  const firm = item.firm_nm ? item.firm_nm.trim() : 'Unknown';

  return {
    id: item.report_id,
    title: item.article_title,
    writer: item.writer,
    link: item.telegram_url || item.download_url || item.attach_url,
    gemini_summary: item.gemini_summary,
    firm,
    date: formatDate(item.reg_dt),
  };
}
