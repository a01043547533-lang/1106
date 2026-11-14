# 입대타이밍 (Next.js 통합판)

1탄 입대타이밍(`Documents/1106과제`, React+Vite+Express)을 Next.js 16으로 옮기고, 2탄(전역일 계산기·군인 월급표·훈련소 준비물·입대 전 할 일)을 1탄 디자인 그대로 합친 버전. **아직 배포하지 않음.** 원본 `1106과제` 폴더는 건드리지 않았다.

## 실행

```bash
npm install
npm run dev            # http://localhost:3000
npm run build          # prebuild(예측표·자격·시험일정·sitemap) 후 next build
npm start
npm test               # 2탄 계산 테스트(vitest, 2020~2035 전 날짜 전수 검사 포함) + 1탄 서버 테스트(node --test)
```

`server/.env`의 `MMA_API_KEY`는 1탄과 같다(로컬 전용, git 제외). Vercel에는 환경변수로 등록.

## 구조

| 위치 | 내용 |
|---|---|
| `src/legacy/` | 1탄 React 화면 원본(거의 그대로). `styles.css`도 그대로 |
| `src/legacy/router.jsx` | react-router-dom → Next.js 연결 (Link·NavLink·useParams 등). 1탄 코드는 import 경로만 바뀜 |
| `src/legacy/Shell.jsx` | 1탄 App의 머리말·메뉴·바닥글 (라우트 대신 children). 메뉴에 '입대 후' 묶음 추가 |
| `src/app/*/page.tsx` | 1탄 21개 주소 + 2탄 `/service` `/pay` `/training` `/todo` `/developers` |
| `src/pages/api/[...path].js` | 1탄 Express API(`server/app.js`)를 그대로 연결 |
| `src/app/api/v1/*` | 2탄 공개 API (전역일·진급·월급·적금·준비물·공휴일·ics) |
| `src/lib`, `src/rules`, `src/data` | 2탄 계산 엔진, 연도별 규정(2026·2027 JSON), 훈련소·사단 16곳 데이터 |
| `server/`, `scripts/`, `shared/` | 1탄 서버·수집 스크립트 (데이터 경로만 프로젝트 루트 기준으로 변경) |

## 1탄에서 바뀐 점

- `server/config.js`: `ROOT_DIR`을 `import.meta.url` 대신 `process.cwd()`로 (Next 번들 위치 문제).
- `scripts/postbuild-seo.mjs`: 출력 위치 `dist/client` → `public/` (prebuild에서 실행).
- `vercel.json`: framework vite → nextjs. 파일 포함 규칙은 `next.config.ts`의 `outputFileTracingIncludes`로.
- `/score`→`/calc`, `/ads`→`/about` 리다이렉트는 `next.config.ts`.
- `tests/client.test.mjs`(react-test-renderer로 Vite 화면 검사)는 아직 Next용으로 안 옮김.
- 준비 체크리스트(`/prepare`)의 전역일 계산 칸에 2탄 계산기 링크 추가. 홈은 그대로.

## 매년 할 일

- `src/rules/2027.json`: 2027년 병 봉급이 발표되면 `pay` 숫자와 `status: "confirmed"`로 바꾼다 (지금은 "발표 전"으로 표시).
- `src/rules/holidays.json`: 다음 해 공휴일 추가 (매년 6월쯤 월력요항).
- `npm run watch`: 훈련소·규정 출처 페이지 변경 감지 (1~2주마다).

## 렌더링 방식

- 공통 틀(머리말·메뉴·바닥글)과 고정 내용 페이지(가이드 글, 소개, 약관, 2탄 페이지)는 서버에서 그린다.
- 날짜·localStorage·실시간 값에 따라 바뀌는 1탄 화면(홈, 접수 현황, 플래너 등)은 `src/legacy/ClientOnly.jsx`로 1탄처럼 브라우저에서만 그린다(빌드한 날과 보는 날이 달라 생기는 하이드레이션 충돌 방지).
- `router.jsx`의 `useLocation`은 쿼리를 구독하지 않는다. 계산기가 주소를 바꿔도 화면이 맨 위로 튀지 않게 하기 위함.
- 1탄 링크는 미리 불러오기(prefetch)를 끈다.

## 2026-11-14 점검 결과

- 타입 검사·린트(오류 0, 1탄 원본 패턴 경고 15)·`npm run build`(사전 단계 포함) 통과
- 계산: 테스트 35개(2020~2035년 모든 입대일 × 5개 군, 사단 16곳 × 주 단위 × 기준일 3개 불변식 검사)
- 1탄 서버 테스트 10개 통과
- 실제 Edge로 81개 주소 × (1280·390px): 자바스크립트·하이드레이션 오류 0, h1 1개, 폰 가로 넘침 0, 내부 링크 502개 모두 정상
- 클릭·입력 시나리오 14개 통과(입력 시 스크롤·포커스 유지, 뒤로가기, 폰 메뉴, 사단 선택, 체크 저장, API 오류 응답, ics 형식)
- 전역일: 끝 달에 같은 날짜가 없으면 그 달 말일(민법 160조). 예: 2026-03-31 입대 → 2027-09-30
- API 함수 크기 25.7MB(큰 원본 데이터는 `.vercelignore`·`outputFileTracingExcludes`로 제외)
