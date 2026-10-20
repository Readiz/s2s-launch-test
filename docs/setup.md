# 실행 가이드

## 한 PC에서 먼저 확인

Node.js 22 이상을 설치하고 프로젝트 폴더에서 실행한다.

```sh
npm ci
npm run dev
```

A와 B가 함께 실행되고 콘솔 주소, 게임별 테스트 주소, 조작 방법이 터미널에 표시된다. IP 입력은 생략하고 A는 같은 PC의 B에 루프백으로 연결한다.

1. `http://localhost:4101`을 브라우저에서 열어 둔다. 이것이 콘솔 화면이다.
2. 다른 탭에서 `http://localhost:4100/tv/game-a/`를 연다. 콘솔에 Apex Racing 로딩 화면이 잠깐 표시되고 타이틀 메뉴가 열린다.
3. `game-b/`, `game-c/`로 다른 게임 전환도 확인한다.
4. 콘솔에서 방향키와 Enter로 게임 실행, Esc로 홈 복귀, F11 또는 전체화면 버튼으로 화면 확대를 확인한다.

미리보기는 HTTP 요청을 실제로 보내지만 PC 브라우저에 Tizen API가 없으므로 HDMI 미지원 안내가 표시된다. 서버 터미널에서 Ctrl+C를 누르면 두 서버가 함께 종료된다.

## Windows에서 A와 B를 개별 실행

Node.js 22 이상과 이 프로젝트를 각 PC에 준비한다. 시작 파일을 더블 클릭하면 필요한 npm 패키지가 없을 때 처음에 설치한다. 터미널에서 직접 실행하려면 먼저 `npm ci`를 실행한다.

### 1. B 중계 서버 시작

`start-pc-b.cmd` 또는 `npm run start:b`를 실행한다. 감지한 LAN IP와 B 주소 입력란이 표시된다.

- 같은 PC에서 A/B만 시험: `127.0.0.1`
- 실제 TV나 다른 PC도 연결: **B의 LAN IP**, 예를 들어 `192.168.0.20`
- 이전 입력을 재사용: Enter

IP만 입력하면 기본 포트 `4100`을 붙인다. `192.168.0.20:5000`처럼 포트를 넣거나 전체 `http://...`, `https://...` 주소도 입력할 수 있다. 전체 URL에는 필요한 포트를 직접 명시한다. 기본 구성에서는 `http://192.168.0.20:4100`이다.

입력값은 B의 외부 안내 주소이며 실제 서버 수신 포트는 `pcBPort` 설정으로 정한다. 다른 포트를 사용할 경우 `config.local.json`의 `pcBPort`도 바꾸고 다시 실행한다. B는 `0.0.0.0`에 바인딩한다.

실행이 끝나면 터미널에 다음이 나온다.

- A와 TV에 사용할 B 주소
- A를 실행하고 콘솔을 여는 순서
- 세 게임 요청을 보낼 미리보기 주소
- 연결된 A 개수를 보는 `/status` 주소
- 생성한 서명 전 WGT 폴더

B 시작 시 입력한 주소를 포함해 WGT 소스와 패키지도 생성한다. B 주소를 고정해 두면 재설정이 줄어든다. 공유기의 DHCP 예약이나 사설 고정 IP를 사용할 수 있다.

### 2. 각 A 콘솔 시작

`start-pc-a.cmd` 또는 `npm run start:a`를 실행한다. **여기에도 B 주소를 입력한다. A 자신의 IP를 입력하는 것이 아니다.**

- B와 같은 PC에서 실행: `127.0.0.1`
- B가 다른 PC: 위에서 입력한 B의 LAN IP

실행 창에 나온 `http://localhost:4101`을 **그 A의 브라우저에서** 열어 둔다. 이 주소는 콘솔 화면을 보기 위한 로컬 주소다. B에 등록하거나 TV에 입력하지 않는다. HDMI 출력을 TV에 연결하고 브라우저를 전체화면으로 전환한다.

A는 B에 자동으로 WebSocket 연결을 만들고 끊기면 재연결한다. B가 꺼져 있어도 키보드로 로컬 게임을 실행하고 홈으로 돌아올 수 있다. `http://localhost:4101/status`의 `relayConnected`가 `true`이면 B와 연결된 상태다.

A를 여러 PC에 실행해도 절차는 같다. 같은 B 주소를 입력하면 B의 `/status`에서 `consoles` 수가 늘어난다. 각 A에서 브라우저를 열어 두어야 화면 전환을 처리할 수 있다.

### 3. 앱 전환 확인

B 실행 창의 게임 미리보기 주소를 연다. 예를 들어 `http://192.168.0.20:4100/tv/game-b/`를 열면 그때 연결된 모든 A가 Forest Quest으로 바뀐다. TV나 향후 PC C는 동일한 [HTTP 요청](api.md)을 사용한다.

같은 PC에 A와 B를 개별 실행하는 것도 가능하다. 두 앱의 B 주소에 `127.0.0.1`을 넣으면 된다. A와 B는 서로 다른 포트를 사용한다. `npm run dev`와 개별 A/B를 동시에 실행하면 기본 포트가 겹치므로 한 방식만 사용한다.

## 네트워크와 로컬 설정

Windows 방화벽에서 **B의 TCP 4100 수신**을 데모 사설망 범위에 허용한다. A는 B로 나가는 연결을 사용하고 로컬 브라우저 서버만 열기 때문에 A의 TCP 4101을 외부에 개방할 필요가 없다.

TV와 A가 B에 접근 가능한 같은 인트라넷을 사용한다. `127.0.0.1`은 현재 기기 자신을 가리키므로 실제 TV용 WGT에는 B의 LAN 주소를 넣어야 한다.

입력한 B 주소는 `config.local.json`에 저장된다. 다른 기존 설정을 보존하며 `pcBUrl`만 갱신한다. `config.json`은 공유 기본값, 로컬 파일은 이를 덮어쓰는 설정이다. 로컬 파일은 Git에 포함되지 않는다.

```json
{
  "pcBUrl": "http://192.168.0.20:4100"
}
```

| 설정 | 기본값과 용도 |
|---|---|
| `pcAPort` | `4101`, A 브라우저의 로컬 포트 |
| `pcBPort` | `4100`, B의 실제 수신 포트 |
| `pcBUrl` | 실행할 때 입력하는 B 주소. A 연결과 WGT HTTP 요청에 사용 |
| `hdmi` | WGT에 포함할 C# 내부 서비스 호출값 |
| `consoleToken` | 기본 빈 값. 설정하면 A/B 간 WebSocket 접속 시 같은 값 필요 |

기본 서버는 인증 없는 사설망 데모다. 선택적인 `consoleToken`은 WebSocket 접속만 검사하며 HTTP `/launch` 인증은 제공하지 않는다. HTTPS 주소를 쓰려면 B 앞에 WebSocket을 지원하는 TLS 프록시가 별도로 필요하다.

자동 실행 환경에서는 저장한 설정을 사용해 `node src/server.mjs a --no-prompt` 또는 `node src/server.mjs b --no-prompt`로 입력을 생략할 수 있다. PC B URL이 비어 있으면 A는 기본 루프백 B에 연결한다. TV용 패키지는 반드시 접근 가능한 B 주소를 먼저 설정하고 생성한다.

## HDMI 내부 서비스

WGT가 호출하는 대상은 `com.hssg.tvservice`, operation은 `http://hssg.com/appcontrol/operation/activate_hdmi`다. URI는 `null`, data는 `[]`, 실행 모드는 `SINGLE`이다. HDMI 포트와 게임 ID를 보내지 않는다. 서비스가 콘솔 연결 대상을 처리한다.

기본 설정에 호출값이 들어 있다. 오래된 `config.local.json`에 `hdmi` 덮어쓰기가 남아 있다면 삭제해 기본값을 사용하거나 `data`를 빈 배열로 맞춘다. C# 수신부와 하드웨어 연결, 배포 조건은 [서비스 구현 명세](tv-service.md)를 따른다.

WGT는 HTTP와 App Control을 시작한 뒤 양쪽 성공/실패 콜백이 끝나면 종료한다. HTTP 제한은 6초, 전체 콜백 대기 제한은 7초다. 서비스 reply나 실제 HDMI 완료는 기다리지 않는다. TV에서 백그라운드 전환 이후에도 WGT 종료가 동작하는지 실기기로 확인한다.

## WGT 빌드, 서명과 설치

B 시작 시 자동 생성하거나, B 주소를 설정한 프로젝트에서 직접 생성한다.

```sh
npm run build:tv
```

- `build/tv/game-a/`, `game-b/`, `game-c/`: 앱별 소스와 manifest
- `dist/unsigned/game-a.wgt`, `game-b.wgt`, `game-c.wgt`: 서명 전 패키지

Tizen Studio와 대상 TV용 인증서 프로필을 준비하고 Tizen CLI를 PATH에 추가한다. `PROFILE_NAME`을 사용할 프로필 이름으로 바꿔 실행한다.

```powershell
.\build-wgt.cmd PROFILE_NAME
```

스크립트는 소스를 다시 생성하고 `tizen package -t wgt -s PROFILE_NAME`으로 서명한다. 서명 결과는 각 `build/tv/game-*/` 폴더에서 확인한다. `dist/unsigned/`는 그대로 서명 전 상태다. 실제 출력 파일명과 연결된 TV 대상을 확인한 뒤 설치한다.

```powershell
tizen install -n SIGNED_PACKAGE.wgt -t TV_TARGET
```

CLI 옵션과 TV 연결은 [Samsung Tizen CLI 안내](https://developer.samsung.com/smarttv/develop/getting-started/using-sdk/command-line-interface.html)를 따른다. 서명 자료는 저장소 밖에 보관한다. 생성된 패키지와 소스에는 B 주소가 들어 있으므로 Git에서 제외한다.

B 주소나 App Control 설정이 바뀌면 A도 새 B 주소로 다시 시작하고 WGT를 다시 생성, 서명, 설치한다. C# 서비스는 별도 설치한다.

## 데모 확인 순서

1. A 콘솔의 홈, 방향키/Enter 실행, Esc 복귀를 확인한다.
2. 같은 B에 A들을 연결하고 각각 콘솔 브라우저를 연다.
3. B의 `/status` 개수와 A의 `relayConnected`를 확인한다.
4. B에 세 게임 요청을 보내 모든 A가 함께 바뀌는지 확인한다.
5. B를 꺼도 A 로컬 조작이 되고, B 재시작 후 새 원격 요청이 전달되는지 확인한다.
6. 실제 TV에 서명한 WGT와 C# 서비스를 설치한 뒤 앱 전환, App Control 수신, HDMI 활성화, WGT 자체 종료를 각각 확인한다.

로컬 브라우저와 모의 API 테스트는 실제 Windows 네트워크나 TV/CEC 검증을 대신하지 않는다.

[전체 흐름도](flow.md) | [콘솔 요구사항](console.md) | [문서 안내](README.md)
