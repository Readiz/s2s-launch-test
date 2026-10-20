# C게임 WGT 요구사항

| 항목 | 값 |
|---|---|
| 화면 이름 | C게임 |
| application ID | `O6nH1sD5aZ.OrbitArena` |
| package ID | `O6nH1sD5aZ` |
| 서명 전 산출물 | `dist/unsigned/game-c.wgt` |
| PC A 표시 | C게임, OrbitArena 데모 화면 |

게임과 식별자는 이 프로젝트의 가상 값이다.

## 실행 동작

1. TV에서 앱을 열면 추가 입력 없이 PC B의 `POST /launch`에 아래 본문을 전송한다.
2. HTTP 응답을 기다리지 않고 Tizen App Control로 내부 C# 앱도 호출한다.
3. 양쪽 성공/실패 콜백이 끝나면 `tizen.application.getCurrentApplication().exit()`로 WGT를 종료한다.

```json
{"app":"O6nH1sD5aZ.OrbitArena"}
```

PC B는 요청 시점에 연결된 모든 PC A에 WebSocket으로 같은 앱 전환 명령을 보낸다. A가 홈이나 다른 게임을 표시 중이어도 C게임으로 바뀐다. PC A 홈에서 직접 게임을 선택하면 해당 A만 전환된다.

## App Control

| 필드 | 값 |
|---|---|
| 대상 C# application ID | `com.hssg.tvservice` |
| operation | `http://hssg.com/appcontrol/operation/activate_hdmi` |
| URI, MIME, category | `null` |
| data | `[]` |
| launchMode | `SINGLE` |
| 서비스 완료 reply | 요청하지 않음 |

HDMI 포트나 게임 정보는 서비스에 보내지 않는다. 내부 서비스가 콘솔 연결 대상을 확인하고 CEC wake와 HDMI 입력 활성화를 처리한다. [C# 서비스 구현 명세](tv-service.md)를 기준으로 연동한다.

## 설정과 종료

PC B 주소는 시작할 때 입력하고 `config.local.json`에 저장한다. B 시작 또는 `npm run build:tv` 때 주소와 App Control 설정이 WGT에 포함된다. 실제 TV에는 B의 LAN 주소가 필요하다.

성공 여부와 관계없이 양쪽 콜백이 끝나면 종료한다. HTTP 제한은 6초, 콜백 누락 시 전체 7초 제한으로 종료를 시도한다. 실제 화면 렌더링이나 HDMI 완료는 기다리지 않는다. 브라우저 미리보기는 종료 지점만 표시하고 창을 유지한다. 일부 A만 처리하면 B는 `207`을 반환하며 WGT는 오류를 기록하고 같은 종료 절차를 따른다.

## 확인 기준

- HTTP 본문의 `app`이 정확히 일치한다.
- B에 연결된 여러 A가 모두 C게임으로 바뀐다.
- A의 Esc 또는 홈 버튼은 그 A만 홈으로 돌린다.
- App Control에 위 대상과 operation, 빈 데이터가 전달된다.
- HTTP나 App Control 실패에도 다른 호출과 자체 종료 흐름이 진행된다.
- 실제 TV에서 WGT 종료 이후 내부 서비스의 HDMI 처리가 계속된다.

자동 테스트와 별도로 TV의 WGT 종료, C# 수신, HDMI/CEC 동작은 실기기 확인이 필요하다.

[전체 흐름도](flow.md) | [실행 가이드](setup.md) | [통신 인터페이스](api.md) | [문서 안내](README.md)
