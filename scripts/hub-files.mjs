import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { root, apps } from '../src/config.mjs';
export async function hubFiles(config) {
  const files = [];
  for (const name of ['index.html','hub.css','hub.js','launch.mjs','contract.mjs','browser-console.mjs','remote.mjs']) files.push([name, await readFile(path.join(root,'hub',name))]);
  for (const asset of ['assets/brand/gaming-hub.svg','assets/brand/s-box.svg',...apps.flatMap(app => [app.art.slice(1),app.icon.slice(1)])]) files.push([asset, await readFile(path.join(root,asset))]);
  const games = apps.map(app => ({ ...app, art:app.art.slice(1), icon:app.icon.slice(1) }));
  files.push(['apps.js',`window.DEMO_APPS = ${JSON.stringify(games)};\n`]);
  files.push(['hub-config.js',`window.HUB_CONFIG = ${JSON.stringify(config)};\n`]);
  return files;
}
