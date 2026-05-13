/**
 * Live smoke test for the DS share/proxy route.
 *
 * This intentionally checks the deployed Netlify path because the failure mode
 * is in the serverless share -> proxy-ds routing layer, not the report API.
 *
 * Usage:
 *   node test/integration/share-ds-smoke.test.js
 *
 * Environment:
 *   SHARE_BASE_URL       default: https://ssh-oci.netlify.app
 *   DS_SHARE_REPORT_ID   default: 239333230
 *   LIVE_PDF_GET=1       also download and verify the PDF body starts with %PDF
 */

const SHARE_BASE_URL = (process.env.SHARE_BASE_URL || 'https://ssh-oci.netlify.app').replace(/\/$/, '');
const DS_SHARE_REPORT_ID = process.env.DS_SHARE_REPORT_ID || '239333230';
const SHOULD_GET_PDF = process.env.LIVE_PDF_GET === '1';

let passed = 0;
let failed = 0;
let skipped = 0;

function pass(label, detail = '') {
  console.log(`  PASS: ${label}${detail ? ` (${detail})` : ''}`);
  passed++;
}

function fail(label, detail = '') {
  console.log(`  FAIL: ${label}${detail ? ` (${detail})` : ''}`);
  failed++;
}

function skip(label, detail = '') {
  console.log(`  SKIP: ${label}${detail ? ` (${detail})` : ''}`);
  skipped++;
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 20000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

console.log('\n--- live DS share smoke ---');
console.log(`  share: ${SHARE_BASE_URL}/share?id=${DS_SHARE_REPORT_ID}`);

let location = '';
try {
  const shareRes = await fetchWithTimeout(`${SHARE_BASE_URL}/share?id=${DS_SHARE_REPORT_ID}`, {
    redirect: 'manual',
  });

  if (shareRes.status === 302) {
    pass('/share returns 302');
  } else {
    fail('/share returns 302', `HTTP ${shareRes.status}`);
  }

  location = shareRes.headers.get('location') || '';
  if (location.includes('/.netlify/functions/proxy-ds?')) {
    pass('/share redirects to proxy-ds');
  } else {
    fail('/share redirects to proxy-ds', location || 'missing Location');
  }

  if (location.includes('referer=')) {
    pass('proxy-ds redirect includes referer');
  } else {
    fail('proxy-ds redirect includes referer');
  }
} catch (err) {
  fail('/share request failed', err.message);
}

if (location) {
  try {
    const headRes = await fetchWithTimeout(location, { method: 'HEAD' }, 15000);
    const contentType = headRes.headers.get('content-type') || '';

    if (headRes.ok) {
      pass('proxy-ds HEAD returns OK', `HTTP ${headRes.status}`);
    } else {
      fail('proxy-ds HEAD returns OK', `HTTP ${headRes.status}`);
    }

    if (contentType.includes('application/pdf')) {
      pass('proxy-ds HEAD advertises PDF', contentType);
    } else {
      fail('proxy-ds HEAD advertises PDF', contentType || 'missing content-type');
    }
  } catch (err) {
    fail('proxy-ds HEAD failed', err.message);
  }

  if (SHOULD_GET_PDF) {
    try {
      const pdfRes = await fetchWithTimeout(location, { method: 'GET' }, 45000);
      const contentType = pdfRes.headers.get('content-type') || '';
      const bytes = Buffer.from(await pdfRes.arrayBuffer());

      if (pdfRes.ok) {
        pass('proxy-ds GET returns OK', `HTTP ${pdfRes.status}`);
      } else {
        fail('proxy-ds GET returns OK', `HTTP ${pdfRes.status}`);
      }

      if (contentType.includes('application/pdf')) {
        pass('proxy-ds GET returns PDF content-type', contentType);
      } else {
        fail('proxy-ds GET returns PDF content-type', contentType || 'missing content-type');
      }

      if (bytes.subarray(0, 4).toString('ascii') === '%PDF') {
        pass('proxy-ds GET body starts with %PDF', `${bytes.length} bytes`);
      } else {
        fail('proxy-ds GET body starts with %PDF', bytes.subarray(0, 32).toString('utf8'));
      }
    } catch (err) {
      fail('proxy-ds GET failed', err.message);
    }
  } else {
    skip('proxy-ds GET body verification', 'set LIVE_PDF_GET=1 to download the live PDF');
  }
}

console.log(`\nResult: ${passed} passed, ${failed} failed, ${skipped} skipped`);
process.exit(failed > 0 ? 1 : 0);
