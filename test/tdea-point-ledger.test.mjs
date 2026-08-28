import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const worker = readFileSync(new URL('../src/monthly-entry.ts', import.meta.url), 'utf8');
const app = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');

test('admin point ledger reads the child D1 through the service binding', () => {
  const start = worker.indexOf('async function listPointLedgerApi');
  const end = worker.indexOf('function buildNativeFormRecord', start);
  const helper = worker.slice(start, end);
  assert.match(helper, /env\.TDEA_DESIGN\.fetch\(upstreamUrl\.toString\(\)/);
  assert.match(helper, /internal\/tdea\/points\/ledger/);
  assert.match(helper, /x-tdea-internal-secret/);
  assert.doesNotMatch(helper, /queryPointBalanceOnce|pointApiBase|WETW_POINT_API_KEY|aiwe\.cc/);
});

test('admin point ledger labels the child source without mother-site wording', () => {
  assert.match(app, /子站點數流水/);
  assert.match(app, /TDEA-DESIGN 的 D1 帳本為準/);
  assert.doesNotMatch(app, /母站點數流水|點數以母站為準/);
});
