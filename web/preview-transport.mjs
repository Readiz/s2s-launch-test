// Each page owns its state; there is no server, storage, or cross-tab channel.
export function createConsoleTransport({ onApp, onStatus }) {
  onStatus('미리보기');
  onApp(null);
  return {
    async send(route, body) {
      if (route === '/home') onApp(null);
      else if (route === '/launch' && typeof body?.app === 'string') onApp(body.app);
      else throw new Error('지원하지 않는 화면 동작입니다.');
    },
    close() {}
  };
}
