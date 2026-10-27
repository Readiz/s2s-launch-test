import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile,mkdtemp,rm,mkdir,writeFile,readdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { apps, root } from '../src/config.mjs';
import { createServer, listen } from '../src/server.mjs';
import { buildTv } from '../scripts/build-tv.mjs';
import { defaultControl,hubIdentity } from '../hub/contract.mjs';
import { crc32 } from '../scripts/zip.mjs';

function entries(zip) {
  const files = new Map(); let offset = 0;
  while (zip.readUInt32LE(offset) === 0x04034b50) {
    const length = zip.readUInt32LE(offset + 18), nameLength = zip.readUInt16LE(offset + 26), extraLength = zip.readUInt16LE(offset + 28);
    const start = offset + 30 + nameLength + extraLength;
    const name = zip.subarray(offset + 30, offset + 30 + nameLength).toString();
    assert.equal(crc32(zip.subarray(start,start+length)),zip.readUInt32LE(offset+14));
    files.set(name, zip.subarray(start, start + length)); offset = start + length;
  }
  return files;
}
test('one offline Hub WGT replaces old artifacts and excludes local secrets',async t=>{
  const outputRoot=await mkdtemp(path.join(os.tmpdir(),'hub-wgt-'));t.after(()=>rm(outputRoot,{recursive:true,force:true}));
  await mkdir(path.join(outputRoot,'dist/unsigned'),{recursive:true});
  for(const name of ['game-a.wgt','game-b.wgt','game-c.wgt','keep.wgt'])await writeFile(path.join(outputRoot,'dist/unsigned',name),'fixture');
  const wgt=await buildTv({outputRoot,config:{pcBUrl:'http://private.invalid',consoleToken:'secret-console-token',hub:{...defaultControl,extra:'private-extra'}}});
  assert.deepEqual((await readdir(path.join(outputRoot,'dist/unsigned'))).sort(),['gaming-hub.wgt','keep.wgt']);
  const files=entries(await readFile(wgt)),xml=files.get('config.xml').toString();
  assert.ok(xml.includes(hubIdentity.id));assert.match(xml,/<name>Gaming Hub<\/name>/);assert.doesNotMatch(xml,/privilege\/internet|<access/);
  const icon=files.get('icon.png');assert.equal(icon.readUInt32BE(16),117);assert.equal(icon.readUInt32BE(20),117);
  for(const [name,data]of files){assert.ok(!name.startsWith('/'));assert.doesNotMatch(data.toString(),/secret-console-token|private-extra|private.invalid/);}
  assert.match(files.get('hub-config.js').toString(),/"mode":"tizen"/);assert.equal([...files.keys()].filter(name=>name.endsWith('/cover.webp')).length,3);
});
test('console serves its brand, game artwork, and loading module with the right media type', async t => {
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
  const logo = await fetch(base + '/assets/brand/s-box.svg');
  assert.equal(logo.status, 200); assert.equal(logo.headers.get('content-type'), 'image/svg+xml');
  assert.match(await logo.text(), /<svg/);
  assert.equal((await fetch(base + '/assets/games/prompts.json')).status, 404);
});
