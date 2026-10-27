export const hubIdentity = {
  id: "G7mH2uB8xQ.GamingHub",
  package: "G7mH2uB8xQ",
  name: "Gaming Hub",
};
export const defaultControl = {
  serviceId: "com.hssg.tvservice",
  operation: "http://hssg.com/appcontrol/operation/launch_game",
  uriBase: "sbox://launch",
  timeoutMs: 7000,
};
export function makeRequest(app, config, apps) {
  if (!apps.some((item) => item.id === app))
    throw new Error("등록되지 않은 게임입니다.");
  if (!config.serviceId || !config.operation)
    throw new Error("내부 서비스 호출 설정을 확인하세요.");
  const uri = new URL(config.uriBase);
  if (
    uri.username ||
    uri.password ||
    uri.port ||
    uri.protocol !== "sbox:" ||
    uri.hostname !== "launch" ||
    (uri.pathname && uri.pathname !== "/") ||
    uri.search ||
    uri.hash
  )
    throw new Error("딥링크 기본 주소를 확인하세요.");
  uri.searchParams.set("app", app);
  return {
    serviceId: config.serviceId,
    operation: config.operation,
    uri: uri.href,
    mime: null,
    category: null,
    data: [],
    launchMode: "SINGLE",
  };
}
export function readDeepLink(value, apps) {
  const uri = new URL(value);
  if (
    uri.username ||
    uri.password ||
    uri.port ||
    uri.protocol !== "sbox:" ||
    uri.hostname !== "launch" ||
    (uri.pathname && uri.pathname !== "/") ||
    uri.hash ||
    [...uri.searchParams.keys()].some((key) => key !== "app") ||
    uri.searchParams.getAll("app").length !== 1
  )
    throw new Error("지원하지 않는 딥링크입니다.");
  const app = uri.searchParams.get("app");
  if (!apps.some((item) => item.id === app))
    throw new Error("등록되지 않은 게임입니다.");
  return app;
}
