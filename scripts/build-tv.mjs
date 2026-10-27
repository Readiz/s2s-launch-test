import { readFile, mkdir, writeFile, rm, rename } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig, root } from '../src/config.mjs';
import { hubIdentity, defaultControl } from '../hub/contract.mjs';
import { hubFiles } from './hub-files.mjs';
import { zip } from './zip.mjs';
export async function buildTv({ outputRoot = root, config } = {}) {
  config = config || await loadConfig();
  const settings={...defaultControl,...config.hub};
  const control={mode:'tizen',serviceId:settings.serviceId,operation:settings.operation,uriBase:settings.uriBase,timeoutMs:settings.timeoutMs};
  const files=await hubFiles(control);
  const {version}=JSON.parse(await readFile(path.join(root,'package.json'),'utf8'));
  files.push(['icon.png',await readFile(path.join(root,'assets/brand/gaming-hub-117.png'))]);
  files.push(['config.xml',`<?xml version="1.0" encoding="UTF-8"?>
<widget xmlns="http://www.w3.org/ns/widgets" xmlns:tizen="http://tizen.org/ns/widgets" id="https://s2s-launch-test.local/gaming-hub" version="${version}" viewmodes="maximized">
  <tizen:application id="${hubIdentity.id}" package="${hubIdentity.package}" required_version="5.5"/>
  <content src="index.html"/><icon src="icon.png"/><name>Gaming Hub</name>
  <tizen:privilege name="http://tizen.org/privilege/application.launch"/>
  <tizen:profile name="tv-samsung"/>
  <tizen:setting screen-orientation="landscape" context-menu="disable" background-support="disable" encryption="disable" install-location="auto" hwkey-event="enable"/>
</widget>
`]);
  const target=path.join(outputRoot,'build/tv/gaming-hub'), stage=target+'.pending';
  await rm(stage,{recursive:true,force:true}); await mkdir(stage,{recursive:true});
  for(const [name,data] of files) { const dest=path.join(stage,name); await mkdir(path.dirname(dest),{recursive:true}); await writeFile(dest,data); }
  await rm(target,{recursive:true,force:true}); await rename(stage,target);
  const wgt=path.join(outputRoot,'dist/unsigned/gaming-hub.wgt');
  await mkdir(path.dirname(wgt),{recursive:true}); await writeFile(wgt+'.pending',zip(files)); await rename(wgt+'.pending',wgt);
  for (const game of ['game-a','game-b','game-c']) {
    await rm(path.join(outputRoot,'build/tv',game),{recursive:true,force:true});
    await rm(path.join(outputRoot,'dist/unsigned',game+'.wgt'),{force:true});
  }
  return wgt;
}
if (process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) console.log(await buildTv());
