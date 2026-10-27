import { createHubLauncher } from "./launch.mjs";
const $ = (id) => document.getElementById(id);
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
  card.setAttribute("aria-label", app.name + " 실행");
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
function select(index, focus = true) {
  selected = (index + apps.length) % apps.length;
  const app = apps[selected];
  cards.forEach((card, i) => {
    card.classList.toggle("selected", i === selected);
    card.tabIndex = i === selected ? 0 : -1;
  });
  $("hero-art").src = app.art;
  $("hero-name").textContent = app.name;
  $("hero-genre").textContent = app.genre;
  $("hero-description").textContent = app.description;
  if (focus) cards[selected].focus();
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
    cards[selected].focus();
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
$("nav-home").onclick = () => select(0);
$("nav-games").onclick = () => select(selected);
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
  const key =
    event.key ||
    {
      37: "ArrowLeft",
      38: "ArrowUp",
      39: "ArrowRight",
      40: "ArrowDown",
      13: "Enter",
    }[event.keyCode];
  const back = key === "Escape" || key === "Back" || event.keyCode === 10009;
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
    const active = document.activeElement,
      navIndex = navigation.indexOf(active);
    if (key === "ArrowLeft" || key === "ArrowRight") {
      const delta = key === "ArrowLeft" ? -1 : 1;
      if (navIndex !== -1)
        navigation[
          (navIndex + delta + navigation.length) % navigation.length
        ].focus();
      else select(selected + delta);
    } else if (key === "ArrowUp") {
      if (active === $("console")) select(selected);
      else if (active === $("play")) $("nav-games").focus();
      else if (navIndex === -1) $("play").focus();
    } else {
      if (navIndex !== -1) $("play").focus();
      else if (active === $("play")) select(selected);
      else $("console").focus();
    }
  } else if (key === "Enter") {
    if (event.repeat) {
      event.preventDefault();
      return;
    }
    if (
      document.activeElement === document.body ||
      cards.includes(document.activeElement)
    ) {
      event.preventDefault();
      launch();
    }
  }
});
select(0);
