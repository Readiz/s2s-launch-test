import test from 'node:test';
import assert from 'node:assert/strict';
import { createHubLauncher } from '../hub/launch.mjs';
import { defaultControl, makeRequest, readDeepLink } from '../hub/contract.mjs';
import { apps } from '../src/config.mjs';
function fixture() {
  const calls=[],timers=new Map();let key=0;
  const host={setTimeout:fn=>{timers.set(++key,fn);return key;},clearTimeout:id=>timers.delete(id),
    tizen:{ApplicationControl:function(...args){this.args=args;},application:{launchAppControl:(control,id,ok,fail)=>calls.push({control,id,ok,fail})}},
    fetch(){throw new Error('WGT must not issue HTTP');},open(){throw new Error('WGT must not open a console browser');}};
  return {host,calls,timers,launcher:createHubLauncher({...defaultControl,mode:'tizen'},apps,host)};
}
test('three selections dispatch exact game URIs to one service without HTTP or auto-exit',async()=>{
  const f=fixture();
  for(const app of apps){
    const pending=f.launcher.launch(app.id),call=f.calls.at(-1);
    assert.equal(call.id,'com.hssg.tvservice');
    assert.deepEqual(call.control.args,[defaultControl.operation,'sbox://launch?app='+app.id,null,null,[],'SINGLE']);
    call.ok();assert.deepEqual(await pending,{kind:'tizen'});assert.equal(f.timers.size,0);
  }
  assert.equal(f.calls.length,3);
});
test('pending control blocks duplicate activation; a failure permits another selection',async()=>{
  const f=fixture(),first=f.launcher.launch(apps[0].id);
  await assert.rejects(f.launcher.launch(apps[1].id),/실행 요청/);assert.equal(f.calls.length,1);
  f.calls[0].fail({name:'NotFoundError',message:'fixture'});await assert.rejects(first,/NotFoundError/);
  const next=f.launcher.launch(apps[1].id);f.calls[1].ok();await next;
});
test('timeout ignores late callbacks and releases the launcher',async()=>{
  const f=fixture(),first=f.launcher.launch(apps[0].id);
  [...f.timers.values()][0]();await assert.rejects(first,/초과/);
  const next=f.launcher.launch(apps[2].id);f.calls[0].ok();assert.equal(f.timers.size,1);f.calls[1].ok();await next;
});
test('missing TV API, unknown game and synchronous platform errors are recoverable',async()=>{
  const f=fixture();await assert.rejects(f.launcher.launch('unknown'),/등록되지/);assert.equal(f.calls.length,0);
  f.host.tizen.application.launchAppControl=()=>{throw new Error('SecurityError');};
  await assert.rejects(f.launcher.launch(apps[0].id),/SecurityError/);assert.equal(f.timers.size,0);
  delete f.host.tizen;await assert.rejects(f.launcher.launch(apps[0].id),/TV/);
});
test('deep links round trip and reject unknown or ambiguous targets',()=>{
  for(const app of apps)assert.equal(readDeepLink(makeRequest(app.id,defaultControl,apps).uri,apps),app.id);
  for(const uri of ['https://launch?app='+apps[0].id,'sbox://launch?app=unknown','sbox://user@launch?app='+apps[0].id,'sbox://launch:80?app='+apps[0].id,'sbox://launch?app='+apps[0].id+'&app='+apps[1].id,'sbox://launch/path?app='+apps[0].id,'sbox://launch?app='+apps[0].id+'&other=x'])assert.throws(()=>readDeepLink(uri,apps));
});
