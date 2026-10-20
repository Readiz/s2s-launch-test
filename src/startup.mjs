import { createInterface } from 'node:readline/promises';
import { networkInterfaces } from 'node:os';
import { readFile, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function serverAddress(input, port = 4100) {
  const value = input.trim();
  if (!value) throw new Error('PC B 주소를 입력하세요.');
  const url = new URL(value.includes('://') ? value : `http://${value}`);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('PC B의 IP 또는 HTTP(S) 기본 주소만 입력하세요.');
  if (!value.includes('://') && !url.port) url.port = String(port);
  return url.origin;
}
export async function promptConfig(role, config, { input = process.stdin, output = process.stdout } = {}) {
  const local = Object.values(networkInterfaces()).flat().filter(item => item && item.family === 'IPv4' && !item.internal).map(item => item.address);
  output.write(role === 'a' ? '\nPC A 콘솔: 연결할 PC B 서버 주소를 입력하세요.\n' : '\nPC B 중계 서버: 이 PC의 LAN 주소를 입력하세요. PC A와 TV가 이 주소로 연결합니다.\n');
  if (role === 'b' && local.length) output.write(`이 PC의 LAN IP: ${[...new Set(local)].join(', ')}\n`);
  const fallback = config.pcBUrl || (role === 'b' && local[0] ? `http://${local[0]}:${config.pcBPort}` : `http://127.0.0.1:${config.pcBPort}`);
  const rl = createInterface({ input, output });
  let closed = false;
  rl.on('close', () => { closed = true; });
  try {
    for (;;) {
      const answer = await rl.question(`PC B IP 또는 URL (같은 PC면 127.0.0.1, Enter면 저장값) [${fallback}]: `);
      let pcBUrl;
      try { pcBUrl = serverAddress(answer.trim() || fallback, config.pcBPort); }
      catch (error) { output.write(`${error.message}\n`); if (closed) throw error; continue; }
      if (role === 'b' && new URL(pcBUrl).protocol === 'http:' && Number(new URL(pcBUrl).port || 80) !== config.pcBPort) {
        output.write(`PC B 서버는 ${config.pcBPort} 포트로 실행됩니다. 프록시 없이 연결한다면 같은 포트를 입력하세요.\n`);
      }
      const root = fileURLToPath(new URL('../', import.meta.url));
      const file = path.join(root, 'config.local.json');
      let saved = {};
      try { saved = JSON.parse(await readFile(file, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
      saved.pcBUrl = pcBUrl;
      const temporary = file + '.tmp';
      await writeFile(temporary, JSON.stringify(saved, null, 2) + '\n', { mode: 0o600 });
      await rename(temporary, file);
      output.write('주소를 config.local.json에 저장했습니다. 다음 실행 때 Enter로 재사용합니다.\n');
      return { ...config, pcBUrl };
    }
  } finally { rl.close(); }
}
