export function randomId() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
// One Hub owns one explicitly opened S Box window. Never broadcast across visitors.
export function createBrowserConsole(config, host = window) {
  const token = randomId(),
    origin = new URL(config.consoleUrl).origin;
  let child = null,
    ready = false,
    pending = null;
  function post(message) {
    child.postMessage(
      Object.assign({ channel: "sbox-preview-v1", token }, message),
      origin,
    );
  }
  function finish(error) {
    if (!pending) return;
    const task = pending;
    pending = null;
    host.clearTimeout(task.timer);
    host.clearInterval(task.ping);
    if (error) task.reject(error);
    else task.resolve({ kind: "preview" });
  }
  function receive(event) {
    const message = event.data;
    if (
      !child ||
      event.source !== child ||
      event.origin !== origin ||
      !message ||
      message.channel !== "sbox-preview-v1" ||
      message.token !== token
    )
      return;
    if (message.type === "ready") {
      ready = true;
      if (pending)
        post({ type: "launch", requestId: pending.id, uri: pending.uri });
    } else if (
      message.type === "accepted" &&
      pending &&
      message.requestId === pending.id
    ) {
      finish(
        message.ok
          ? null
          : new Error(
              message.error || "S Box 실행 요청을 확인하지 못했습니다.",
            ),
      );
    }
  }
  host.addEventListener("message", receive);
  function open() {
    if (!child || child.closed) {
      ready = false;
      const url = new URL(config.consoleUrl);
      url.hash = "hub=" + token;
      child = host.open(url.href, "sbox-preview-" + token);
      if (!child)
        throw new Error(
          "S Box 창을 열 수 없습니다. 이 사이트의 팝업을 허용해 주세요.",
        );
    }
    return child;
  }
  return {
    open() {
      open().focus();
    },
    dispatch(request) {
      if (pending)
        return Promise.reject(new Error("실행 요청을 보내고 있습니다."));
      try {
        open();
      } catch (error) {
        return Promise.reject(error);
      }
      return new Promise((resolve, reject) => {
        pending = { id: randomId(), uri: request.uri, resolve, reject };
        pending.timer = host.setTimeout(
          () =>
            finish(
              new Error("S Box 응답 시간이 초과됐습니다. 다시 실행해 주세요."),
            ),
          config.timeoutMs,
        );
        if (ready)
          post({ type: "launch", requestId: pending.id, uri: pending.uri });
        else {
          post({ type: "ping" });
          pending.ping = host.setInterval(() => {
            if (pending && !ready) post({ type: "ping" });
          }, 250);
        }
      });
    },
    close() {
      finish(new Error("연결을 닫았습니다."));
      host.removeEventListener("message", receive);
    },
  };
}
