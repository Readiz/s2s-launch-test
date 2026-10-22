import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildPreview } from '../scripts/build-preview.mjs';
import { createConsoleTransport } from '../web/preview-transport.mjs';
import { apps } from '../src/config.mjs';

test('public export contains only static assets and no network transport', async t => {
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'sbox-static-'));
  t.after(() => rm(temporary, { recursive: true, force: true }));
  const output = await buildPreview(path.join(temporary, 'public'));
  const expected = ['index.html', 'player.js', 'launch-state.mjs', 'transport.mjs', 'style.css', 'motion.css', 'apps.js', 'robots.txt', 'assets/brand/s-box.svg', ...apps.flatMap(app => [app.art.slice(1), app.icon.slice(1)])];
  const found = await readdir(output, { recursive: true, withFileTypes: true });
  assert.deepEqual(found.filter(entry => entry.isFile()).map(entry => path.relative(output, path.join(entry.parentPath, entry.name))).sort(), expected.sort());
  for (const name of ['player.js', 'transport.mjs', 'launch-state.mjs']) {
    assert.doesNotMatch(await readFile(path.join(output, name), 'utf8'), /\b(?:fetch|EventSource|WebSocket|BroadcastChannel|localStorage|sessionStorage)\b/);
  }
  assert.match(await readFile(path.join(output, 'index.html'), 'utf8'), />미리보기<\/span>/);
});

test('two static pages have independent launch and home state without network access', async () => {
  const a = [], b = [];
  const first = createConsoleTransport({ onApp: app => a.push(app), onStatus() {} });
  const second = createConsoleTransport({ onApp: app => b.push(app), onStatus() {} });
  await first.send('/launch', { app: apps[0].id });
  assert.deepEqual(a, [null, apps[0].id]); assert.deepEqual(b, [null]);
  await second.send('/launch', { app: apps[1].id });
  await first.send('/home');
  assert.deepEqual(a, [null, apps[0].id, null]); assert.deepEqual(b, [null, apps[1].id]);
});
