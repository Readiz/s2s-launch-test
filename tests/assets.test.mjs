import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { apps, root } from '../src/config.mjs';
import { createServer, listen } from '../src/server.mjs';

function entries(zip) {
  const files = new Map(); let offset = 0;
  while (zip.readUInt32LE(offset) === 0x04034b50) {
    const length = zip.readUInt32LE(offset + 18), nameLength = zip.readUInt16LE(offset + 26), extraLength = zip.readUInt16LE(offset + 28);
    const start = offset + 30 + nameLength + extraLength;
    const name = zip.subarray(offset + 30, offset + 30 + nameLength).toString();
    files.set(name, zip.subarray(start, start + length)); offset = start + length;
  }
  return files;
}
test('all WGTs carry the named game and its distinct 117px installation icon', async () => {
  await promisify(execFile)(process.execPath, ['scripts/build-tv.mjs'], { cwd: root });
  const icons = [];
  for (const app of apps) {
    const files = entries(await readFile(path.join(root, 'dist/unsigned', `game-${app.key}.wgt`)));
    assert.match(files.get('config.xml').toString(), new RegExp(`<name>${app.name}</name>`));
    assert.match(files.get('config.xml').toString(), /<icon src="icon.png"\/>/);
    const icon = files.get('icon.png');
    assert.equal(icon.readUInt32BE(16), 117); assert.equal(icon.readUInt32BE(20), 117);
    assert.deepEqual(icon, await readFile(path.join(root, app.icon.slice(1).replace('/icon.png', '/icon-117.png'))));
    icons.push(icon.toString('base64'));
  }
  assert.equal(new Set(icons).size, 3);
});
test('console serves every cover, icon, and loading module with the right media type', async t => {
  const a = createServer('a', { pcBPort: 1 });
  const address = await listen(a, 0, '127.0.0.1'); t.after(() => a.shutdown());
  const base = `http://127.0.0.1:${address.port}`;
  for (const app of apps) for (const [route, type] of [[app.art,'image/webp'],[app.icon,'image/png']]) {
    const response = await fetch(base + route);
    assert.equal(response.status, 200); assert.equal(response.headers.get('content-type'), type);
    assert.ok((await response.arrayBuffer()).byteLength > 1000);
  }
  const module = await fetch(base + '/launch-state.mjs');
  assert.equal(module.status, 200); assert.match(module.headers.get('content-type'), /javascript/);
  assert.equal((await fetch(base + '/assets/games/prompts.json')).status, 404);
});
