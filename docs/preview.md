# Gaming Hub와 S Box 개발 미리보기

| 역할 | 주소 | 정적 빌드 |
|---|---|---|
| TV Gaming Hub | <https://gaminghub.dev.readiz.com> | `dist/gaminghub/` |
| PC S Box | <https://sbox.dev.readiz.com> | `dist/preview/` |

두 주소는 Caddy가 정적 파일로 제공한다. 공개 Node 서버와 SSE, WebSocket, 공유 명령 API는 두지 않는다. 기존 `connect-src 'none'` 정책과 폐기된 `/events`, `/launch`, `/home`, `/status`, `/console`의 410 응답, 쓰기 요청의 405 응답을 유지한다.

## 연결한 창에서 실행 확인

Hub의 S Box 버튼이나 게임 실행으로 콘솔 탭을 연다. 각 Hub가 임의 토큰을 만들고 자신이 연 창으로만 `postMessage`를 보낸다. S Box는 Hub의 정확한 출처, opener 창과 토큰을 모두 확인하고, 선택 게임 URI를 검증한 뒤 실행 요청 접수를 응답한다. 같은 요청 ID를 재수신해도 중복 적용하지 않는다.

같은 방문자가 새 Hub를 열면 별도 콘솔 창에 연결한다. 다른 방문자의 화면과 직접 연 S Box에는 요청을 전달하지 않는다. 브라우저 미리보기의 접수 응답은 실제 AppControl이나 HDMI 성공이 아니다.

## 빌드와 공개 범위

```sh
npm ci
npm test
npm run build:preview
npm run build:tv
```

빌드 런타임은 기존 nvm Node 24.22.1을 사용한다. 두 정적 출력은 HTML, CSS, 브라우저 모듈과 허용한 그림만 포함한다. 개인 설정, 소스 서버, 의존성, WGT와 서명키는 웹 게시 영역에 복사하지 않는다. WGT는 로컬의 `dist/unsigned/gaming-hub.wgt`로 전달한다.

## 배포와 복구

각 앱의 릴리스를 `~/.local/share/readiz-dev/<slug>/releases/<commit>/`에 두고 `public/`에 검증한 정적 출력만 복사한다. `sbox`와 `gaminghub` 각각의 `current` 링크를 교체한다. Caddy snippet은 `ops/caddy/preview.Caddyfile`과 `ops/caddy/gaminghub.Caddyfile`이다.

```caddyfile
import /path/to/sbox/current/ops/caddy/preview.Caddyfile
import sbox_preview /path/to/sbox/current/public
import /path/to/gaminghub/current/ops/caddy/gaminghub.Caddyfile
import gaminghub_preview /path/to/gaminghub/current/public
```

Caddy 메인과 실행 중 JSON, 기존 관리 기록과 링크를 비공개 백업한다. 후보 설정을 validate하고 기존 활성 설정과 대조한다. 새 Gaming Hub 호스트와 생성 경로/group 번호 차이 외에 다른 라우트가 바뀌면 reload하지 않는다. 새 호스트의 DNS와 일반 HTTPS, HTTP 308, 보안 헤더와 정적 파일 해시를 확인한다. 실패하면 이번 링크와 Caddy 설정만 복원한다.

관리 기록은 `~/.config/readiz-dev/previews/sbox.json`과 `gaminghub.json`에 릴리스, 커밋, 공개 경로와 복구 백업을 남긴다. 정적 앱이므로 launchd와 상시 Node 프로세스는 필요하지 않다.

## 2026-10-27 검증 기록

자동 검사 23개를 통과했다. 단일 WGT의 CRC와 로컬 자산, manifest와 고유 ID, AppControl 게임별 URI, 중복 입력, 실패/시간 초과 뒤 재시도, PC HTTP/WebSocket/SSE 수신과 재연결을 확인했다.

후보 브라우저에서는 세 게임의 Hub 선택에서 S Box 타이틀까지 전환, Esc 복귀, 두 Hub 창 쌍의 독립 상태와 직접 연 S Box 보존을 확인했다. 1920×1080, 1280×720, 768×1024, 390×844, 360×800에서 두 앱의 가로 넘침이 없었다. 로컬 브라우저 Hub에서 PC B를 거쳐 S Box가 Forest Quest를 표시하는 경로도 확인했다.

개발 도메인의 배포 결과는 최종 확인 뒤 이 기록에 추가한다. 실제 TV 서명/설치와 내부 서비스 수신, HDMI/CEC는 이번 브라우저와 패키지 검증 범위 밖이다.

[문서 안내](README.md) | [서비스 인계](tv-service.md)
