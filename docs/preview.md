# S Box 개발 미리보기

화면 확인 주소는 **<https://sbox.dev.readiz.com>**이다. 방향키·Enter·Esc로 부팅, 게임 로딩과 타이틀 화면을 확인한다. 각 페이지가 화면 상태를 따로 관리하며 다른 방문자나 탭에 조작을 전달하지 않는다.

## 구성

Caddy가 정적 파일을 직접 제공한다. 공개 미리보기에는 Node 서버, SSE, WebSocket, 공유 콘솔 API가 없다. 브라우저의 네트워크 연결도 CSP의 `connect-src 'none'`으로 제한한다. 이전 `/events`, `/launch`, `/home`, `/status`, `/console` 경로는 410, 그 밖의 쓰기 요청은 405를 반환한다.

소스 빌드·검사는 기존 서비스와 같은 nvm Node 24 LTS로 실행하며 보안 패치 버전을 사용한다. 상시 Node 프로세스나 launchd 작업은 필요하지 않다.

```sh
npm ci
npm test
npm run build:preview
```

`dist/preview/`에는 HTML, CSS, 브라우저 모듈과 허용한 그림만 들어간다. 개인 설정, 소스, WGT, 서명키, 의존성 폴더는 게시하지 않는다. `web/transport.mjs`는 로컬 장치 데모용이고, 정적 빌드는 통신하지 않는 `web/preview-transport.mjs`로 교체한다.

## 배포

검증한 커밋의 `dist/preview/`를 새 릴리스의 공개 디렉터리로 복사한다. 기존 파일을 덮어쓰지 않고 `current` 링크를 원자적으로 전환한다. Caddy 메인 파일에서 전용 설정을 가져오고 공개 디렉터리를 전달한다.

```caddyfile
import /path/to/current/ops/caddy/preview.Caddyfile
import sbox_preview /path/to/current/public
```

Caddy 메인 파일과 활성 JSON, 이전 릴리스·관리 기록을 비공개로 백업한다. 후보 설정을 검증하고 다른 호스트의 라우트가 동일한지 비교한 뒤 reload한다. 첫 정적 전환에서는 HTTPS 자산과 게임 전환을 확인하고 이전 미리보기 launchd 작업을 종료·등록 해제한다. 4490/4491 리스너가 사라졌는지 확인한다. 실패하면 이전 링크와 설정·작업을 복구한다.

실제 HTTPS에서 그림·스크립트 해시, 두 브라우저의 독립 상태, 키보드 실행·홈 복귀와 통신 요청 부재를 확인한다. 실행 경로와 소스 커밋, 백업·복구 방법은 호스트의 비공개 관리 기록에 보관한다.

이 공개 주소는 가상 게임 UI다. 로컬 PC A/B, TV WGT와 HDMI/CEC 흐름은 별도이며 [실행 가이드](setup.md)를 따른다.

[문서 안내](README.md) | [S Box 화면과 조작](console.md)
