# Gaming Hub AppControl 서비스 인계

2026-10-27 단일 Hub WGT용 v2 계약. 이 문서는 **Hub가 송신하는 값과 내부 서비스 담당자의 구현 경계**를 정의한다. 내부 C# 서비스와 HDMI 제어 코드는 이 저장소에서 구현하지 않는다. 기존 게임별 WGT의 빈 URI HDMI 활성화 계약은 폐기된 세 패키지의 과거 규격이며 현재 Hub에 적용하지 않는다.

## 정확한 송신값

| 항목 | 값 |
|---|---|
| Hub application ID / caller | `G7mH2uB8xQ.GamingHub` |
| Hub package ID | `G7mH2uB8xQ` |
| 수신 서비스 application ID | `com.hssg.tvservice` |
| operation | `http://hssg.com/appcontrol/operation/launch_game` |
| URI | `sbox://launch?app=게임ID` |
| MIME와 category | `null` |
| data | `[]` |
| launchMode | `SINGLE` |
| 서비스 완료 reply | 요청하지 않음 |
| 호출 콜백 제한 | 7초. 자동 재송신 없음 |

게임별 URI:

```text
sbox://launch?app=R7kP2mN9vQ.ApexRacing
sbox://launch?app=F3bT8xL4cW.ForestQuest
sbox://launch?app=O6nH1sD5aZ.OrbitArena
```

operation과 `sbox` URI는 이 데모의 연동 규격이다. 공개 Samsung 플랫폼 API의 예약된 HDMI 명령이 아니다. 대상 서비스 ID, operation, URI 기본값과 제한 시간은 `config.json`의 `hub`에서 관리하며 비공개 `config.local.json`의 `hub`로 덮어쓸 수 있다. 변경하면 WGT를 다시 빌드하고 서명한다. PC 주소와 인증 토큰은 WGT에 포함하지 않는다.

송신 코드는 [Hub launch](../hub/launch.mjs)와 [URI 계약](../hub/contract.mjs)이다. `tizen.ApplicationControl`의 URI와 `SINGLE` 전달은 [Samsung Application API](https://developer.samsung.com/smarttv/develop/api-references/tizen-web-device-api-references/application-api.html)를 따른다. 방향키와 Enter, Back은 필수 TV 키로 별도 등록하지 않는다. [TVInputDevice API](https://developer.samsung.com/smarttv/develop/api-references/tizen-web-device-api-references/tvinputdevice-api.html)

## 서비스 담당자가 연결할 부분

1. 대상 TV에서 외부 WGT의 `com.hssg.tvservice` 호출을 허용하고, 새 Hub caller ID와 `launch_game` operation을 수신한다. 서명과 내부 권한은 플랫폼 환경에 맞춘다.
2. 수신 URI의 scheme `sbox`, host `launch`, 유일한 `app` 매개변수를 검증한다. 위 세 게임 외 ID나 중복 app, 다른 경로는 거부한다. 호출자가 하나이므로 caller ID만으로 게임을 구분하지 않는다.
3. 선택한 게임의 딥링크를 S Box로 전달한다. 기존 PC 중계를 재사용하면 PC B에 `POST /launch`와 `{"app":"게임ID"}`를 보낼 수 있다. 정확한 하위 통신과 대상 결정은 서비스 구현 담당자가 맡는다.
4. 콘솔 연결과 필요한 HDMI/CEC 처리를 수행한다. Hub는 HDMI 포트나 PC 주소를 전달하지 않는다.
5. Hub 종료나 백그라운드 전환과 독립적으로 작업을 완료한다. Hub는 호출 접수 뒤 자동 종료하지 않으며 Back으로 종료할 수 있다.

AppControl 성공 콜백은 호출 접수 결과다. 서비스의 딥링크 전달, 게임 렌더링이나 HDMI 완료를 확인하는 응답이 아니다. Hub는 서비스 미설치, 호출 거부와 시간 초과를 화면에 표시하고 재시도를 허용한다.

## 별도 확인할 완료 경계

현재는 모의 Tizen API로 정확한 대상과 게임별 URI, 중복 입력 차단과 실패 복구를 검증한다. 실제 TV에서 서명한 Hub WGT 설치, 서비스의 caller/operation/URI 수신과 게임 매핑, PC 게임 화면과 HDMI 표시까지 확인해야 전체 연동 완료다. 웹 미리보기는 동일 URI를 창 사이에 전달하는 시뮬레이션이다.

[Hub 요구사항](gaming-hub.md) | [PC 명령 API](api.md) | [문서 안내](README.md)
