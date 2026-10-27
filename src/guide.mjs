export function startupGuide(role, config) {
  const b=config.pcBUrl||`http://127.0.0.1:${config.pcBPort}`;
  return role==='a'
    ? `\nS Box 콘솔: http://localhost:${config.pcAPort}\n명령 중계 연결: ${b}\n방향키와 Enter로 로컬 실행, Esc로 홈 복귀. B 연결은 자동 재시도합니다.\n종료: Ctrl+C\n`
    : `\nPC B 명령 중계: ${b}\nGaming Hub 브라우저 시뮬레이션: ${b}/\nS Box 콘솔을 먼저 열고 게임을 선택하세요. POST /launch는 기존과 같습니다.\nTV에서는 npm run build:tv로 만든 gaming-hub.wgt를 서명해 설치합니다.\nWGT는 내부 서비스에 AppControl만 보냅니다. 서비스 이후 구현은 별도입니다.\n종료: Ctrl+C\n`;
}
export function localDemoGuide(config) {
  return `\nS Box 콘솔: http://localhost:${config.pcAPort}\nGaming Hub TV 화면: http://localhost:${config.pcBPort}\nS Box를 먼저 열고 Hub에서 게임을 선택하세요. 이 로컬 브라우저 데모는 B의 HTTP로 AppControl 이후 전달을 모의합니다.\nTV WGT는 별도: npm run build:tv. 실제 내부 서비스와 HDMI 처리는 별도 연동합니다.\n종료: Ctrl+C (두 서버 함께 종료)\n`;
}
