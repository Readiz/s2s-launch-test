import path from 'node:path';

export function startupGuide(role, config, root) {
  const b = config.pcBUrl || `http://127.0.0.1:${config.pcBPort}`;
  const a = `http://localhost:${config.pcAPort}`;
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(new URL(b).hostname);
  const lines = [''];
  if (role === 'a') {
    lines.push(
      '=== PC A 콘솔 실행 중 ===',
      `1. 이 PC의 브라우저에서 열기: ${a}`,
      '2. 홈에서 방향키 + Enter로 게임 실행, Esc로 홈 복귀',
      '3. TV에 HDMI로 연결했다면 F11 또는 화면의 전체화면 버튼 사용',
      '',
      `연결할 PC B 주소: ${b}`,
      'B가 아직 꺼져 있어도 콘솔은 사용할 수 있고, B 연결은 자동 재시도합니다.',
      'A 주소를 다른 기기에 입력하거나 B에 등록할 필요는 없습니다.'
    );
  } else {
    lines.push(
      '=== PC B 중계 서버 실행 중 ===',
      `다른 앱에 입력할 B 주소: ${b}`,
      '',
      '1. 각 PC A에서 start-pc-a.cmd를 실행하고 위 B 주소를 입력하세요.',
      '2. A 실행 창에 표시되는 콘솔 주소를 그 A의 브라우저에서 여세요.',
      '3. 아래 미리보기 중 하나를 브라우저에서 열면 연결된 모든 A의 앱이 바뀝니다.',
      ...['a', 'b', 'c'].map(key => `   ${key.toUpperCase()}게임: ${b}/tv/game-${key}/`),
      '',
      `연결된 A 개수 확인: ${b}/status`,
      `TV 앱 패키지(서명 전): ${path.join(root, 'dist', 'unsigned')}`,
      '실제 TV에는 WGT 서명 후 설치하세요. C# 내부 서비스도 별도 설치해야 합니다.'
    );
  }
  if (loopback) lines.push('', '현재 B 주소는 같은 PC에서만 쓰는 루프백 주소입니다.',
    'TV나 다른 PC도 연결하려면 B를 다시 실행해 B의 LAN IP를 입력하고, 각 A와 WGT도 그 주소로 맞추세요.');
  lines.push('', '관리할 서버 주소는 B 주소 하나입니다. 종료: 이 창에서 Ctrl+C', '');
  return lines.join('\n');
}

export function localDemoGuide(config) {
  return [
    '', '=== 한 PC에서 A + B 실행 중 ===',
    `1. 콘솔 화면을 먼저 열어 두세요: http://localhost:${config.pcAPort}`,
    '2. 다른 브라우저 탭에서 아래 주소를 열면 콘솔의 게임이 바뀝니다.',
    ...['a', 'b', 'c'].map(key => `   ${key.toUpperCase()}게임: http://localhost:${config.pcBPort}/tv/game-${key}/`),
    '3. 콘솔에서는 방향키 + Enter로 실행, Esc로 홈 복귀, F11로 전체화면',
    '', 'A는 이 PC의 B에 루프백으로 자동 연결했습니다. IP 입력은 필요 없습니다.',
    '미리보기의 HDMI 미지원 안내는 PC 브라우저에 Tizen API가 없어서 표시됩니다.',
    '실제 TV/다른 PC를 연결할 때는 A/B를 개별 실행하고 B의 LAN IP를 입력하세요.',
    '종료: 이 창에서 Ctrl+C (A와 B 함께 종료)', ''
  ].join('\n');
}
