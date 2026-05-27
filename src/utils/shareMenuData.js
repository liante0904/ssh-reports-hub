export function buildShareMenuData(report) {
  return {
    title: report.title,
    firm: report.firm,
    writer: report.writer,
    shareUrl: report.shareUrl,
  };
}
