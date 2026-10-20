# 게임 이미지와 아이콘

Apex Racing, Forest Quest, Orbit Arena를 실제 게임 라이브러리처럼 보여주기 위해 만든 데모 자산이다. 실제 게임사와 제휴하거나 기존 상용 게임의 화면을 사용한 것은 아니다.

이미지 6장은 2026-10-20에 내장 `image_gen` 도구로 생성했다. 최종 프롬프트 전체는 [prompts.json](prompts.json)에 기록한다. 게임 이름은 HTML로 표시하고 이미지에는 글자를 넣지 않았다.

| 폴더 | 배경 | 아이콘 |
|---|---|---|
| `apex-racing/` | 해안 도로와 푸른 스포츠카 | 차량과 트랙 곡선 |
| `forest-quest/` | 숲의 유적과 모험가 | 잎 모양 문과 등불 |
| `orbit-arena/` | 행성 위 궤도 아레나와 함선 | 함선과 궤도 고리 |

각 폴더의 파일:

- `cover.webp`: 생성 배경의 구도를 유지한 WebP 변환. 콘솔 홈과 타이틀 배경에 사용
- `icon.png`: 512×512 PNG. 콘솔 카드, 로딩과 타이틀에 사용
- `icon-117.png`: 117×117 RGBA PNG. WGT 내부 `icon.png`로 복사

이미지 생성 후 포맷 변환과 아이콘 크기 조정만 수행했다. 생성 원본은 생성 도구의 보관 위치에 남겨 두고, 앱이 참조하는 최종 파일은 모두 이 폴더에 포함한다.

117×117 아이콘은 Tizen 개발 설치용이다. Seller Office 게시용 아이콘 규격과는 구분한다. 현재 산출물은 개발 설치용 WGT 범위다. [Samsung 공식 아이콘 FAQ](https://developer.samsung.com/smarttv/design/smart-tv-application-design-qa.html)
