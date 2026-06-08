/**
 * share Netlify function URL builder tests
 *
 * Usage:
 *   node test/unit/share-function.test.js
 */

import { buildReportSearchUrl } from '../../netlify/functions/share.js';

let passed = 0;
let failed = 0;

function assertEqual(actual, expected, label) {
  if (actual === expected) {
    console.log(`  PASS: ${label}`);
    passed++;
  } else {
    console.log(`  FAIL: ${label}`);
    console.log(`     expected: ${expected}`);
    console.log(`     actual:   ${actual}`);
    failed++;
  }
}

console.log('\n--- share.js buildReportSearchUrl ---');

assertEqual(
  buildReportSearchUrl('239333230', {}),
  'https://ssh-oci.duckdns.org/external/api/search/?report_id=239333230',
  'default uses /external/api'
);

assertEqual(
  buildReportSearchUrl('123', {
    VITE_API_URL: 'https://ssh-oci.duckdns.org',
    VITE_API_PATH: '/external/api',
  }),
  'https://ssh-oci.duckdns.org/external/api/search/?report_id=123',
  'VITE_API_URL + VITE_API_PATH'
);

assertEqual(
  buildReportSearchUrl('123', {
    VITE_REPORT_API_URL: 'https://ssh-oci.duckdns.org/pub/api',
  }),
  'https://ssh-oci.duckdns.org/pub/api/search/?report_id=123',
  'explicit /pub/api is preserved'
);

assertEqual(
  buildReportSearchUrl('123', {
    VITE_REPORT_API_URL: 'https://ssh-oci.duckdns.org/pub',
    VITE_TABLE_NAME: 'api',
  }),
  'https://ssh-oci.duckdns.org/pub/api/search/?report_id=123',
  'legacy /pub + table name'
);

assertEqual(
  buildReportSearchUrl('123', {
    VITE_API_URL: 'https://ssh-oci.duckdns.org/ords/admin/data_main_daily_send',
  }),
  'https://ssh-oci.duckdns.org/ords/admin/data_main_daily_send/external/api/search/?report_id=123',
  'ORDS path is preserved with FastAPI fallback'
);

assertEqual(
  buildReportSearchUrl('abc 123', {}),
  'https://ssh-oci.duckdns.org/external/api/search/?report_id=abc%20123',
  'report_id is encoded'
);

console.log(`\nResult: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
