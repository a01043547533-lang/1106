# 입대타이밍

React와 병무청 공공데이터 API를 활용한 모집병 정보 사이트입니다. 데이터 화면(접수현황·특기·일정)과 함께 `/guide` 아래에 제도 설명 글, `/about`·`/contact`·`/privacy`·`/terms` 필수 페이지를 제공합니다. React 화면은 Vercel에서 정적으로 제공하고, 서버 함수가 API 인증키를 숨긴 채 병무청 접수현황을 조회합니다.

## 실행

```sh
npm ci
npm run dev
npm run build
npm start
npm test
```

로컬 주소는 http://localhost:3000 입니다. 개발 서버는 이 PC에서만 열립니다(다른 기기에서 열려면 HOST=0.0.0.0). Windows에서는 필요하면 npm 대신 npm.cmd를 사용합니다.

## 비공개 인증키

로컬의 `server/.env`에 `MMA_API_KEY=발급받은키`를 설정합니다. 이 파일은 GitHub와 Vercel 업로드에서 제외됩니다. `VITE_`로 시작하는 변수에는 키를 넣지 않습니다.

## Vercel 배포

1. GitHub `a01043547533-lang/1106` 저장소의 `master` 브랜치를 연결합니다.
2. Root Directory는 저장소 루트(빈 값 또는 `.`)로 설정합니다.
3. Framework Preset은 Vite, Build Command는 `npm run build`, Output Directory는 `dist/client`입니다. 저장소의 `vercel.json`에도 지정되어 있습니다.
4. Settings → Environment Variables에서 서버용 `MMA_API_KEY`를 등록합니다. 로컬 .env는 자동 업로드되지 않습니다.
5. Redeploy 후 `/`, `/now`, `/find`, `/mos/S22`, `/api/health`를 확인합니다. `/api/health`의 `apiConfigured: true`, `liveAvailable: true`가 실제 연결 성공을 뜻합니다.

화면에서 `/api/*`를 호출하면 Vercel의 `api/index.js` 함수로 전달됩니다. 그 밖의 페이지 직접 접속은 React index.html로 연결되어 새로고침 404를 방지합니다. 인증키는 서버에서만 읽으며 응답에 넣지 않습니다.

## 프로젝트 구성

- `client/src`: React 화면, 스타일, 공통 컴포넌트 (`pages/Guide.jsx`: 제도 설명 글, `lib/guide-list.js`: 글 목록·sitemap 공용)
- `scripts/postbuild-seo.mjs`: robots.txt·sitemap.xml 생성
- `client/public`: 이미지와 파비콘
- `api/index.js`: Vercel API 진입점
- `server/app.js`: 화면에서 사용하는 조회 API
- `server/live.js`: 병무청 실시간 조회(접수현황 30초, 맞춤형 특기병 10분 메모리 캐시), 동시 요청 병합. 받아 둔 값이 있으면 먼저 응답하고 갱신은 뒤에서 한다(서버가 막 켜졌을 때만 첫 조회를 기다림).
- `server/rate-limit.js`: IP당 분당 요청 한도(기본 120, `RATE_LIMIT_PER_MIN`). Vercel에서는 `x-real-ip`/`x-vercel-forwarded-for`로 방문자를 구분한다.
- `client/src/lib/fetch-cache.js`: 화면의 같은 API 요청을 합치고 잠깐 재사용(기준자료 5분, 그 밖 30초)
- `server/repo`: 공개 자료 읽기와 CSV 변환 도구
- `server/data/prepared`: 압축한 특기·자격·배점·복무기관 기준자료
- `server/data/*.json`, `snapshots.jsonl`: 일정·규칙·복무기간·기존 공개 기록
- `tests/vercel.test.mjs`: 파일 쓰기 금지·인증키 비노출·API 기능 검증

## 데이터 범위

접수현황은 병무청 API에서 갱신합니다. 키 미설정이나 API 실패 시 저장된 공개 기록으로 표시하며 안내 띠와 `/status`에서 상태를 알립니다. 특기·자격·배점·기관 기준은 대규모 요청을 매번 반복하지 않도록 미리 조회한 공개 자료를 함께 제공합니다. 기준자료의 조회일은 `/status`에 표시됩니다. 최신 공고와 최종 자격은 병무청에서 확인해야 합니다.

복무기간은 사용자 제공 `병무청_군별 복무유형별 복무기간_20251231.csv`의 15종을 반영했습니다. 갱신 명령은 `npm run import:service-terms -- "CSV 경로"`입니다.

일반 선발배점 주소는 `https://apis.data.go.kr/1300000//bjGiJun/list/bjGiJun/list`입니다. 기관의 실제 요청주소에 이중 슬래시가 필요합니다.

## 지원자용 기능

- `/closing` 마감 임박 미달 보드: 접수 중인 특기 중 마감이 24시간·48시간·7일 이내이고 지원률 1.0 미만인 것만 모아 30초마다 갱신합니다. 홈 상단 창에 48시간 기준 개수를 함께 표시합니다.
- `/jobfit` 취업맞춤특기병 입영일별 남은 자리: 병무청 「맞춤형 특기병 정보」 API를 서버가 10분 캐시로 조회하고(실패 시 `server/data/prepared/jobfit.json.gz` 저장본), 입영일별 모집·선발·남은 자리(모집 − 선발)를 보여 줍니다. 특기 상세에도 같은 표가 붙고, 특기 목록에 없던 맞춤특기병 특기도 상세 페이지가 열립니다.
- `/calc` 예상 배점 계산기: 병무청 선발배점기준(일반·전문특기병)을 구분별 선택지로 바꿔 합계를 계산하고, 보유 자격을 고르면 특기별 지원가능 정보의 인정 등급·관련 구분으로 자동 선택합니다. 추첨 분야는 안내만 표시합니다.
- `/compare` 특기 비교함: 최대 3개 특기의 복무기간·신체조건·지원률 흐름을 나란히 봅니다. 담은 목록은 브라우저 localStorage에만 저장합니다. 특기 상세의 「비교함에 담기」와 연동됩니다.
- 캘린더에 추가: 모집 일정, 특기 상세의 접수 마감, 마감 임박 보드에서 `.ics` 파일 내려받기와 Google 캘린더 링크를 제공합니다(`client/src/lib/ics.js`). 브라우저에서만 만들고 서버 호출이나 개인정보 수집이 없습니다. 종일 일정은 하루 전, 시각이 있는 일정은 3시간 전 알림이 들어갑니다.

## 특기 식별(군 + 코드)

특기 코드는 군마다 따로 매겨져 같은 코드가 여러 군에 있습니다(예: 46 = 해군 건축·토목 / 공군 비파괴검사병). 그래서 특기는 「군 + 코드」로 찾습니다. 여러 군이 쓰는 코드는 주소에 군을 붙이고(`/mos/46?branch=공군`), 군 없이 열면 고르는 화면이 나옵니다. 특기 상세는 인정 자격을 앞 150개와 전체 개수만 보내고(Vercel 응답 한도 4.5MB), 보유 자격 대조는 `/api/mos/:code/match`가 전체 목록으로 합니다. 자격 자료의 「해병」은 「해병대」로 맞춥니다.

## 마감 예측 · 자격 시험 일정 · 감시

- **마감 지원률 예측**: `scripts/collect-snapshots.mjs`가 접수현황을 `server/data/history/YYYY-MM.jsonl`에 쌓고, `scripts/build-forecast.mjs`(빌드 때 자동 실행)가 「마감 N시간 전 지원률 → 마감 지원률」 비율을 모집구분·군·전체 단위로 계산해 `server/data/forecast.json`을 만듭니다. 화면(마감 임박 보드, 특기 상세)은 표본이 8건 이상 모인 구간부터 예상치와 25~75% 범위를 보여 주고, 그 전에는 「기록 수집 중」으로 표시합니다. 수집은 `.github/workflows/collect-snapshots.yml`이 30분마다 하고 하루 한 번 예측표를 다시 만들어 커밋합니다(저장소 Secrets에 `MMA_API_KEY` 필요, Vercel Ignored Build Step 설정은 워크플로 주석 참고).
- **자격 시험 일정**: 한국산업인력공단 「국가기술자격 종목별 시험정보」 API(공공데이터포털 15003029, 병무청과 같은 인증키)를 서버가 하루 한 번 받아 기사·산업기사·기능사 정기 회차를 보여 줍니다(정기·빈자리 접수 행을 한 회차로 합치고 상시 기능사는 제외). 이 서비스는 https를 받지 않아 http로 호출합니다. 실패하면 `server/data/exam_schedule.json` 저장본을 쓰며, 저장본은 빌드할 때 `scripts/fetch-exam-schedule.mjs`가 API로 다시 만듭니다.
- **외부 감시**: `/api/ping`은 접수현황 수집이 연속 3회 이상 실패했거나 6시간 넘게 성공이 없으면 503을 돌려줍니다. UptimeRobot 같은 무료 서비스에 5분 간격 HTTP 감시로 등록하면 장애 알림을 받습니다.
- **접속 통계**: Vercel Analytics(쿠키 없음). Vercel 프로젝트에서 Analytics를 켜면 집계가 시작됩니다.

## 검색 노출과 광고(AdSense)

- 빌드 후 `scripts/postbuild-seo.mjs`가 `dist/client/robots.txt`와 `sitemap.xml`(정적 라우트 + 가이드 글 + 특기 상세 전부)을 만듭니다. 사이트 주소는 `SITE_URL`, 없으면 Vercel의 `VERCEL_PROJECT_PRODUCTION_URL`을 씁니다. 둘 다 없으면 sitemap은 만들지 않습니다.
- 화면은 라우트마다 title·description·canonical·OG 태그를 갱신합니다(`client/src/design.jsx`). `/status`, `/contact`, 404는 noindex입니다.
- 화면에는 광고 자리를 두지 않습니다. `VITE_ADSENSE_CLIENT=ca-pub-…`가 빌드 환경변수에 있으면 `client/vite.config.js`가 AdSense 스크립트만 `<head>`에 넣습니다(심사 코드 겸 자동 광고). 승인 뒤 자동 광고를 켜거나, 원하는 위치에 광고 단위를 직접 추가합니다.
- 승인 절차: ① 도메인 연결 후 `SITE_URL`·`VITE_SITE_URL`·`CONTACT_EMAIL` 설정 → ② AdSense에서 사이트 추가, 발급받은 게시자 ID를 `VITE_ADSENSE_CLIENT`로 넣고 재배포(심사 코드 삽입) → ③ 승인 후 AdSense가 알려 주는 `ads.txt` 한 줄을 `client/public/ads.txt`로 추가하고, AdSense에서 자동 광고를 켜서 재배포.
- 서치콘솔·네이버 소유 확인은 `GOOGLE_SITE_VERIFICATION`, `NAVER_SITE_VERIFICATION` 값을 넣으면 메타 태그로 들어갑니다.

## 제공하지 않는 기능

이메일 구독과 자동 메일 발송, SSR, 영속 파일 수집, 주간 백업은 제공하지 않습니다. 이메일 입력은 받지 않습니다. 함수의 캐시·조회 기록·요청 제한은 메모리에만 보관되어 함수 재시작 시 초기화되고 여러 인스턴스 간 공유되지 않습니다.

[병무청 누리집](https://www.mma.go.kr) · [공공데이터포털](https://www.data.go.kr)