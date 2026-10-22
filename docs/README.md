# 문서 안내

PC A는 게임 화면을 표시하는 콘솔이고, PC B는 연결된 모든 A에 앱 전환 명령을 보내는 중계 서버다. 관리할 주소는 B 하나다. TV WGT와 향후 PC C 리모컨은 같은 `POST /launch`를 사용한다.

| 문서 | 내용 |
|---|---|
| [개발 미리보기](preview.md) | sbox.dev.readiz.com 접속과 정적 파일 배포 |
| [전체 흐름도](flow.md) | A가 시작하는 WebSocket 연결, 전체 전송, TV 내부 서비스 호출 |
| [실행 가이드](setup.md) | 한 PC 루프백 실행, Windows 개별 실행, B 주소 입력, WGT 설치 |
| [콘솔 요구사항](console.md) | 게임 이미지와 아이콘, 모의 로딩, 타이틀 메뉴와 키보드 입력 |
| [통신 인터페이스](api.md) | HTTP 요청, WebSocket 메시지, 결과와 재연결 |
| [Apex Racing](app-a.md) | ApexRacing WGT 요구사항 |
| [Forest Quest](app-b.md) | ForestQuest WGT 요구사항 |
| [Orbit Arena](app-c.md) | OrbitArena WGT 요구사항 |
| [C# 내부 서비스 구현 명세](tv-service.md) | com.hssg.tvservice의 수신부, HDMI 처리, 수명주기와 인수 테스트 |

처음 실행할 때는 실행 가이드부터 읽는다. C# 내부 앱 담당자에게는 서비스 구현 명세를 전달한다. WGT는 서비스 호출 시 별도 데이터를 보내지 않으며, HDMI 연결 대상은 서비스에서 처리한다.

[프로젝트 README](../README.md)
