import test from 'node:test';
import assert from 'node:assert/strict';
import { serverAddress } from '../src/startup.mjs';
import { websocketUrl } from '../src/console-link.mjs';
test('startup accepts an IP, hostname, explicit port, or HTTPS endpoint', () => {
  assert.equal(serverAddress('192.168.0.20'), 'http://192.168.0.20:4100');
  assert.equal(serverAddress('pc-b:5000'), 'http://pc-b:5000');
  assert.equal(serverAddress('https://relay.example.com'), 'https://relay.example.com');
  assert.equal(websocketUrl('https://relay.example.com').href, 'wss://relay.example.com/console');
  assert.equal(websocketUrl('http://pc-b:4100').href, 'ws://pc-b:4100/console');
  for (const value of ['ftp://pc-b', 'http://user:secret@pc-b', 'http://pc-b/path', 'http://pc-b?token=secret']) assert.throws(() => serverAddress(value));
});
