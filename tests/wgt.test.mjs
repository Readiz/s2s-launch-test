import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
const defaults=JSON.parse(await readFile(new URL('../config.json',import.meta.url),'utf8'));
assert.equal(defaults.hdmi.appId,'com.hssg.tvservice');
assert.equal(defaults.hdmi.operation,'http://hssg.com/appcontrol/operation/activate_hdmi');
assert.deepEqual(defaults.hdmi.data,[]);
const hdmi=await readFile(new URL('../tv/hdmi.js',import.meta.url),'utf8');
const launcher=await readFile(new URL('../tv/launcher.js',import.meta.url),'utf8');
function run() {
  const events=[],nodes={name:{},status:{}};
  let xhr,success,failure,deadline,exits=0;
  const config={app:'R7kP2mN9vQ.ApexRacing',name:'A게임',pcBUrl:'http://pc-b.test:4100',hdmi:defaults.hdmi};
  const context={
    APP_CONFIG:config,document:{getElementById:id=>nodes[id]},location:{protocol:'file:'},
    console:{error:()=>{}},setTimeout:fn=>{deadline=fn;return 1;},clearTimeout:()=>{},
    XMLHttpRequest:function() {
      xhr=this;this.readyState=1;
      this.open=(method,url)=>{assert.equal(method,'POST');assert.equal(url,'http://pc-b.test:4100/launch');};
      this.setRequestHeader=()=>{};
      this.send=body=>{events.push('http');assert.deepEqual(JSON.parse(body),{app:config.app});};
      this.abort=()=>{events.push('abort');};
    },
    tizen:{
      ApplicationControlData:function(key,value){this.key=key;this.value=value;},
      ApplicationControl:function(operation,uri,mime,category,data,launchMode){this.operation=operation;this.data=data;assert.equal(uri,null);assert.equal(mime,null);assert.equal(category,null);assert.equal(launchMode,'SINGLE');},
      application:{
        launchAppControl:(control,id,ok,fail)=>{
          events.push('appcontrol');assert.equal(id,'com.hssg.tvservice');assert.equal(control.operation,'http://hssg.com/appcontrol/operation/activate_hdmi');
          assert.equal(control.data.length,0);success=ok;failure=fail;
        },
        getCurrentApplication:()=>({exit:()=>{exits++;events.push('exit');}})
      }
    }
  };
  context.window=context;
  vm.runInNewContext(hdmi,context);vm.runInNewContext(launcher,context);
  return {events,exitCount:()=>exits,httpDone:()=>{xhr.readyState=4;xhr.status=200;xhr.responseText='{"ok":true}';xhr.onload();},httpFailed:()=>{xhr.readyState=4;xhr.onerror();},hdmiDone:()=>success(),hdmiFailed:()=>failure({name:'NotFoundError',message:'Fixture service unavailable'}),timeout:()=>deadline()};
}
test('WGT dispatches HTTP and App Control immediately, exits after both callbacks',()=>{
  const app=run();assert.deepEqual(app.events,['http','appcontrol']);assert.equal(app.exitCount(),0);
  app.hdmiDone();assert.equal(app.exitCount(),0);
  app.httpDone();assert.equal(app.exitCount(),1);
  app.hdmiDone();assert.equal(app.exitCount(),1);
});
test('missing callback cannot keep the WGT alive indefinitely',()=>{
  const app=run();app.timeout();assert.equal(app.exitCount(),1);
  app.httpDone();app.hdmiDone();assert.equal(app.exitCount(),1);
});
test('HTTP completion does not exit before the App Control callback',()=>{
  const app=run();app.httpDone();assert.equal(app.exitCount(),0);
  app.hdmiDone();assert.equal(app.exitCount(),1);
});
test('failed HTTP and App Control calls still end the WGT',()=>{
  const app=run();app.httpFailed();assert.equal(app.exitCount(),0);
  app.hdmiFailed();assert.equal(app.exitCount(),1);
});
