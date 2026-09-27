# 로또 명당 지도

앱 화면은 앱인토스에 한 번만 올리고, 판매점 데이터는 GitHub Pages에서 매주 자동 갱신해요.
앱은 실행될 때 Pages의 data.json을 확인해서, 내장 데이터보다 최신이면 교체해요.
불러오지 못하면 내장 데이터로 그대로 동작해요.

## 처음 한 번만 할 일
1. GitHub에 `lotto-myeongdang-map` 저장소를 만들고 이 폴더를 올려요.
2. 저장소 Settings → Pages → Build and deployment 의 Source를 **GitHub Actions** 로 바꿔요.
3. Actions 탭에서 "명당 데이터 주간 갱신"을 Run workflow로 한 번 실행해요.
4. 아래 주소가 열리는지 확인해요.
   https://whwnsgnl8554-png.github.io/lotto-myeongdang-map/data.json
5. `npm install && npm run build` 로 만든 `dist/index.html`을 앱인토스에 올려요.
   (Actions 실행 화면의 Artifacts에서 appintoss-index-html을 받아도 같아요.)

저장소 이름이나 계정을 바꾸면 `config.json`의 dataUrl도 같이 바꾼 뒤 다시 빌드해서 올려요.

## 이후
- 매주 일·화 오전 9시에 Actions가 data.json을 갱신해요. 앱인토스에 다시 올릴 필요 없어요.
- 화면이나 기능(`template.html`)을 고쳤을 때만 다시 빌드해서 올려요.

## 파일
- `template.html` — 화면 코드
- `build.js` — 데이터 다운로드, 판매점별 집계, 결과물 생성
- `config.json` — 앱이 불러올 data.json 주소
- `dist/index.html` — 앱인토스용 (데이터 내장)
- `public/` — GitHub Pages로 배포되는 data.json, version.json

## 안전장치
- 새 데이터의 최신 회차가 배포된 데이터보다 작으면 빌드를 멈춰요.
- 앱은 형식이 이상하거나 더 오래된 데이터는 무시해요.
- 받아온 최신 데이터는 기기에 저장해 두고 다음 실행 때 먼저 써요.

## 데이터 출처
uriseozz/lotto-data 의 stores.json (동행복권 배출점 API 수집본, 262회~)
