import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { apps, loadConfig, root } from '../src/config.mjs';
import { zip } from './zip.mjs';

const config = await loadConfig();
const { version } = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
for (const app of apps) {
  const packageId = app.id.split('.')[0];
  const files = [];
  for (const file of ['index.html','launcher.js','hdmi.js']) files.push([file,await readFile(path.join(root,'tv',file))]);
  files.push(['config.js',`window.APP_CONFIG = ${JSON.stringify({app:app.id,name:app.name,pcBUrl:config.pcBUrl,hdmi:config.hdmi},null,2)};\n`]);
  files.push(['config.xml',`<?xml version="1.0" encoding="UTF-8"?>
<widget xmlns="http://www.w3.org/ns/widgets" xmlns:tizen="http://tizen.org/ns/widgets" id="https://s2s-launch-test.local/game-${app.key}" version="${version}" viewmodes="maximized">
  <tizen:application id="${app.id}" package="${packageId}" required_version="5.5"/>
  <content src="index.html"/>
  <icon src="icon.png"/>
  <name>${app.name}</name>
  <access origin="*" subdomains="true"/>
  <tizen:privilege name="http://tizen.org/privilege/internet"/>
  <tizen:privilege name="http://tizen.org/privilege/application.launch"/>
  <tizen:profile name="tv-samsung"/>
  <tizen:setting screen-orientation="landscape" context-menu="disable" background-support="disable" encryption="disable" install-location="auto" hwkey-event="enable"/>
  <tizen:metadata key="http://samsung.com/tv/metadata/use.network" value="true"/>
</widget>
`]);
  files.push(['icon.png', await readFile(path.join(root, app.icon.slice(1).replace('/icon.png', '/icon-117.png')))]);
  const target=path.join(root,'build/tv',`game-${app.key}`);
  await mkdir(target,{recursive:true});
  for(const [name,data] of files) await writeFile(path.join(target,name),data);
  await mkdir(path.join(root,'dist/unsigned'),{recursive:true});
  await writeFile(path.join(root,'dist/unsigned',`game-${app.key}.wgt`),zip(files));
}
console.log('WGT 생성 완료: ' + apps.map(app => app.name).join(', ') + ' (dist/unsigned, TV 설치 전 서명 필요)');
