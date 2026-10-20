import { randomUUID, timingSafeEqual } from 'node:crypto';
import WebSocket, { WebSocketServer } from 'ws';

export function websocketUrl(base) {
  const url = new URL('/console', base);
  if (!['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol)) throw new Error('PC B 주소는 HTTP(S) 또는 WS(S) URL이어야 합니다.');
  url.protocol = ['https:', 'wss:'].includes(url.protocol) ? 'wss:' : 'ws:';
  return url;
}

export function createRelay(server, { token = '', timeoutMs = 3000, heartbeatMs = 15000 } = {}) {
  const clients = new Set();
  const pending = new Map();
  const wss = new WebSocketServer({ noServer: true, maxPayload: 4096, perMessageDeflate: false });
  let stopped = false;

  function finish(id) {
    const batch = pending.get(id);
    if (!batch || [...batch.results.values()].some(value => value === null)) return;
    clearTimeout(batch.timer);
    pending.delete(id);
    const results = [...batch.results.values()];
    const delivered = results.filter(result => result.ok).length;
    const failed = results.length - delivered;
    const status = !failed ? 200 : delivered ? 207 : results.some(result => result.timeout) ? 504 : 503;
    const body = { ok: !failed, app: batch.app, total: results.length, delivered, failed };
    if (failed) body.error = `콘솔 ${results.length}대 중 ${failed}대가 앱 전환 명령을 처리하지 못했습니다.`;
    batch.resolve({ status, body });
  }
  function disconnected(socket) {
    clients.delete(socket);
    for (const [id, batch] of pending) {
      if (batch.results.has(socket) && batch.results.get(socket) === null) {
        batch.results.set(socket, { ok: false });
        finish(id);
      }
    }
  }
  server.on('upgrade', (request, socket, head) => {
    let route;
    try { route = new URL(request.url, 'http://localhost').pathname; } catch { socket.destroy(); return; }
    if (stopped || route !== '/console') { socket.end('HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n'); return; }
    if (token) {
      const actual = Buffer.from(request.headers.authorization || '');
      const expected = Buffer.from(`Bearer ${token}`);
      if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
        socket.end('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n'); return;
      }
    }
    wss.handleUpgrade(request, socket, head, ws => wss.emit('connection', ws));
  });
  wss.on('connection', socket => {
    socket.alive = true;
    clients.add(socket);
    socket.on('pong', () => { socket.alive = true; });
    socket.on('error', () => {});
    socket.on('close', () => disconnected(socket));
    socket.on('message', (data, binary) => {
      if (binary) { socket.close(1003, 'Text JSON required'); return; }
      let message;
      try { message = JSON.parse(data.toString()); } catch { socket.close(1003, 'Invalid JSON'); return; }
      if (message?.type !== 'launch-result' || typeof message.ok !== 'boolean') return;
      const batch = pending.get(message.requestId);
      if (!batch || !batch.results.has(socket) || batch.results.get(socket) !== null) return;
      batch.results.set(socket, { ok: message.ok });
      finish(message.requestId);
    });
  });
  const heartbeat = setInterval(() => {
    for (const socket of clients) {
      if (!socket.alive) { socket.terminate(); continue; }
      socket.alive = false;
      socket.ping();
    }
  }, heartbeatMs);
  heartbeat.unref();

  return {
    get count() { return [...clients].filter(socket => socket.readyState === WebSocket.OPEN).length; },
    launch(app) {
      const targets = [...clients].filter(socket => socket.readyState === WebSocket.OPEN);
      if (!targets.length) return Promise.resolve({ status: 503, body: { ok: false, app, total: 0, delivered: 0, failed: 0, error: '연결된 PC A 콘솔이 없습니다.' } });
      return new Promise(resolve => {
        const requestId = randomUUID();
        const batch = { app, resolve, results: new Map(targets.map(socket => [socket, null])) };
        pending.set(requestId, batch);
        batch.timer = setTimeout(() => {
          for (const [socket, result] of batch.results) if (result === null) batch.results.set(socket, { ok: false, timeout: true });
          finish(requestId);
        }, timeoutMs);
        const message = JSON.stringify({ type: 'launch', requestId, app });
        for (const socket of targets) socket.send(message, error => {
          if (error && pending.has(requestId) && batch.results.get(socket) === null) {
            batch.results.set(socket, { ok: false });
            finish(requestId);
          }
        });
      });
    },
    close() {
      stopped = true;
      clearInterval(heartbeat);
      for (const socket of clients) { disconnected(socket); socket.terminate(); }
      wss.close();
    }
  };
}

export function connectConsole(base, launch, { token = '', retryMs = 1000, maxRetryMs = 10000, heartbeatTimeoutMs = 45000 } = {}) {
  const url = websocketUrl(base);
  let socket, retry, watchdog, stopped = false, delay = retryMs;
  const link = { connected: false, close() {
    stopped = true;
    clearTimeout(retry);
    clearTimeout(watchdog);
    socket?.terminate();
    link.connected = false;
  } };
  function alive() {
    clearTimeout(watchdog);
    watchdog = setTimeout(() => socket.terminate(), heartbeatTimeoutMs);
    watchdog.unref();
  }
  function connect() {
    if (stopped) return;
    socket = new WebSocket(url, { headers: token ? { Authorization: `Bearer ${token}` } : {}, handshakeTimeout: 5000, maxPayload: 4096, perMessageDeflate: false });
    socket.on('error', () => {});
    socket.on('open', () => { link.connected = true; delay = retryMs; alive(); });
    socket.on('ping', alive);
    socket.on('message', (data, binary) => {
      if (binary) return;
      let message;
      try { message = JSON.parse(data.toString()); } catch { return; }
      if (message?.type !== 'launch' || typeof message.requestId !== 'string' || typeof message.app !== 'string') return;
      let result;
      try { result = launch(message.app); } catch { result = { status: 500, body: { error: '콘솔 명령 처리 오류' } }; }
      if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'launch-result', requestId: message.requestId, ok: result.status === 200, error: result.body.error }));
    });
    socket.on('close', () => {
      link.connected = false;
      clearTimeout(watchdog);
      if (stopped) return;
      retry = setTimeout(connect, delay);
      retry.unref();
      delay = Math.min(delay * 2, maxRetryMs);
    });
  }
  connect();
  return link;
}
