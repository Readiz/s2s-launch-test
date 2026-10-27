import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createRelay, connectConsole } from './console-link.mjs';

import { root, loadConfig, apps } from './config.mjs';
import { defaultControl } from '../hub/contract.mjs';
export { root, loadConfig, apps };

function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}
async function readJson(req) {
  let input = '';
  for await (const chunk of req) {
    input += chunk;
    if (input.length > 1024) throw new Error('요청이 너무 큽니다.');
  }
  return JSON.parse(input);
}
export function createServer(role, config, linkOptions = {}) {
  const browsers = new Set();
  let currentApp = null;
  let relay, link;
  function launch(app) {
    if (!apps.some(item => item.id === app)) return { status: 400, body: { error: '등록되지 않은 앱 ID입니다.' } };
    if (!browsers.size) return { status: 503, body: { error: 'PC A에서 브라우저를 먼저 열어 주세요.' } };
    currentApp = app;
    for (const browser of browsers) browser.write(`data: ${JSON.stringify({ app })}\n\n`);
    return { status: 200, body: { ok: true, app } };
  }
  const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
    const route = new URL(req.url, 'http://localhost').pathname;
    if (role === 'a' && req.method === 'POST' && route === '/home') {
      currentApp = null;
      for (const browser of browsers) browser.write(`data: ${JSON.stringify({ app: null })}\n\n`);
      json(res, 200, { ok: true, app: null });
      return;
    }
    if (req.method === 'POST' && route === '/launch') {
      let input;
      try { input = await readJson(req); }
      catch { json(res, 400, { error: 'JSON 요청이 필요합니다.' }); return; }
      if (!input || !apps.some(app => app.id === input.app)) {
        json(res, 400, { error: '등록되지 않은 앱 ID입니다.' }); return;
      }
      const result = role === 'b' ? await relay.launch(input.app) : launch(input.app);
      json(res, result.status, result.body);
      return;
    }
    if (req.method === 'GET' && route === '/status') {
      json(res, 200, role === 'b' ? { consoles: relay.count } : { relayConnected: link?.connected || false, app: currentApp, browsers: browsers.size });
      return;
    }
    if (role === 'a' && req.method === 'GET' && route === '/events') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' });
      browsers.add(res);
      res.write(`data: ${JSON.stringify({ app: currentApp })}\n\n`);
      const timer = setInterval(() => res.write(': keepalive\n\n'), 15000);
      req.on('close', () => { clearInterval(timer); browsers.delete(res); });
      return;
    }
    if (role === 'a' && req.method === 'GET' && route === '/apps.js') {
      res.writeHead(200, {'Content-Type':'text/javascript; charset=utf-8'});
      res.end(`window.DEMO_APPS = ${JSON.stringify(apps)};`);
      return;
    }
    const hubNames = { '/':'index.html','/hub.js':'hub.js','/hub.css':'hub.css','/launch.mjs':'launch.mjs','/contract.mjs':'contract.mjs','/remote.mjs':'remote.mjs','/viewport.mjs':'viewport.mjs','/browser-console.mjs':'browser-console.mjs' };
    if (role === 'b' && req.method === 'GET' && route === '/apps.js') {
      res.writeHead(200, {'Content-Type':'text/javascript; charset=utf-8'});
      res.end(`window.DEMO_APPS = ${JSON.stringify(apps.map(app=>({...app,art:app.art.slice(1),icon:app.icon.slice(1)})))};`); return;
    }
    if (role === 'b' && req.method === 'GET' && route === '/hub-config.js') {
      const hostname=['localhost','127.0.0.1'].includes(new URL('http://'+req.headers.host).hostname) ? new URL('http://'+req.headers.host).hostname : 'localhost';
      res.writeHead(200, {'Content-Type':'text/javascript; charset=utf-8'});
      res.end(`window.HUB_CONFIG = ${JSON.stringify({...defaultControl,mode:'relay',consoleUrl:`http://${hostname}:${config.pcAPort||4101}`})};`); return;
    }
    const playerFiles = { '/':'index.html','/player.js':'player.js','/launch-state.mjs':'launch-state.mjs','/transport.mjs':'transport.mjs','/style.css':'style.css','/motion.css':'motion.css' };
    const assetNames=['/assets/brand/s-box.svg',...apps.flatMap(app=>[app.art,app.icon]),...(role==='b'?['/assets/brand/gaming-hub.svg']:[])];
    const file = assetNames.includes(route) ? path.join(root,route.slice(1)) : role==='a' && playerFiles[route] ? path.join(root,'web',playerFiles[route]) : role==='b' && hubNames[route] ? path.join(root,'hub',hubNames[route]) : null;
    if (req.method === 'GET' && file) {
      try {
        const data = await readFile(file);
        const type = { '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml' }[path.extname(file)];
        res.writeHead(200, { 'Content-Type':type, 'Cache-Control':'no-store' }); res.end(data);
      } catch { json(res,404,{error:'파일이 없습니다.'}); }
      return;
    }
    json(res,404,{error:'경로를 찾을 수 없습니다.'});
  });
  if (role === 'b') relay = createRelay(server, { token: config.consoleToken, ...linkOptions });
  else server.on('listening', () => {
    link = connectConsole(config.pcBUrl || `http://127.0.0.1:${config.pcBPort || 4100}`, launch, { token: config.consoleToken, ...linkOptions });
  });
  server.shutdown = async () => {
    link?.close();
    relay?.close();
    for (const browser of browsers) browser.end();
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  };
  return server;
}
export function listen(server, port, host = '0.0.0.0') {
  return new Promise((resolve,reject) => {
    server.once('error',reject);
    server.listen(port,host,() => { server.off('error',reject); resolve(server.address()); });
  });
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const role = process.argv[2];
  if (!['a','b'].includes(role)) throw new Error('실행: node src/server.mjs a 또는 b');
  let config = await loadConfig();
  if (!process.argv.includes('--no-prompt')) {
    const { promptConfig } = await import('./startup.mjs');
    config = await promptConfig(role, config);
  }
  const server = createServer(role,config);
  const port = role === 'a' ? config.pcAPort : config.pcBPort;
  await listen(server,port,role === 'a' ? '127.0.0.1' : '0.0.0.0');
  const { startupGuide } = await import('./guide.mjs');
  console.log(startupGuide(role, config, root));
  for (const signal of ['SIGINT','SIGTERM']) process.on(signal,async()=>{await server.shutdown();process.exit();});
}
