import { mkdir, rename, rm, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { apps, root } from '../src/config.mjs';
import { defaultControl } from '../hub/contract.mjs';
import { hubFiles } from './hub-files.mjs';
async function writeExport(output, files) {
  const stage = output + '.pending';
  await rm(stage,{recursive:true,force:true}); await mkdir(stage,{recursive:true});
  try {
    for (const [name,data] of files) { const target=path.join(stage,name); await mkdir(path.dirname(target),{recursive:true}); await writeFile(target,data); }
    await writeFile(path.join(stage,'robots.txt'),'User-agent: *\nDisallow: /\n');
    await rm(output,{recursive:true,force:true}); await rename(stage,output); return output;
  } catch (error) { await rm(stage,{recursive:true,force:true}); throw error; }
}
export async function buildPreview(output = path.join(root,'dist/preview'), { hubOrigin = 'https://gaminghub.dev.readiz.com' } = {}) {
  const names=['index.html','player.js','launch-state.mjs','style.css','motion.css','preview-bridge.mjs'];
  const files=await Promise.all(names.map(async name=>[name,await readFile(path.join(root,'web',name))]));
  files.push(['transport.mjs',await readFile(path.join(root,'web/preview-transport.mjs'))],['hub/contract.mjs',await readFile(path.join(root,'hub/contract.mjs'))]);
  for (const asset of ['/assets/brand/s-box.svg',...apps.flatMap(app=>[app.art,app.icon])]) files.push([asset.slice(1),await readFile(path.join(root,asset.slice(1)))]);
  files.push(['apps.js',`window.DEMO_APPS = ${JSON.stringify(apps)};\nwindow.PREVIEW_CONFIG = ${JSON.stringify({hubOrigin})};\n`]);
  const html=files.find(([name])=>name==='index.html'); html[1]=html[1].toString().replace('>연결 중</span>','>미리보기</span>');
  return writeExport(output,files);
}
export async function buildHubPreview(output = path.join(root,'dist/gaminghub'), { consoleUrl = 'https://sbox.dev.readiz.com' } = {}) {
  return writeExport(output,await hubFiles({...defaultControl,mode:'preview',consoleUrl}));
}
if (process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  console.log(await buildPreview()); console.log(await buildHubPreview());
}
