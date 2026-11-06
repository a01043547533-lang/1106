# 입대타이밍

병무청 공공데이터를 수집해 모집병 지원 현황과 특기별 기준을 보여 주는 Vite SSR 사이트입니다. Node.js 20 이상을 사용합니다. 추가 메일 SDK 없이 `fetch`로 Resend에 발송합니다.

## 실행

```sh
npm ci
npm run dev
npm run build
npm start
npm run collect
npm run collect:daily
npm run notify
npm run backup
npm run test:ops
npm run audit:descriptions
```

Windows PowerShell에서 실행 정책에 걸리면 `npm.cmd`를 사용합니다. `server/.env`를 먼저 읽고 루트 `.env`를 보완해 읽습니다. 프로세스 환경변수가 파일보다 우선합니다.

## 운영 설정

`.env.example`을 참고해 `server/.env`에 설정합니다. 기존 병무청 API 키를 덮어쓰지 마세요.

| 변수 | 용도 |
| --- | --- |
| `SITE_URL` | 운영 HTTPS 도메인. canonical 및 확인·해지 링크의 기준 |
| `CONTACT_EMAIL` | 개인정보 문의 및 메일 하단에 공개하는 주소 |
| `MAIL_PROVIDER` | `Resend` (현재 지원하는 HTTP 발송 업체) |
| `MAIL_KEY` | Resend API 키. 비어 있으면 외부 전송 없이 콘솔 미리보기 |
| `MAIL_FROM` | Resend에서 인증한 소유 도메인의 발신 주소 |
| `TRUST_PROXY` | 신뢰할 프록시 IP/CIDR. 직접 연결은 빈 값, 같은 호스트 Nginx는 `loopback` |
| `DATA_DIR` | 웹 서버·수집기·알림기가 공유할 영속 디스크 경로. 기본 `server/data` |

네이버 메일 주소는 문의처로 사용할 수 있습니다. Resend 발신자로 쓰려면 해당 발신 도메인을 인증할 권한이 필요하므로, 운영 `MAIL_FROM`에는 소유 도메인의 인증 주소를 사용하세요. 실제 발송은 MAIL_FROM, CONTACT_EMAIL, HTTPS SITE_URL이 없으면 중단합니다.

메일 API 형식은 [Resend Send Email](https://resend.com/docs/api-reference/emails/send-email), 중복 방지 헤더는 [Resend Idempotency Keys](https://resend.com/docs/dashboard/emails/idempotency-keys)를 따릅니다. 실제 수신·도메인 인증은 운영 키 설정 후 별도로 확인해야 합니다.

## 구독과 알림

1. `POST /api/subscribe`에 `{contact, mosCode?, kinds}`를 보냅니다. `202` 응답은 확인 대기를 뜻합니다.
2. 확인 메일의 `GET /api/verify?token=...` 링크를 48시간 안에 누르면 `verifiedAt`과 확인한 종류가 저장됩니다.
3. 확인 전에는 알림을 보내지 않습니다. 기존 종류 추가도 재확인이 필요합니다. 미확인 신청은 7일 뒤 다음 notifier 실행에서 삭제됩니다.
4. 모든 메일 아래 `GET /api/unsubscribe?token=...` 링크로 구독 정보를 삭제합니다.

`npm run notify`는 Asia/Seoul 기준으로 다음 조건을 검사합니다.

| 종류 | 발송 조건 |
| --- | --- |
| `start` | 접수 시작일 오전 9시~12시 사이 첫 실행 |
| `deadline` | 마감 전날 오전 9시~12시 사이 첫 실행 |
| `shortage` | 마감까지 48시간 이내이고 남은 시간이 양수이며 지원률 1.0 미만인 첫 실행 |
| `katusa`, `social` | `calendar.json`에서 `verified: true`인 일정의 7일 전과 당일, 오전 9시~12시 |

특기 지정 구독은 해당 특기만, 종류만 선택한 구독은 그 종류의 모든 대상을 받습니다. 샘플 모드, 접수현황 연속 3회 실패, 마지막 성공 수집 6시간 초과 시 접수현황 기반 알림은 중단합니다. 확인되지 않은 캘린더 예시 날짜는 보내지 않습니다. 매시 실행이므로 shortage는 정확한 초 단위 48시간 전이 아니라 그 경계 이후 첫 실행에서 전달됩니다.

`server/data/sent_log.jsonl`에 이메일 원문이나 본문 없이 종류·일정·중복 방지 해시·발송 결과를 보관합니다. 같은 이메일과 같은 일정은 구독이 여러 개여도 한 번만 보냅니다. 콘솔 미리보기와 실제 발송 이력은 구분하며 90일 지난 이력은 다음 실행에서 정리합니다.

발송 전에 `pending` 기록을 디스크에 동기화하고 프로세스 잠금으로 동시 실행을 막습니다. 전송 중 연결이 끊기거나 프로세스가 종료되면 전달 여부가 불명확하므로 `pending`/`uncertain` 건을 자동 재발송하지 않습니다. 운영자는 공급자 기록과 대조해야 합니다. Resend의 idempotency 보장은 24시간이므로 로컬 이력을 유지해야 합니다. 잠금 파일이 남으면 기록된 PID가 종료됐는지 확인한 뒤 해당 `.lock` 파일만 제거하세요.

## 수집·백업 스케줄

`.github/workflows/collect.yml`은 배포 서버의 영속 볼륨을 쓰는 Linux self-hosted 러너(`linux`, `ipdae` 라벨)용입니다. 저장소 변수 `IPDAE_PROJECT_DIR`에 설치된 프로젝트 절대 경로를 지정하세요. 워크플로는 원격 배포나 데이터 업로드를 하지 않으며, 현재 배포된 코드와 `server/.env`를 사용합니다.

- 접수현황: 매시 5분 → 수집 직후 `npm run notify`.
- 나머지 데이터: 매일 00:20 KST → 수집 직후 `npm run notify`.
- 백업: 매주 월요일 03:30 KST → `npm run backup`.

GitHub 스케줄은 지연될 수 있습니다. 고정 시각이 필요하면 같은 명령을 배포 호스트의 cron/systemd timer로 실행하세요. 두 스케줄러를 동시에 설정하지 마세요. 임시 GitHub-hosted 러너에서 구독과 발송 이력을 매번 새로 만들면 중복 방지가 깨집니다. 파일 저장 방식은 단일 서버/공유 디스크 기준이며 여러 독립 인스턴스에서는 공유 요청 제한 저장소가 필요합니다.

`backup`은 스냅샷을 `_backup/snapshots-주간시작일.jsonl.gz`로 스트리밍 압축하고, 다시 압축을 풀어 SHA-256을 비교합니다. 원본은 자르거나 삭제하지 않습니다. 같은 주 파일은 덮어쓰지 않으며 옆 manifest에 시각·바이트·해시를 남깁니다. 복원은 수집기를 멈춘 뒤 gzip을 별도 파일로 풀고 manifest 해시를 확인한 다음 진행하세요. 같은 디스크의 백업은 디스크 장애에 대비하지 못하므로 운영 환경에서 `_backup`을 별도 저장소에도 보관하세요.

## 상태·로그·개인정보

`/status`는 마지막 성공/시도 시각, API 8개별 마지막 성공·실패와 연속 실패, 샘플 여부, 최근 24시간 SSR 오류 수를 표시하며 1분마다 갱신합니다. `/api/health`는 같은 정보를 JSON으로 반환합니다. 실패 원문이나 API 키는 공개하지 않습니다. 모든 화면 상단에서 샘플/연속 실패와 6시간 이상 경과를 안내합니다.

앱은 요청 쿼리·본문을 access log에 저장하지 않습니다. 특히 `/api/mos/search`, `/api/eligible`은 정상·오류 경로 모두 쿼리를 남기지 않으며 응답도 `no-store`입니다. SSR 캐시 및 오류 로그도 pathname만 기록합니다. 외부 프록시·호스팅 access log는 별도 설정이므로 운영 전 아래처럼 쿼리와 확인 토큰이 남지 않도록 설정해야 합니다.

```nginx
# http 블록: $request / $request_uri / $args / $http_referer를 로그에 넣지 않음
log_format ipdae '$remote_addr $request_method $uri $status';
# server 블록
access_log /var/log/nginx/ipdae-access.log ipdae;
location /api/ {
    access_log off;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_pass http://127.0.0.1:3000;
}
```

CDN/APM에서도 URL 쿼리 수집을 끄세요. 애플리케이션 전역 API 제한은 IP당 분당 60회(초과 `429`와 `Retry-After`), 구독 신청은 추가로 5회입니다. IP 기록은 메모리에서만 짧게 유지합니다. 서버 데이터 폴더를 정적 웹 경로로 공개하지 마세요. 키 없는 콘솔 모드는 메일 내용·확인 링크가 로그에 나오므로 점검용 주소로만 테스트하고 운영 로그 접근을 제한하세요.

기존 SSR LRU(500개)·10분 TTL·폴백·메타·OG·JSON-LD·sitemap·robots·RSS를 유지합니다. 수집 로그/샘플/연속 실패/신선도가 바뀌면 캐시를 비우며 `/status`와 API는 캐시하지 않습니다. 운영 모드에서 동일 URL을 연속 요청하면 `[ssr] cache miss /...`, `[ssr] cache hit /...`를 볼 수 있습니다.

광고 심사 뒤에는 `client/src/components.jsx`의 `AdSlot` 내부만 교체합니다. 특기 설명 검사는 `npm run audit:descriptions`로 실제 데이터에서 무작위 10개를 뽑아 본문과 근거·중복 문장을 출력합니다.

## 병무청 공식 지원 연결

홈, 접수 목록, 특기 상세, 지원 가능 검색 결과, 모집병·카투사 일정, 푸터에서 공식 지원 화면을 새 창으로 엽니다. 실제 본인인증과 지원서 작성·제출·접수 결과 확인은 병무청에서 진행합니다. 특기 정보나 검색에 입력한 신체조건을 외부 URL에 전달하지 않습니다.

공식 주소는 `client/src/lib/official.js` 한 곳에서 관리합니다. 2026-11-06 [병무청 군지원 서비스](https://www.mma.go.kr/contents.do?mc=mma0001037)의 ‘지원서 작성/수정/취소’ 메뉴에서 `https://mwpt.mma.go.kr/caisBMHS/index_mwps.jsp?menuNo=22041` 링크를 확인했습니다. 세션이나 병무청 화면 구성에 따라 메뉴가 바로 열리지 않을 경우를 위해 병무민원포털 홈과 공식 모집계획 링크도 제공합니다.
