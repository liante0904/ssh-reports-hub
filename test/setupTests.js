// Jest 테스트 환경에서의 JSDOM 미구현 스크롤 함수 모킹 (Heap OOM 방지 및 에러 로그 차단)
if (typeof window !== 'undefined') {
  window.scrollTo = jest.fn();
  window.scrollBy = jest.fn();
}

if (typeof Element !== 'undefined' && Element.prototype) {
  Element.prototype.scrollTo = jest.fn();
  Element.prototype.scrollBy = jest.fn();
  Element.prototype.scrollIntoView = jest.fn();
}
