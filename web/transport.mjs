// Device-only transport. The public static build replaces this module.
export function createConsoleTransport({ onApp, onStatus }) {
  const stream = new EventSource('/events');
  stream.onopen = () => onStatus('● 연결됨');
  stream.onmessage = event => onApp(JSON.parse(event.data).app);
  stream.onerror = () => onStatus('재연결 중…');
  return {
    async send(route, body) {
      const response = await fetch(route, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || '요청을 처리하지 못했습니다.');
    },
    close() { stream.close(); }
  };
}
