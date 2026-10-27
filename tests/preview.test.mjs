import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,readdir,readFile,rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildPreview,buildHubPreview } from '../scripts/build-preview.mjs';
import { createConsoleTransport } from '../web/preview-transport.mjs';
import { connectPreviewBridge } from '../web/preview-bridge.mjs';
import { apps } from '../src/config.mjs';
test('two public exports contain only UI assets and no private configuration',async t=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'hub-preview-'));t.after(()=>rm(dir,{recursive:true,force:true}));
  for(const [builder,name]of [[buildPreview,'sbox'],[buildHubPreview,'hub']]){
    const output=await builder(path.join(dir,name));
    const found=(await readdir(output,{recursive:true,withFileTypes:true})).filter(e=>e.isFile()).map(e=>path.relative(output,path.join(e.parentPath,e.name)));
    assert.ok(found.includes('index.html'));assert.ok(found.includes('robots.txt'));
    assert.ok(!found.some(name=>/config\.local|\.wgt$|\.key$|^src\/|^node_modules\//.test(name)));
    assert.equal(found.filter(name=>name.endsWith('/cover.webp')).length,3);
  }
  assert.match(await readFile(path.join(dir,'hub/hub-config.js'),'utf8'),/"mode":"preview"/);
  assert.doesNotMatch(await readFile(path.join(dir,'sbox/transport.mjs'),'utf8'),/fetch|EventSource|WebSocket|BroadcastChannel|localStorage/);
});
test('standalone S Box pages retain independent local state',async()=>{
  const first=[],second=[];const host={location:{hash:''},DEMO_APPS:apps,PREVIEW_CONFIG:{hubOrigin:'https://gaminghub.dev.readiz.com'}};
  const a=createConsoleTransport({onApp:app=>first.push(app),onStatus(){}},host),b=createConsoleTransport({onApp:app=>second.push(app),onStatus(){}},host);
  await a.send('/launch',{app:apps[0].id});await b.send('/launch',{app:apps[1].id});await a.send('/home');
  assert.deepEqual(first,[null,apps[0].id,null]);assert.deepEqual(second,[null,apps[1].id]);
});
test('S Box accepts only its opening Hub origin, window and token, once per request',()=>{
  const token='a'.repeat(32),requestId='b'.repeat(32),received=[],replies=[];let listener;
  const peer={postMessage:(data,origin)=>replies.push({data,origin})};
  const host={location:{hash:'#hub='+token},opener:peer,addEventListener:(_,fn)=>listener=fn,removeEventListener(){}};
  connectPreviewBridge({onApp:app=>received.push(app),onStatus(){},apps,hubOrigin:'https://gaminghub.dev.readiz.com'},host);
  const data={channel:'sbox-preview-v1',token,type:'launch',requestId,uri:'sbox://launch?app='+apps[0].id};
  const event={origin:'https://gaminghub.dev.readiz.com',source:peer,data};
  listener({...event,origin:'https://evil.invalid'});listener({...event,source:{}});listener({...event,data:{...data,token:'c'.repeat(32)}});assert.deepEqual(received,[]);
  listener(event);listener(event);assert.deepEqual(received,[apps[0].id]);assert.equal(replies.at(-1).data.ok,true);
  listener({...event,data:{...data,uri:'sbox://launch?app='+apps[1].id}});assert.equal(replies.at(-1).data.ok,false);assert.equal(received.length,1);
  assert.ok(replies.every(reply=>reply.origin==='https://gaminghub.dev.readiz.com'));
});
