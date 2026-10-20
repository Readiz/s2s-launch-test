import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const root = fileURLToPath(new URL('../', import.meta.url));
export async function loadConfig() {
  const defaults = JSON.parse(await readFile(path.join(root, 'config.json'), 'utf8'));
  try {
    const local = JSON.parse(await readFile(path.join(root, 'config.local.json'), 'utf8'));
    return { ...defaults, ...local, hdmi: { ...defaults.hdmi, ...local.hdmi } };
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return defaults;
  }
}
export const apps = [
  { key: 'a', id: 'R7kP2mN9vQ.ApexRacing', name: 'A게임' },
  { key: 'b', id: 'F3bT8xL4cW.ForestQuest', name: 'B게임' },
  { key: 'c', id: 'O6nH1sD5aZ.OrbitArena', name: 'C게임' }
];
