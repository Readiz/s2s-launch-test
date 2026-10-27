import { makeRequest } from "./contract.mjs";
import { createBrowserConsole } from "./browser-console.mjs";

export function createHubLauncher(config, apps, host = window) {
  const browser =
    config.mode === "preview" ? createBrowserConsole(config, host) : null;
  let busy = false;
  return {
    openConsole() {
      if (browser) browser.open();
      else if (config.mode === "relay")
        host.open(config.consoleUrl, "sbox-local-console");
      else
        throw new Error(
          "게임을 선택하면 내부 서비스가 S Box 연결을 처리합니다.",
        );
    },
    async launch(app) {
      if (busy) throw new Error("실행 요청을 보내고 있습니다.");
      const request = makeRequest(app, config, apps);
      busy = true;
      try {
        if (browser) return await browser.dispatch(request);
        if (config.mode === "relay") {
          const controller = new AbortController();
          const timer = host.setTimeout(
            () => controller.abort(),
            config.timeoutMs,
          );
          try {
            const response = await host.fetch("/launch", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ app }),
              signal: controller.signal,
            });
            const result = await response.json();
            if (!response.ok || !result.ok)
              throw new Error(
                result.error || "콘솔에 요청을 전달하지 못했습니다.",
              );
            return { kind: "relay" };
          } finally {
            host.clearTimeout(timer);
          }
        }
        if (config.mode !== "tizen" || !host.tizen || !host.tizen.application)
          throw new Error(
            "AppControl은 TV에 설치한 WGT에서 실행할 수 있습니다.",
          );
        await new Promise((resolve, reject) => {
          let settled = false;
          function done(error) {
            if (settled) return;
            settled = true;
            host.clearTimeout(timer);
            if (error) reject(error);
            else resolve();
          }
          const timer = host.setTimeout(
            () =>
              done(
                new Error(
                  "서비스 호출 응답 시간이 초과됐습니다. 다시 실행해 주세요.",
                ),
              ),
            config.timeoutMs,
          );
          try {
            const control = new host.tizen.ApplicationControl(
              request.operation,
              request.uri,
              null,
              null,
              [],
              request.launchMode,
            );
            host.tizen.application.launchAppControl(
              control,
              request.serviceId,
              () => done(),
              (error) =>
                done(
                  new Error(
                    (error.name || "호출 오류") +
                      ": " +
                      (error.message || "내부 서비스를 확인하세요."),
                  ),
                ),
            );
          } catch (error) {
            done(error);
          }
        });
        return { kind: "tizen" };
      } finally {
        busy = false;
      }
    },
  };
}
