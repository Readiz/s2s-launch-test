import { createLaunchState } from './launch-state.mjs';
const $ = id => document.getElementById(id);
const apps = window.DEMO_APPS;
let selected = 0, activeApp = null, busy = false;
const dialog = $('game-dialog');
const preloaded = apps.map(app => { const image = new Image(); image.src = app.art; return image; });
const tiles = apps.map((app, index) => {
  const button = document.createElement('button');
  button.type = 'button'; button.className = 'game'; button.dataset.key = app.key;
  button.setAttribute('aria-label', app.name + ' 실행');
  const art = document.createElement('img'); art.className = 'tile-art'; art.src = app.art; art.alt = '';
  const icon = document.createElement('img'); icon.className = 'tile-icon'; icon.src = app.icon; icon.alt = '';
  const label = document.createElement('span'); label.className = 'game-label';
  const name = document.createElement('strong'); name.textContent = app.name;
  const genre = document.createElement('span'); genre.textContent = app.genre;
  label.append(name, genre); button.append(art, icon, label);
  button.onfocus = () => select(index, false);
  button.onclick = () => send('/launch', { app: app.id });
  $('library').append(button); return button;
});
function select(index, focus = true) {
  selected = (index + apps.length) % apps.length;
  const app = apps[selected];
  tiles.forEach((tile, i) => { tile.classList.toggle('selected', i === selected); tile.tabIndex = i === selected ? 0 : -1; });
  $('featured-art').src = app.art;
  $('featured-name').textContent = app.name;
  $('featured-genre').textContent = app.genre;
  $('featured-description').textContent = app.description;
  if (focus) tiles[selected].focus({ preventScroll: true });
}
function render({ phase, app }) {
  activeApp = app;
  if (dialog.open) dialog.close();
  $('home').hidden = phase !== 'home'; $('app-screen').hidden = phase === 'home';
  $('loading-screen').hidden = phase !== 'loading'; $('title-screen').hidden = phase !== 'ready';
  $('error').hidden = true;
  document.body.dataset.phase = phase; document.body.dataset.app = app?.key || 'home';
  document.title = app ? `${app.name}${phase === 'loading' ? ' · 로딩 중' : ''}` : 'Console · 라이브러리';
  $('context').textContent = app ? app.name : '게임 라이브러리';
  $('footer-hint').textContent = phase === 'home' ? '플레이할 게임을 선택하세요' : phase === 'loading' ? '게임 실행 중' : '↑ ↓ 메뉴 선택    Enter 확인';
  $('favicon').href = app?.icon || 'data:,';
  if (!app) { select(selected); return; }
  selected = apps.indexOf(app);
  $('app-screen').setAttribute('aria-label', app.name);
  $('game-art').src = app.art; $('loading-icon').src = app.icon; $('title-icon').src = app.icon;
  $('loading-name').textContent = app.name; $('game-name').textContent = app.name;
  $('loading-status').textContent = app.loading;
  $('game-genre').textContent = app.genre; $('game-tagline').textContent = app.tagline;
  $('game-world').textContent = app.world;
  $('start-game').textContent = app.startLabel;
  if (phase === 'ready') $('start-game').focus({ preventScroll: true });
  else $('back-home').focus({ preventScroll: true });
}
const launchState = createLaunchState(render);
async function send(route, body) {
  if (busy) return;
  busy = true; $('error').hidden = true;
  try {
    const response = await fetch(route, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || '요청을 처리하지 못했습니다.');
  } catch (error) { $('error').textContent = error.message; $('error').hidden = false; }
  finally { busy = false; }
}
function openDialog(options) {
  if (!activeApp) return;
  $('dialog-title').textContent = options ? '설정' : activeApp.startLabel;
  $('options-panel').hidden = !options; $('demo-panel').hidden = options;
  $('demo-scene').textContent = activeApp.world;
  $('demo-description').textContent = activeApp.readyText;
  dialog.showModal(); $('dialog-return').focus();
}
$('brand-home').onclick = event => { event.preventDefault(); send('/home'); };
$('featured-launch').onclick = () => send('/launch', { app: apps[selected].id });
$('back-home').onclick = $('menu-home').onclick = () => send('/home');
$('start-game').onclick = () => openDialog(false); $('game-options').onclick = () => openDialog(true);
$('dialog-close').onclick = $('dialog-return').onclick = () => dialog.close();
$('motion').onchange = () => { document.body.classList.toggle('no-motion', !$('motion').checked); };
$('fullscreen').onclick = async () => {
  try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); }
  catch { $('error').textContent = 'F11 키로 전체화면을 켜세요.'; $('error').hidden = false; }
};
document.addEventListener('keydown', event => {
  if (event.altKey || event.ctrlKey || event.metaKey || dialog.open) return;
  if (event.key === 'Escape' && activeApp) { event.preventDefault(); send('/home'); }
  else if (!activeApp && ['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown'].includes(event.key)) {
    event.preventDefault(); select(selected + (['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 1));
  } else if (!activeApp && event.key === 'Enter' && (document.activeElement === document.body || tiles.includes(document.activeElement))) {
    event.preventDefault(); if (!event.repeat) send('/launch', { app: apps[selected].id });
  } else if (document.body.dataset.phase === 'ready' && ['ArrowUp', 'ArrowDown'].includes(event.key)) {
    event.preventDefault(); const menu = [...$('game-menu').querySelectorAll('button')];
    const index = menu.indexOf(document.activeElement);
    menu[(index + (event.key === 'ArrowUp' ? -1 : 1) + menu.length) % menu.length].focus();
  }
});
select(0, false);
const stream = new EventSource('/events');
stream.onopen = () => { $('connection').textContent = '● 연결됨'; };
stream.onmessage = event => { const { app } = JSON.parse(event.data); launchState.launch(apps.find(item => item.id === app) || null); };
stream.onerror = () => { $('connection').textContent = '재연결 중…'; };
