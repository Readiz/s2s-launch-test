import { copyFile, mkdir, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { apps, root } from '../src/config.mjs';

// Publish an allowlist only: never copy local config, WGTs, source or credentials.
export async function buildPreview(output = path.join(root, 'dist/preview')) {
  const stage = output + '.pending';
  await rm(stage, { recursive: true, force: true });
  await mkdir(stage, { recursive: true });
  const files = new Map(['index.html', 'player.js', 'launch-state.mjs', 'style.css', 'motion.css'].map(name => [name, 'web/' + name]));
  files.set('transport.mjs', 'web/preview-transport.mjs');
  for (const asset of ['/assets/brand/s-box.svg', ...apps.flatMap(app => [app.art, app.icon])]) files.set(asset.slice(1), asset.slice(1));
  try {
    for (const [name, source] of files) {
      const target = path.join(stage, name);
      await mkdir(path.dirname(target), { recursive: true });
      await copyFile(path.join(root, source), target);
    }
    await writeFile(path.join(stage, 'apps.js'), `window.DEMO_APPS = ${JSON.stringify(apps)};\n`);
    await writeFile(path.join(stage, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
    // The browser never presents a server-connection state in the static preview.
    const { readFile } = await import('node:fs/promises');
    const html = await readFile(path.join(stage, 'index.html'), 'utf8');
    await writeFile(path.join(stage, 'index.html'), html.replace('>연결 중</span>', '>미리보기</span>'));
    await rm(output, { recursive: true, force: true });
    await rename(stage, output);
    return output;
  } catch (error) {
    await rm(stage, { recursive: true, force: true });
    throw error;
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) console.log(await buildPreview());
