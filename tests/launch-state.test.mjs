import test from 'node:test';
import assert from 'node:assert/strict';
import { createLaunchState } from '../web/launch-state.mjs';

// Keep callbacks even after cancellation to simulate one already queued by the browser.
function fixture() {
  const callbacks = [], states = [];
  const controller = createLaunchState(state => states.push(state), {
    schedule: callback => { callbacks.push(callback); return callbacks.length; }, cancel: () => {}
  });
  return { controller, callbacks, states };
}
test('a newer deep link wins even if an old loading callback runs late', () => {
  const { controller, callbacks, states } = fixture();
  controller.launch({ id: 'apex' }); controller.launch({ id: 'forest' }); controller.launch({ id: 'orbit' });
  callbacks[1](); callbacks[0]();
  assert.deepEqual(states.map(s => [s.phase, s.app.id]), [['loading','apex'], ['loading','forest'], ['loading','orbit']]);
  callbacks[2]();
  assert.deepEqual(states.at(-1), { phase: 'ready', app: { id: 'orbit' } });
});
test('returning home or disposing cancels an in-flight launch', () => {
  const { controller, callbacks, states } = fixture();
  controller.launch({ id: 'apex' }); controller.launch(null); callbacks[0]();
  assert.deepEqual(states.at(-1), { phase: 'home', app: null });
  controller.launch({ id: 'forest' }); controller.close(); callbacks[1]();
  assert.equal(states.at(-1).phase, 'loading');
});
