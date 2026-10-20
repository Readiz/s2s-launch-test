import { createLaunchState } from './launch-state.mjs';
const $ = id => document.getElementById(id);
const apps = window.DEMO_APPS;
let selected = 0, activeApp = null, busy = false;
let booting = true, pendingApp = null;
let gameFullscreen = false;
let artworkGeneration = 0;
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
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
function stopArtworkTransition() {
  artworkGeneration++;
  for (const id of ['featured-art', 'featured-art-previous']) $(id).getAnimations().forEach(animation => animation.cancel());
  $('featured-art-previous').hidden = true;
}
function setFeaturedArtwork(app) {
  const art = $('featured-art'), previous = $('featured-art-previous');
  if (art.getAttribute('src') === app.art) return;
  const outgoing = art.getAttribute('src');
  stopArtworkTransition();
  art.src = app.art;
  if (!outgoing || booting || motionPreference.matches || !$('motion').checked) return;
  const generation = artworkGeneration;
  previous.src = outgoing; previous.hidden = false;
  const options = { duration: 500, easing: 'cubic-bezier(.2,.7,.2,1)' };
  art.animate([{ opacity: 0, transform: 'scale(1.035)' }, { opacity: 1, transform: 'scale(1)' }], options);
  const fade = previous.animate([{ opacity: 1 }, { opacity: 0 }], options);
  fade.onfinish = () => { if (generation === artworkGeneration) previous.hidden = true; };
}
function select(index, focus = true) {
  selected = (index + apps.length) % apps.length;
  const app = apps[selected];
  tiles.forEach((tile, i) => { tile.classList.toggle('selected', i === selected); tile.tabIndex = i === selected ? 0 : -1; });
  setFeaturedArtwork(app);
  $('featured-name').textContent = app.name;
  $('featured-genre').textContent = app.genre;
  $('featured-description').textContent = app.description;
  if (focus) tiles[selected].focus({ preventScroll: true });
}
function render({ phase, app }) {
  stopArtworkTransition();
  activeApp = app;
  if (dialog.open) dialog.close();
  $('home').hidden = phase !== 'home'; $('app-screen').hidden = phase === 'home';
  $('loading-screen').hidden = phase !== 'loading'; $('title-screen').hidden = phase !== 'ready';
  $('error').hidden = true;
  document.body.dataset.phase = phase; document.body.dataset.app = app?.key || 'home';
  document.title = app ? `${app.name}${phase === 'loading' ? ' · 로딩 중' : ''} · S Box` : 'S Box · 라이브러리';
  $('context').textContent = app ? app.name : '게임 라이브러리';
  $('footer-hint').textContent = phase === 'home' ? '플레이할 게임을 선택하세요' : phase === 'loading' ? '게임 실행 중' : '↑ ↓ 메뉴 선택    Enter 확인';
  $('favicon').href = app?.icon || '/assets/brand/s-box.svg';
  if (!app) { select(selected); return; }
  selected = apps.indexOf(app);
  $('app-screen').setAttribute('aria-label', app.name);
  $('game-art').src = app.art; $('loading-icon').src = app.icon; $('title-icon').src = app.icon;
  $('loading-name').textContent = app.name; $('game-name').textContent = app.name;
  $('loading-status').textContent = app.loading;
  $('game-genre').textContent = app.genre; $('game-tagline').textContent = app.tagline;
  $('game-world').textContent = app.world;
  $('start-game').textContent = app.startLabel;
  if (phase === 'loading') {
    for (const element of [$('game-art'), $('loading-screen').querySelector('.loading-track span')]) {
      for (const animation of element.getAnimations()) { animation.currentTime = 0; animation.play(); }
    }
  }
  if (phase === 'ready') $('start-game').focus({ preventScroll: true });
  else $('loading-screen').focus({ preventScroll: true });
}
const launchState = createLaunchState(render);
function enterGameFullscreen() {
  if (document.fullscreenElement || !document.fullscreenEnabled) return;
  document.documentElement.requestFullscreen()
    .then(() => { gameFullscreen = true; })
    .catch(() => {}); // Embedded browsers can deny native fullscreen; the game still fills the viewport.
}
document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement && gameFullscreen) {
    gameFullscreen = false;
    if (activeApp) send('/home');
  }
});
async function send(route, body) {
  if (booting || busy) return;
  if (route === '/launch') enterGameFullscreen();
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
$('menu-home').onclick = () => send('/home');
$('start-game').onclick = () => openDialog(false); $('game-options').onclick = () => openDialog(true);
$('dialog-close').onclick = $('dialog-return').onclick = () => dialog.close();
$('motion').onchange = () => {
  document.body.classList.toggle('no-motion', !$('motion').checked);
  if (!$('motion').checked) stopArtworkTransition();
};
motionPreference.addEventListener('change', () => { if (motionPreference.matches) stopArtworkTransition(); });
$('fullscreen').onclick = async () => {
  try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); }
  catch { $('error').textContent = 'F11 키로 전체화면을 켜세요.'; $('error').hidden = false; }
};
document.addEventListener('keydown', event => {
  if (booting || event.altKey || event.ctrlKey || event.metaKey || dialog.open) return;
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
stream.onmessage = event => {
  const { app } = JSON.parse(event.data);
  const nextApp = apps.find(item => item.id === app) || null;
  // Keep receiving commands during startup; only the latest state is shown.
  if (booting) pendingApp = nextApp;
  else launchState.launch(nextApp);
};
stream.onerror = () => { $('connection').textContent = '재연결 중…'; };
// Startup is a visual effect and must finish even when PC B is unavailable.
setTimeout(() => {
  booting = false;
  $('boot-screen').hidden = true;
  $('console-shell').hidden = false;
  launchState.launch(pendingApp);
}, 2400);
