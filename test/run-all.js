#!/usr/bin/env node
/**
 * 전체 테스트 러너
 *
 * 사용법:
 *   node test/run-all.js              # 모든 테스트 실행
 *   node test/run-all.js --unit       # 유닛 테스트만
 *   node test/run-all.js --integration # 통합 테스트만
 *   node test/run-all.js --e2e        # 기존 admin-status 테스트만
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const TESTS = {
  unit: {
    name: '유닛 테스트 (utils)',
    script: 'test/unit/utils.test.js',
  },
  integration: {
    name: 'API 통합 테스트',
    script: 'test/integration/api.test.js',
  },
  e2e: {
    name: 'E2E (admin-status)',
    script: 'test/admin-status.test.js',
  },
};

function runTest(key, config) {
  return new Promise((resolve) => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`  ▶ ${config.name}`);
    console.log(`${'='.repeat(60)}`);

    const child = spawn('node', [config.script], {
      cwd: ROOT,
      stdio: 'inherit',
      env: { ...process.env },
    });

    child.on('close', (code) => {
      resolve({ key, name: config.name, code });
    });

    child.on('error', (err) => {
      console.error(`  ❌ 실행 실패: ${err.message}`);
      resolve({ key, name: config.name, code: 1 });
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  const runAll = args.length === 0;

  const targets = [];
  if (runAll || args.includes('--unit')) targets.push('unit');
  if (runAll || args.includes('--integration')) targets.push('integration');
  if (runAll || args.includes('--e2e')) targets.push('e2e');

  if (targets.length === 0) {
    console.log('사용법: node test/run-all.js [--unit] [--integration] [--e2e]');
    process.exit(1);
  }

  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║       SSH Reports Hub - 테스트 러너      ║');
  console.log('╚══════════════════════════════════════════╝');

  const results = [];
  for (const key of targets) {
    const result = await runTest(key, TESTS[key]);
    results.push(result);
  }

  // 요약
  console.log(`\n${'='.repeat(60)}`);
  console.log('  📊 테스트 결과 요약');
  console.log(`${'='.repeat(60)}`);
  for (const r of results) {
    const icon = r.code === 0 ? '✅' : '❌';
    console.log(`  ${icon} ${r.name}: ${r.code === 0 ? 'PASS' : 'FAIL (exit ' + r.code + ')'}`);
  }

  const allPassed = results.every(r => r.code === 0);
  console.log(`\n  최종: ${allPassed ? '모두 통과 ✅' : '일부 실패 ❌'}\n`);
  process.exit(allPassed ? 0 : 1);
}

main().catch((err) => {
  console.error('런타임 오류:', err);
  process.exit(1);
});
