const $ = id => document.getElementById(id);
const apps = window.DEMO_APPS;
let selected = 0;
let activeApp = null;
let busy = false;
const title = app => app.id.split('.')[1].replace(/([a-z])([A-Z])/g, '$1 $2');

const tiles = apps.map((app, index) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'game';
  button.dataset.key = app.key;
  button.setAttribute('aria-label', app.name + ' 실행');
  const art = document.createElement('span');
  art.className = 'art';
  art.setAttribute('aria-hidden', 'true');
  const letter = document.createElement('span');
  letter.textContent = app.key.toUpperCase();
  art.append(letter);
  const label = document.createElement('span');
  label.className = 'game-label';
  const name = document.createElement('strong');
  name.textContent = app.name;
  const subtitle = document.createElement('span');
  subtitle.textContent = title(app);
  label.append(name, subtitle);
  button.append(art, label);
  button.onfocus = () => select(index, false);
  button.onclick = () => send('/launch', { app: app.id });
  $('library').append(button);
  return button;
});

function select(index, focus = true) {
  selected = (index + apps.length) % apps.length;
  tiles.forEach((tile, i) => {
    tile.classList.toggle('selected', i === selected);
    tile.tabIndex = i === selected ? 0 : -1;
  });
  if (focus) tiles[selected].focus();
}
function render(appId) {
  const app = apps.find(item => item.id === appId);
  activeApp = app || null;
  $('home').hidden = Boolean(app);
  $('app-screen').hidden = !app;
  $('error').hidden = true;
  document.body.dataset.app = app?.key || 'home';
  document.title = app ? `Console · ${app.name}` : 'Console · 홈';
  $('context').textContent = app ? app.name : '콘솔 홈';
  if (app) {
    selected = apps.indexOf(app);
    $('app-letter').textContent = app.key.toUpperCase();
    $('app-name').textContent = app.name;
    $('app-title').textContent = title(app);
    $('app-id').textContent = app.id;
    $('back-home').focus();
  } else select(selected);
}
async function send(route, body) {
  if (busy) return;
  busy = true;
  $('error').hidden = true;
  try {
    const response = await fetch(route, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || '요청을 처리하지 못했습니다.');
  } catch (error) {
    $('error').textContent = error.message;
    $('error').hidden = false;
  } finally { busy = false; }
}
$('back-home').onclick = () => send('/home');
$('fullscreen').onclick = async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch { $('error').textContent = 'F11 키로 전체화면을 켜세요.'; $('error').hidden = false; }
};
document.addEventListener('keydown', event => {
  if (event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.key === 'Escape' && activeApp) {
    event.preventDefault();
    send('/home');
  } else if (!activeApp && ['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown'].includes(event.key)) {
    event.preventDefault();
    select(selected + (['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 1));
  } else if (!activeApp && event.key === 'Enter' && document.activeElement !== $('fullscreen')) {
    event.preventDefault();
    if (!event.repeat) send('/launch', { app: apps[selected].id });
  }
});
select(0, false);
const stream = new EventSource('/events');
stream.onopen = () => { $('connection').textContent = '● 연결됨'; };
stream.onmessage = event => { render(JSON.parse(event.data).app); };
stream.onerror = () => { $('connection').textContent = '재연결 중…'; };
