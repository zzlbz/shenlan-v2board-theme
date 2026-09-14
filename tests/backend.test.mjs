import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const compile = (source) => ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
const uri = (source) => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const backendModule = uri(compile(readFileSync(new URL('../src/backend.ts', import.meta.url), 'utf8')));
const { normalizeBackend, backendUrl } = await import(backendModule);

test('backend origin validation and same-origin compatibility', () => {
  assert.equal(backendUrl('/api/v1/user/info'), '/api/v1/user/info');
  assert.equal(backendUrl('/api/v1/user/info', ' https://api.example.com/ '), 'https://api.example.com/api/v1/user/info');
  for (const host of ['javascript:alert(1)', '//example.com', 'https://user:pass@example.com', 'https://example.com/api/v1', 'https://example.com?token=secret']) assert.throws(() => normalizeBackend(host));
  assert.throws(() => backendUrl('https://other.example/api/v1'));
});

test('production API targets configured backend, preserves envelopes and isolates authentication', async () => {
  const store = new Map([['SHENLAN_AUTH_DATA', 'old-same-origin-token']]);
  globalThis.localStorage = { getItem: key => store.get(key) || null, setItem: (key, value) => store.set(key, value), removeItem: key => store.delete(key) };
  globalThis.window = { settings: { host: 'https://api.example.com' } };
  const calls = [];
  globalThis.fetch = async (url, init) => { calls.push({ url, init }); return { ok: true, json: async () => ({ data: 'order-123', type: 1 }) }; };
  const source = readFileSync(new URL('../src/api.ts', import.meta.url), 'utf8')
    .replace(/^import .* from '.\/demo'\r?\n/m, '')
    .replace("'./backend'", JSON.stringify(backendModule))
    .replace('import.meta.env.DEV', 'false');
  const api = await import(uri(compile(source)));
  assert.equal(api.getAuth(), '');
  api.setAuth('test-auth');
  await api.api('/api/v1/user/info', { params: { value: 'a & b' } });
  assert.equal(calls[0].url, 'https://api.example.com/api/v1/user/info?value=a+%26+b');
  assert.equal(calls[0].init.headers.Authorization, 'test-auth');
  const response = await api.apiEnvelope('/api/v1/user/order/save', { method: 'POST', params: { plan_id: 2, period: 'reset_price' } });
  assert.equal(calls[1].init.body.get('period'), 'reset_price');
  assert.equal(response.type, 1);
  await api.api('/api/v1/passport/auth/login', { method: 'POST', auth: false });
  assert.equal(calls[2].init.headers.Authorization, undefined);
  api.setAuth('');
  assert.equal(api.getAuth(), '');
  assert.equal(store.get('SHENLAN_AUTH_DATA'), 'old-same-origin-token');
  globalThis.fetch = async () => ({ ok: true, json: async () => { throw new Error('HTML'); } });
  await assert.rejects(api.api('/api/v1/user/info'), /接口返回格式异常/);
});
