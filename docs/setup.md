# 실행과 설치

## 웹 검토

- TV Gaming Hub: <https://gaminghub.dev.readiz.com>
- PC S Box: <https://sbox.dev.readiz.com>

Hub에서 S Box 버튼을 누르거나 게임을 실행하면 연결된 콘솔 탭이 열린다. 팝업 차단 시 Hub의 팝업을 허용한다. Hub에서 세 게임을 선택해 S Box 타이틀 전환을 확인한다. 직접 연 S Box는 독립적으로 사용할 수 있다.

## 한 PC에서 실행

Node.js 24 LTS(24.22.1 이상)를 설치하고 다음을 실행한다.

```sh
npm ci
npm run dev
```

S Box <http://localhost:4101>을 먼저 열고 Gaming Hub <http://localhost:4100>에서 게임을 선택한다. 브라우저 Hub의 실행은 기존 `POST /launch`로 전달하는 하위 서비스 모의 경로다. 콘솔 자체의 방향키/Enter 실행과 Esc 복귀도 유지한다. 전체화면은 F11 또는 화면의 전체화면 버튼을 사용한다.

## PC 분리와 기존 명령 수신

PC B에서 `start-pc-b.cmd`를 실행해 자신의 LAN IP를 입력한다. PC A에서는 `start-pc-a.cmd`를 실행해 B의 주소를 입력하고, A의 로컬 브라우저를 연다. 주소는 Git에서 제외된 `config.local.json`에 보존하며 다음 실행 때 Enter로 재사용한다. A가 B의 WebSocket에 연결하므로 B에 A 주소를 등록하지 않는다.

명령 송신자는 다음 JSON을 B에 보낸다.

```sh
curl -X POST http://PC_B_IP:4100/launch -H 'Content-Type: application/json' -d '{"app":"R7kP2mN9vQ.ApexRacing"}'
```

B에 연결된 모든 A가 명령을 받는다. 끊긴 A에는 과거 명령을 재생하지 않는다. PC A는 B가 없어도 자체 홈에서 게임을 실행할 수 있고, B가 다시 시작되면 재연결한다. 기본 구성은 사설망 데모이며 웹 공개 미리보기 서버로 사용하지 않는다. 상세 응답과 오류는 [PC API](api.md)에 있다.

## TV WGT

```sh
npm run build:tv
```

생성 파일은 `dist/unsigned/gaming-hub.wgt`, 서명할 소스는 `build/tv/gaming-hub/`다. 기존 게임별 세 WGT는 생성하지 않으며 빌드가 만든 과거 game-a/b/c 패키지는 제거한다. 게임별 ID는 URI 대상 식별자로 남는다.

`config.json`의 `hub` 기본값을 서비스 담당자와 맞춘다. 비공개 설정 예시:

```json
{"hub":{"serviceId":"com.hssg.tvservice","operation":"http://hssg.com/appcontrol/operation/launch_game","uriBase":"sbox://launch","timeoutMs":7000}}
```

Hub WGT는 게임 선택 시 이 서비스에 AppControl 한 건만 보낸다. `pcBUrl`은 WGT에 포함하지 않는다. 이후의 PC 명령과 HDMI 처리는 [서비스 인계 규격](tv-service.md)을 기준으로 별도 구현한다.

Tizen 인증서 프로파일로 서명한다.

```sh
tizen package -t wgt -s PROFILE_NAME -- build/tv/gaming-hub
```

Windows는 `build-wgt.cmd PROFILE_NAME`을 사용한다. TV 개발자 모드와 서명 인증서, 기기 연결을 준비하고 서명된 패키지를 설치한다. 서명키를 저장소에 넣거나 자동 생성해 기존 키를 교체하지 않는다.

## 검증 순서

1. `npm test`로 PC 통신, 딥링크와 AppControl 실패 복구, 웹 연결과 단일 WGT 구성을 검사한다.
2. 웹과 로컬 데모에서 세 게임의 선택과 전환, Esc 복귀와 두 Hub 창의 독립 상태를 확인한다.
3. 실제 TV에서 서명 WGT를 실행하고 리모컨 입력과 서비스의 caller/operation/URI 수신을 확인한다.
4. 서비스 담당자의 하위 구현 뒤 실제 게임과 HDMI/CEC를 확인한다.

[요구사항](gaming-hub.md) | [문서 안내](README.md)
