// Shared browser preview, isolated from the local HDMI/WGT demo ports.
import { createServer, listen } from '../src/server.mjs';

function port(value, fallback) {
  const result = Number(value || fallback);
  if (!Number.isInteger(result) || result < 1 || result > 65535) throw new Error('Invalid preview port');
  return result;
}
const consolePort = port(process.env.SBOX_CONSOLE_PORT, 4491);
const relayPort = port(process.env.SBOX_RELAY_PORT, 4490);
if (consolePort === relayPort) throw new Error('Preview console and relay require different ports');
const config = { pcBUrl: `http://127.0.0.1:${relayPort}` };
const relay = createServer('b', config);
const consoleServer = createServer('a', config);
await listen(relay, relayPort, '127.0.0.1');
try {
  await listen(consoleServer, consolePort, '127.0.0.1');
} catch (error) {
  await relay.shutdown();
  throw error;
}
console.log(`S Box preview ready: console 127.0.0.1:${consolePort}, relay 127.0.0.1:${relayPort}`);
let closing = false;
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => {
  if (closing) return;
  closing = true;
  await consoleServer.shutdown();
  await relay.shutdown();
  process.exit();
});
