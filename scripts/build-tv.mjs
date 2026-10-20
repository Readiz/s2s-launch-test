import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { apps, loadConfig, root } from '../src/config.mjs';
import { zip, icon } from './zip.mjs';

const config = await loadConfig();
for (const [i, app] of apps.entries()) {
  const letter = app.key.toUpperCase();
  const packageId = app.id.split('.')[0];
  const files = [];
  for (const file of ['index.html','launcher.js','hdmi.js']) files.push([file,await readFile(path.join(root,'tv',file))]);
  files.push(['config.js',`window.APP_CONFIG = ${JSON.stringify({app:app.id,name:app.name,pcBUrl:config.pcBUrl,hdmi:config.hdmi},null,2)};\n`]);
  files.push(['config.xml',`<?xml version="1.0" encoding="UTF-8"?>
<widget xmlns="http://www.w3.org/ns/widgets" xmlns:tizen="http://tizen.org/ns/widgets" id="https://s2s-launch-test.local/game-${app.key}" version="0.1.0" viewmodes="maximized">
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
  files.push(['icon.png',icon(letter,[[37,99,203],[23,116,81],[106,64,169]][i])]);
  const target=path.join(root,'build/tv',`game-${app.key}`);
  await mkdir(target,{recursive:true});
  for(const [name,data] of files) await writeFile(path.join(target,name),data);
  await mkdir(path.join(root,'dist/unsigned'),{recursive:true});
  await writeFile(path.join(root,'dist/unsigned',`game-${app.key}.wgt`),zip(files));
}
console.log('A/B/C WGT generated in dist/unsigned (sign before TV installation).');
