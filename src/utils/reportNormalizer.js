import { formatDate } from './date';
import { getShareUrl } from './reportLinks';

export function normalizeReportItem(item) {
  if (!item) return null;
  const firm = item.firm_nm ? item.firm_nm.trim() : 'Unknown';
  const shareUrl = getShareUrl(item.report_id);
  
  // 1. sourceUrl: 실제 PDF 파일 주소 혹은 원본 링크
  const sourceUrl = item.pdf_url || item.download_url || item.telegram_url || item.article_url || '#';

  // 2. openUrl: 뷰어에서 직접 열거나 다이렉트 랜딩할 최적화 경로 (isDsReport 로직 내재화)
  const isDs = String(item.sec_firm_order) === '11' || 
               String(item.firm_id) === '11' || 
               firm.includes('DS') || 
               firm.includes('디에스') || 
               sourceUrl.includes('ds-sec.co.kr');
  const openUrl = (isDs || sourceUrl === '#') ? shareUrl : sourceUrl;

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
    fnguide_summary: item.fnguide_summary || null,
    tags: item.tags || [],
    stock_names: item.stock_names || [],
    sector: item.sector || '',
    pdf_archive: item.pdf_archive || null,
    firm,
    date: formatDate(item.reg_dt),
    // 명칭 분리 및 하위 호환성 유지
    shareUrl: shareUrl,
    openUrl: openUrl,
    sourceUrl: sourceUrl
  };
}

