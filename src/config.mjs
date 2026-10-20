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
  {
    key: 'a', id: 'R7kP2mN9vQ.ApexRacing', name: 'Apex Racing', genre: 'RACING',
    art: '/assets/games/apex-racing/cover.webp', icon: '/assets/games/apex-racing/icon.png',
    description: '해안 도로 너머, 다음 코너가 기다립니다.', tagline: 'Find your line. Chase the horizon.',
    loading: '트랙과 차량을 준비하고 있습니다', startLabel: '레이스 시작', world: 'SUNSET COAST / COASTAL CIRCUIT',
    readyText: 'Sunset Coast 서킷과 차량 준비가 끝났습니다.'
  },
  {
    key: 'b', id: 'F3bT8xL4cW.ForestQuest', name: 'Forest Quest', genre: 'ADVENTURE',
    art: '/assets/games/forest-quest/cover.webp', icon: '/assets/games/forest-quest/icon.png',
    description: '오래된 숲의 문이 새로운 여정을 엽니다.', tagline: 'Beyond the trees, a world awaits.',
    loading: '숲의 세계를 불러오고 있습니다', startLabel: '모험 시작', world: 'THE EMERALD GATE / CHAPTER I',
    readyText: '첫 번째 여정, Emerald Gate에 도착했습니다.'
  },
  {
    key: 'c', id: 'O6nH1sD5aZ.OrbitArena', name: 'Orbit Arena', genre: 'SPACE ACTION',
    art: '/assets/games/orbit-arena/cover.webp', icon: '/assets/games/orbit-arena/icon.png',
    description: '궤도 위의 아레나, 한계를 넘어 비행하세요.', tagline: 'Own the orbit. Enter the arena.',
    loading: '함선과 아레나를 준비하고 있습니다', startLabel: '아레나 입장', world: 'ORBITAL RING / SECTOR 07',
    readyText: 'Sector 07 아레나와 함선 준비가 끝났습니다.'
  }
];
