import { formatDate } from './date';
import { getShareUrl } from './reportLinks';

export function normalizeReportItem(item) {
  if (!item) return null;
  const firm = item.firm_nm ? item.firm_nm.trim() : 'Unknown';
  const shareUrl = getShareUrl(item.report_id);

  return {
    id: item.report_id,
    title: item.article_title || '제목 없음',
    writer: item.writer || '작성자 미상',
    link: item.telegram_url || item.download_url || item.article_url || '#',
    article_url: item.article_url,
    download_url: item.download_url,
    pdf_url: item.pdf_url,
    telegram_url: item.telegram_url,
    firm_id: item.firm_id,
    sec_firm_order: item.sec_firm_order,
    gemini_summary: item.gemini_summary,
    firm,
    date: formatDate(item.reg_dt),
    // 명칭 명확화를 위한 추가 필드 (하위 호환성 유지)
    shareUrl: shareUrl,
    openUrl: shareUrl
  };
}
