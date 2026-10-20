# HTTP와 WebSocket 인터페이스

TV WGT와 향후 PC C 리모컨은 PC B의 HTTP 인터페이스를 호출한다. PC A들은 B에 먼저 WebSocket으로 연결하고 명령을 기다린다. 기본 포트는 B `4100`, A 로컬 화면 `4101`이다.

## PC B: 게임 전환 요청

`POST /launch`, `Content-Type: application/json`

```json
{"app":"R7kP2mN9vQ.ApexRacing"}
```

허용하는 앱 ID:

| 게임 | app |
|---|---|
| Apex Racing | `R7kP2mN9vQ.ApexRacing` |
| Forest Quest | `F3bT8xL4cW.ForestQuest` |
| Orbit Arena | `O6nH1sD5aZ.OrbitArena` |

콘솔 ID나 IP를 요청에 넣지 않는다. 요청 시점에 WebSocket이 열린 모든 A가 대상이다. 다음은 두 A가 모두 처리한 응답이다.

```json
{"ok":true,"app":"R7kP2mN9vQ.ApexRacing","total":2,"delivered":2,"failed":0}
```

`total`은 대상 A 수이며 브라우저 탭 수가 아니다. `delivered`는 A 서버가 로컬 브라우저 연결에 이벤트를 전달하고 성공 응답을 보낸 수다. 실제 렌더링 완료나 게임 프로세스 실행, HDMI 전환 완료는 확인하지 않는다. HTTP 응답 뒤에도 브라우저의 약 2.2초 모의 로딩은 계속될 수 있다.

| HTTP 상태 | 의미 |
|---|---|
| `200` | 대상 A들이 모두 성공. `ok: true` |
| `207` | 일부 A만 성공. `ok: false`, `delivered > 0`, `failed > 0` |
| `400` | 잘못된 JSON 또는 등록되지 않은 앱 ID. `error` 반환 |
| `503` | 연결된 A가 없음, 또는 대상 모두 연결 종료/실패 응답. A의 브라우저가 닫혀 있어도 실패 |
| `504` | 성공 응답이 없고 하나 이상이 3초 응답 제한을 초과 |

일부 실패 예시:

```json
{"ok":false,"app":"F3bT8xL4cW.ForestQuest","total":3,"delivered":2,"failed":1,"error":"콘솔 3대 중 1대가 앱 전환 명령을 처리하지 못했습니다."}
```

연결된 A가 없으면 `total`, `delivered`, `failed`가 모두 0이다. 시간 초과는 실행되지 않았다는 보장이 아니다. 응답이 유실되었을 수 있으며 B는 자동 재전송하지 않는다. 응답 전 새 요청이 와도 각 요청은 별도로 처리한다. 같은 연결에서는 수신 순서대로 게임 전환 이벤트를 쓴다.

PowerShell 요청 예시:

```powershell
$body = @{ app = "R7kP2mN9vQ.ApexRacing" } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:4100/launch" -ContentType "application/json" -Body $body
```

다른 PC에서 호출할 때는 `127.0.0.1`을 B의 LAN IP로 바꾼다. PC C도 같은 요청을 사용한다. `207`은 HTTP 성공 범위에 속하지만 전체 성공은 아니므로 반드시 응답의 `ok`, `delivered`, `failed`를 확인한다.

## PC B: 연결 상태

`GET /status`

```json
{"consoles":2}
```

B에 현재 연결된 A 서버 수다. A의 브라우저 준비 여부는 이 개수만으로 알 수 없다.

## PC A → PC B: WebSocket

접속 주소: `ws://B주소:4100/console`. A가 연결을 시작하며 B는 A의 주소로 새 연결을 열지 않는다. `https://` B 주소를 쓰면 A는 `wss://`를 사용한다. 현재 Node 서버 자체는 HTTP만 제공하며 TLS는 별도 프록시가 필요하다.

B가 보내는 메시지:

```json
{"type":"launch","requestId":"요청별 UUID","app":"R7kP2mN9vQ.ApexRacing"}
```

A가 보내는 응답:

```json
{"type":"launch-result","requestId":"받은 UUID","ok":true}
```

실패 응답은 `ok: false`와 `error` 문자열을 사용한다. `requestId`는 B가 응답 집계용으로 만들며 TV나 C가 입력할 값이 아니다. 모르는 요청, 중복 응답, 해당 요청 대상이 아닌 연결의 응답은 집계하지 않는다. 메시지는 텍스트 JSON, 최대 4 KiB다.

- B는 15초 간격으로 WebSocket ping을 보낸다. 다음 주기까지 pong이 없으면 연결을 정리한다.
- A는 연결 후 45초간 ping이 없으면 연결을 끊고 다시 연결한다.
- 재연결 대기는 1, 2, 4, 8, 최대 10초다. 연결이 성공하면 대기를 초기화한다.
- 연결이 끊긴 동안의 요청은 저장하지 않는다. B 재시작이나 A 재연결 시 과거 명령을 재생하지 않는다.
- 선택적으로 A/B의 `config.local.json`에 같은 `consoleToken`을 설정하면 WebSocket 연결 시 `Authorization: Bearer ...`를 확인한다. 값이 비어 있으면 확인하지 않는다. 이 설정은 HTTP 요청을 보호하지 않으며 WGT에는 포함하지 않는다.

지속 연결과 heartbeat에는 [ws 공식 라이브러리](https://github.com/websockets/ws)를 사용한다. 기본 구성은 사설망 데모이며 인터넷 공개용 인증/TLS 서버는 범위에 포함하지 않는다.

## PC A: 로컬 콘솔 인터페이스

A는 `127.0.0.1`에서만 HTTP 요청을 받는다. 외부 기기는 A HTTP 주소를 알 필요가 없다.

| 경로 | 동작 |
|---|---|
| `GET /` | 콘솔 홈과 게임 화면 |
| `GET /events` | SSE. 최초 접속 때 현재 앱, 이후 상태 변경 이벤트 |
| `POST /launch` | 같은 app 본문으로 해당 A의 게임만 전환 |
| `POST /home` | 해당 A를 홈으로 전환. 본문 없음 |
| `GET /status` | B 연결 여부, 현재 앱, 연결된 브라우저 수 |

```json
{"relayConnected":true,"app":null,"browsers":1}
```

`app: null`은 홈이다. 로컬 전환 성공은 `{"ok":true,"app":"..."}`, 홈 복귀는 `{"ok":true,"app":null}`이다. 로컬 게임 전환 시 브라우저가 하나도 없으면 `503`이다. B에는 `/home`이 없으며 현재 원격 명령은 게임 전환만 제공한다.

SSE 이벤트 예시:

```text
data: {"app":"O6nH1sD5aZ.OrbitArena"}

```

A의 브라우저를 여러 개 열면 같은 A의 상태를 공유한다. 다른 A의 로컬 조작과는 독립적이다.

[전체 흐름도](flow.md) | [실행 가이드](setup.md) | [문서 안내](README.md)
