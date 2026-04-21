/**
 * API에서 받은 날짜 문자열을 "YYYY-MM-DD" 형식으로 변환
 * @param {string} rawDate (예: "20240421" 또는 "2024-04-21 10:00:00")
 * @returns {string}
 */
export function formatDate(rawDate) {
  if (!rawDate) return 'Unknown';
  
  const trimmed = rawDate.trim();
  
  // 1. "YYYYMMDD" 형식인 경우
  if (trimmed.length === 8 && /^\d+$/.test(trimmed)) {
    return `${trimmed.substring(0, 4)}-${trimmed.substring(4, 6)}-${trimmed.substring(6, 8)}`;
  }
  
  // 2. "YYYY-MM-DD ..." 형식인 경우
  const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  
  return trimmed;
}
