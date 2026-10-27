import { createHubLauncher } from "./launch.mjs";
import { remoteKey, remoteDestination } from "./remote.mjs";
import { mountViewport } from "./viewport.mjs";
const $ = (id) => document.getElementById(id);
mountViewport($("screen-frame"));
const apps = window.DEMO_APPS,
  config = window.HUB_CONFIG;
const launcher = createHubLauncher(config, apps);
let selected = 0,
  busy = false,
  toastTimer,
  returnFocus;
const cards = apps.map((app, index) => {
  const card = document.createElement("button");
  card.className = "game-card";
  card.type = "button";
  card.setAttribute("aria-label", app.name + " 추천 게임 실행");
  card.dataset.app = app.id;
  const art = document.createElement("img");
  art.src = app.art;
  art.alt = "";
  const shade = document.createElement("span");
  shade.className = "card-shade";
  const copy = document.createElement("span");
  copy.className = "card-copy";
  const icon = document.createElement("img");
  icon.src = app.icon;
  icon.alt = "";
  const text = document.createElement("span"),
    name = document.createElement("strong"),
    genre = document.createElement("small");
  name.textContent = app.name;
  genre.textContent = app.genre;
  text.append(name, genre);
  copy.append(icon, text);
  card.append(art, shade, copy);
  card.onfocus = () => {
    if (!busy) select(index, false);
  };
  card.onclick = () => {
    if (busy) return;
    select(index, false);
    launch();
  };
  $("games").append(card);
  return card;
});
const icons = apps.map((app, index) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "launcher-item";
  button.dataset.app = app.id;
  button.setAttribute("aria-label", app.name + " 실행");
  button.title = app.name;
  const art = document.createElement("span");
  art.className = "launcher-icon";
  const image = document.createElement("img");
  image.src = app.icon;
  image.alt = "";
  image.width = image.height = 64;
  art.append(image);
  const name = document.createElement("span");
  name.className = "launcher-name";
  name.textContent = app.name;
  button.append(art, name);
  button.onfocus = () => {
    if (!busy) select(index, false);
  };
  button.onclick = () => {
    if (busy) return;
    select(index, false);
    launch();
  };
  $("launcher-games").append(button);
  return button;
});
function select(index, focus = true) {
  selected = (index + apps.length) % apps.length;
  const app = apps[selected];
  for (const row of [cards, icons])
    row.forEach((item, i) => {
      item.classList.toggle("selected", i === selected);
      item.tabIndex = i === selected ? 0 : -1;
      item.setAttribute("aria-current", i === selected ? "true" : "false");
    });
  $("hero-art").src = app.art;
  $("hero-name").textContent = app.name;
  $("hero-genre").textContent = app.genre;
  $("hero-description").textContent = app.description;
  if (focus) icons[selected].focus();
}
function status(text, error = false, persist = false) {
  clearTimeout(toastTimer);
  $("status").textContent = text;
  $("status").dataset.error = String(error);
  $("status").hidden = false;
  if (!persist)
    toastTimer = setTimeout(
      () => {
        $("status").hidden = true;
      },
      error ? 7000 : 4000,
    );
}
async function launch() {
  if (busy) return;
  const launchFocus = document.activeElement;
  busy = true;
  $("hub").setAttribute("aria-busy", "true");
  status(apps[selected].name + " 실행 요청 중…", false, true);
  try {
    const result = await launcher.launch(apps[selected].id);
    status(
      result.kind === "tizen"
        ? "내부 서비스에 실행 요청을 전달했습니다."
        : "S Box에 실행 요청을 전달했습니다.",
    );
  } catch (error) {
    status(error.message, true);
  } finally {
    busy = false;
    $("hub").setAttribute("aria-busy", "false");
    (launchFocus && document.contains(launchFocus)
      ? launchFocus
      : icons[selected]
    ).focus();
  }
}
function openConsole() {
  try {
    launcher.openConsole();
  } catch (error) {
    status(error.message);
  }
}
function showInfo() {
  returnFocus = document.activeElement;
  $("info-panel").hidden = false;
  document.body.classList.add("info-open");
  $("hub").setAttribute("aria-hidden", "true");
  $("info-copy").textContent =
    config.mode === "tizen"
      ? "연결된 S Box의 게임을 실행하는 TV 런처입니다."
      : "TV의 Gaming Hub와 PC의 S Box를 두 화면으로 확인하는 미리보기입니다.";
  $("browser-help").hidden = config.mode === "tizen";
  $("info-ok").focus();
}
function closeInfo() {
  $("info-panel").hidden = true;
  document.body.classList.remove("info-open");
  $("hub").removeAttribute("aria-hidden");
  if (returnFocus) returnFocus.focus();
}
$("play").onclick = launch;
$("console").onclick = $("nav-console").onclick = openConsole;
$("nav-home").onclick = () => {
  if (!busy) select(0);
};
$("nav-games").onclick = () => {
  if (!busy) select(selected);
};
$("info").onclick = showInfo;
$("info-close").onclick = $("info-ok").onclick = closeInfo;
$("fullscreen").onclick = () => {
  if (!document.fullscreenEnabled) {
    status("이 화면은 전체화면으로 실행됩니다.");
    return;
  }
  const request = document.fullscreenElement
    ? document.exitFullscreen()
    : document.documentElement.requestFullscreen();
  request.catch(() =>
    status("브라우저 전체화면을 켤 수 없습니다. F11 키를 사용하세요."),
  );
};
$("edition").textContent =
  config.mode === "tizen" ? "S BOX GAMES" : "WEB PREVIEW";
document.addEventListener("keydown", (event) => {
  if (event.altKey || event.ctrlKey || event.metaKey) return;
  const key = remoteKey(event);
  const back = key === "Back";
  if (key === "Enter" && event.repeat) {
    event.preventDefault();
    return;
  }
  if (!$("info-panel").hidden) {
    if (back || key === "Enter") {
      event.preventDefault();
      closeInfo();
    } else if (key === "Tab" || /^Arrow/.test(key || "")) {
      event.preventDefault();
      (document.activeElement === $("info-ok")
        ? $("info-close")
        : $("info-ok")
      ).focus();
    }
    return;
  }
  if (back) {
    event.preventDefault();
    if (config.mode === "tizen" && window.tizen) {
      try {
        window.tizen.application.getCurrentApplication().exit();
      } catch (error) {
        status(error.message, true);
      }
    } else if (!$("status").hidden) $("status").hidden = true;
    else select(selected);
  } else if (
    ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(key)
  ) {
    event.preventDefault();
    if (busy) return;
    const navigation = [
      "nav-home",
      "nav-games",
      "nav-console",
      "fullscreen",
      "info",
    ].map($);
    const destination = remoteDestination(
      [navigation, [$("play")], cards, [...icons, $("console")]],
      document.activeElement,
      key,
      [1, 0, selected, selected],
    );
    if (destination) destination.focus();
  } else if (key === "Enter") {
    event.preventDefault();
    if (event.repeat || busy) return;
    const active = document.activeElement;
    if (active === document.body) launch();
    else if (active && (active.tagName === "BUTTON" || active.tagName === "A"))
      active.click();
  }
});
select(0);
