import { getShareUrl } from './reportLinks';

export function buildShareMenuData(report) {
  return {
    title: report.title,
    firm: report.firm,
    writer: report.writer,
    shareUrl: getShareUrl(report.id),
  };
}
