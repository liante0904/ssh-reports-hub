# PDF Routing

## Current behavior

- Report links now always go through `/share?id=...`.
- `share` resolves the original PDF URL, then applies platform-specific routing.

## Platform rules

- iOS: use the proxy PDF URL directly.
- Non-iOS: open the proxy PDF through `pdf.js`.
- If the proxy preflight returns HTML or an error, fall back to the raw database URL instead of sending the user into `pdf.js`.

## Special cases

- DB Securities URLs such as `whub.dbsec.co.kr/pv/gate` are excluded from `pdf.js`.
- Those URLs use the vendor flow because they are StreamDocs gate/viewer pages, not raw PDF files.
- DB Securities JSON links like `m.db-fi.com/appData/descRsh/*.json` are resolved server-side and converted to the `pv/gate?q=...` entrypoint before redirecting.

## Proxy notes

- The PDF proxy sends the file inline with CORS headers so `pdf.js` can fetch it.
- If a report source requires a referer or cookie bootstrap, the proxy can prime that first.
- The viewer is started with a minimal hash (`#pagemode=none&zoom=page-width`) to avoid extra sidebar work on first paint.

## Change log

- 2026-04-22: MyAsset/유안타 계열은 `article_url`보다 `pdf_url/download_url/telegram_url`을 우선 사용하도록 변경.
- 2026-04-22: `pdf.js` 실패 가능성이 보이면 raw database URL로 fallback 하도록 변경.
- 2026-04-22: proxy 에러 메시지의 DS 고정 문구를 제거하고 실제 host 기준으로 출력하도록 변경.
