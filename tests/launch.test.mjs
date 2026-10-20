import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer, listen, apps } from '../src/server.mjs';
import WebSocket from 'ws';
import { once } from 'node:events';
import { setTimeout as sleep } from 'node:timers/promises';

async function waitFor(url, predicate) {
  for (let i = 0; i < 100; i++) {
    const state = await (await fetch(url + '/status')).json();
    if (predicate(state)) return state;
    await sleep(20);
  }
  throw new Error('Connection state timeout');
}
async function setup(t, relay = true, count = 1, options = {}) {
  const config = { pcBPort: 1, consoleToken: options.token || '' };
  let b, bUrl;
  if (relay) {
    b = createServer('b', config, options);
    bUrl = config.pcBUrl = `http://127.0.0.1:${(await listen(b, 0, '127.0.0.1')).port}`;
    t.after(() => b.shutdown());
  }
  const aUrls = [];
  for (let i = 0; i < count; i++) {
    const a = createServer('a', config, { retryMs: 20, maxRetryMs: 50 });
    aUrls.push(`http://127.0.0.1:${(await listen(a, 0, '127.0.0.1')).port}`);
    t.after(() => a.shutdown());
  }
  if (relay) await waitFor(bUrl, state => state.consoles === count);
  return { aUrl: aUrls[0], aUrls, bUrl, b, config };
}
const post = (url, app) => fetch(url + '/launch', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ app })
});
async function events(t, url) {
  const controller = new AbortController();
  t.after(() => controller.abort());
  const response = await fetch(url + '/events', { signal: controller.signal });
  assert.equal(response.status, 200);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  return async () => {
    for (;;) {
      const boundary = buffer.indexOf('\n\n');
      if (boundary !== -1) {
        const event = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        const data = event.split('\n').find(line => line.startsWith('data: '));
        if (data) return JSON.parse(data.slice(6));
        continue;
      }
      const chunk = await reader.read();
      assert.equal(chunk.done, false, 'SSE ended before the expected event');
      buffer += decoder.decode(chunk.value, { stream: true });
    }
  };
}

test('Game WGT commands pass through PC B to the console', { timeout: 5000 }, async t => {
  const { aUrl, bUrl } = await setup(t);
  const next = await events(t, aUrl);
  assert.deepEqual(await next(), { app: null });
  for (const { id: app } of apps) {
    const response = await post(bUrl, app);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true, app, total: 1, delivered: 1, failed: 0 });
    assert.deepEqual(await next(), { app });
  }
});

test('console launches and returns home without a PC B server', { timeout: 5000 }, async t => {
  const { aUrl } = await setup(t, false);
  const next = await events(t, aUrl);
  assert.deepEqual(await next(), { app: null });
  for (const { id: app } of apps) {
    assert.equal((await post(aUrl, app)).status, 200);
    assert.deepEqual(await next(), { app });
    const home = await fetch(aUrl + '/home', { method: 'POST' });
    assert.deepEqual(await home.json(), { ok: true, app: null });
    assert.deepEqual(await next(), { app: null });
  }
});

test('a new console connection restores the current app and shares home changes', { timeout: 5000 }, async t => {
  const { aUrl, bUrl } = await setup(t);
  const first = await events(t, aUrl);
  await first();
  assert.equal((await post(bUrl, apps[1].id)).status, 200);
  assert.deepEqual(await first(), { app: apps[1].id });
  const second = await events(t, aUrl);
  assert.deepEqual(await second(), { app: apps[1].id });
  assert.equal((await fetch(aUrl + '/home', { method: 'POST' })).status, 200);
  assert.deepEqual(await first(), { app: null });
  assert.deepEqual(await second(), { app: null });
  assert.equal((await fetch(bUrl + '/home', { method: 'POST' })).status, 404);
});

test('invalid app and missing browser return errors', async t => {
  const { bUrl } = await setup(t);
  assert.equal((await post(bUrl, 'unknown')).status, 400);
  assert.equal((await post(bUrl, apps[0].id)).status, 503);
  assert.equal((await fetch(bUrl + '/launch', { method: 'POST', body: '{broken' })).status, 400);
});

test('one remote request switches every connected console', { timeout: 5000 }, async t => {
  const { aUrls, bUrl } = await setup(t, true, 3);
  const streams = await Promise.all(aUrls.map(url => events(t, url)));
  for (const next of streams) assert.deepEqual(await next(), { app: null });
  for (const { id: app } of apps) {
    const response = await post(bUrl, app);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true, app, total: 3, delivered: 3, failed: 0 });
    for (const next of streams) assert.deepEqual(await next(), { app });
  }
});

test('one missing browser is reported without blocking other consoles', { timeout: 5000 }, async t => {
  const { aUrl, bUrl } = await setup(t, true, 2);
  const next = await events(t, aUrl);
  await next();
  const response = await post(bUrl, apps[1].id);
  assert.equal(response.status, 207);
  const result = await response.json();
  assert.equal(result.ok, false);
  assert.equal(result.total, 2);
  assert.equal(result.delivered, 1);
  assert.equal(result.failed, 1);
  assert.deepEqual(await next(), { app: apps[1].id });
});

test('no connected consoles fails immediately', async t => {
  const { bUrl } = await setup(t, true, 0);
  const response = await post(bUrl, apps[0].id);
  assert.equal(response.status, 503);
  assert.equal((await response.json()).total, 0);
});

test('consoles reconnect after a relay restart and accept the next command', { timeout: 5000 }, async t => {
  const { aUrl, bUrl, b, config } = await setup(t);
  const next = await events(t, aUrl);
  await next();
  await b.shutdown();
  await waitFor(aUrl, state => !state.relayConnected);
  // The console remains usable while the relay is down.
  assert.equal((await post(aUrl, apps[0].id)).status, 200);
  assert.deepEqual(await next(), { app: apps[0].id });
  const replacement = createServer('b', config);
  await listen(replacement, Number(new URL(bUrl).port), '127.0.0.1');
  t.after(() => replacement.shutdown());
  await waitFor(bUrl, state => state.consoles === 1);
  assert.equal((await post(bUrl, apps[2].id)).status, 200);
  assert.deepEqual(await next(), { app: apps[2].id });
});

test('an unresponsive console times out independently', { timeout: 5000 }, async t => {
  const { aUrl, bUrl } = await setup(t, true, 1, { timeoutMs: 80 });
  const next = await events(t, aUrl);
  await next();
  const silent = new WebSocket(bUrl.replace('http:', 'ws:') + '/console');
  t.after(() => silent.terminate());
  await once(silent, 'open');
  await waitFor(bUrl, state => state.consoles === 2);
  const response = await post(bUrl, apps[2].id);
  assert.equal(response.status, 207);
  const result = await response.json();
  assert.equal(result.delivered, 1);
  assert.equal(result.failed, 1);
  assert.deepEqual(await next(), { app: apps[2].id });
});

test('a configured console token rejects unauthorized connections', { timeout: 5000 }, async t => {
  const { aUrl, bUrl } = await setup(t, true, 1, { token: 'test-console-secret' });
  const next = await events(t, aUrl);
  await next();
  const unauthorized = new WebSocket(bUrl.replace('http:', 'ws:') + '/console');
  const rejected = await new Promise(resolve => {
    unauthorized.on('error', error => resolve(error));
    unauthorized.on('open', () => resolve(null));
  });
  unauthorized.terminate();
  assert.match(rejected.message, /401/);
  assert.equal((await (await fetch(bUrl + '/status')).json()).consoles, 1);
  assert.equal((await post(bUrl, apps[0].id)).status, 200);
  assert.deepEqual(await next(), { app: apps[0].id });
});
