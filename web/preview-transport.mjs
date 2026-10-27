import { connectPreviewBridge } from './preview-bridge.mjs';
// Standalone pages keep independent state; only their opening Hub may send commands.
export function createConsoleTransport({ onApp, onStatus }, host = window) {
  onStatus('미리보기'); onApp(null);
  const bridge = connectPreviewBridge({ onApp, onStatus, apps: host.DEMO_APPS, hubOrigin: host.PREVIEW_CONFIG.hubOrigin }, host);
  return {
    async send(route, body) {
      if (route === '/home') onApp(null);
      else if (route === '/launch' && typeof body?.app === 'string') onApp(body.app);
      else throw new Error('지원하지 않는 화면 동작입니다.');
    },
    close() { bridge.close(); }
  };
}
