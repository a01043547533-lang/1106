# 입대타이밍

React와 병무청 공공데이터 API를 활용한 과제용 웹앱입니다. React 화면은 Vercel에서 정적으로 제공하고, 서버 함수가 API 인증키를 숨긴 채 병무청 접수현황을 조회합니다.

## 실행

```sh
npm ci
npm run dev
npm run build
npm start
npm test
```

로컬 주소는 http://localhost:3000 입니다. Windows에서는 필요하면 npm 대신 npm.cmd를 사용합니다.

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

- `client/src`: React 화면, 스타일, 공통 컴포넌트
- `client/public`: 이미지와 파비콘
- `api/index.js`: Vercel API 진입점
- `server/app.js`: 화면에서 사용하는 조회 API
- `server/live.js`: 병무청 실시간 조회, 30초 메모리 캐시, 동시 요청 병합
- `server/repo`: 공개 자료 읽기와 CSV 변환 도구
- `server/data/prepared`: 압축한 특기·자격·배점·복무기관 기준자료
- `server/data/*.json`, `snapshots.jsonl`: 일정·규칙·복무기간·기존 공개 기록
- `tests/vercel.test.mjs`: 파일 쓰기 금지·인증키 비노출·API 기능 검증

## 데이터 범위

접수현황은 병무청 API에서 갱신합니다. 키 미설정이나 API 실패 시 저장된 공개 기록으로 표시하며 안내 띠와 `/status`에서 상태를 알립니다. 특기·자격·배점·기관 기준은 대규모 요청을 매번 반복하지 않도록 미리 조회한 공개 자료를 함께 제공합니다. 기준자료의 조회일은 `/status`에 표시됩니다. 최신 공고와 최종 자격은 병무청에서 확인해야 합니다.

복무기간은 사용자 제공 `병무청_군별 복무유형별 복무기간_20251231.csv`의 15종을 반영했습니다. 갱신 명령은 `npm run import:service-terms -- "CSV 경로"`입니다.

일반 선발배점 주소는 `https://apis.data.go.kr/1300000//bjGiJun/list/bjGiJun/list`입니다. 기관의 실제 요청주소에 이중 슬래시가 필요합니다.

## 과제에서 제공하지 않는 기능

이메일 구독과 자동 메일 발송, SSR, 영속 파일 수집, 주간 백업은 제거했습니다. 이메일 입력은 받지 않습니다. 가상 광고는 예시 표시이며 외부 광고 추적 스크립트는 없습니다. 함수의 캐시·조회 기록·요청 제한은 메모리에만 보관되어 함수 재시작 시 초기화되고 여러 인스턴스 간 공유되지 않습니다.

[병무청 누리집](https://www.mma.go.kr) · [공공데이터포털](https://www.data.go.kr)