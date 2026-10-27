import { readDeepLink } from "../hub/contract.mjs";

export function connectPreviewBridge(
  { onApp, onStatus, apps, hubOrigin },
  host = window,
) {
  const token = new URLSearchParams(host.location.hash.slice(1)).get("hub");
  if (!token || !/^[a-f0-9]{32}$/.test(token) || !host.opener || !hubOrigin)
    return { close() {} };
  const peer = host.opener,
    seen = new Map();
  const reply = (message) =>
    peer.postMessage(
      Object.assign({ channel: "sbox-preview-v1", token }, message),
      hubOrigin,
    );
  const ready = () => reply({ type: "ready" });
  function receive(event) {
    const message = event.data;
    if (
      event.source !== peer ||
      event.origin !== hubOrigin ||
      !message ||
      message.channel !== "sbox-preview-v1" ||
      message.token !== token
    )
      return;
    if (message.type === "ping") {
      ready();
      return;
    }
    if (
      message.type !== "launch" ||
      typeof message.requestId !== "string" ||
      !/^[a-f0-9]{32}$/.test(message.requestId)
    )
      return;
    try {
      const app = readDeepLink(message.uri, apps);
      if (seen.has(message.requestId) && seen.get(message.requestId) !== app)
        throw new Error("요청 식별자가 다른 게임에 사용됐습니다.");
      if (!seen.has(message.requestId)) {
        onApp(app);
        seen.set(message.requestId, app);
        if (seen.size > 32) seen.delete(seen.keys().next().value);
      }
      onStatus("Hub 연결됨");
      reply({ type: "accepted", requestId: message.requestId, ok: true });
    } catch (error) {
      reply({
        type: "accepted",
        requestId: message.requestId,
        ok: false,
        error: error.message,
      });
    }
  }
  host.addEventListener("message", receive);
  ready();
  return {
    close() {
      host.removeEventListener("message", receive);
    },
  };
}
