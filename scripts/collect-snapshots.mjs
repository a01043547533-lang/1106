// 접수현황을 한 번 받아 history/에 쌓는다(마감 예측용). GitHub Actions 등에서 30분마다 실행한다.
// 저장 항목은 예측에 필요한 최소(군·회차·구분·특기·부대·입영월·접수기간·모집·접수·시각)이고, 지난 회차는 받지 않는다.
// 사용: MMA_API_KEY=... node scripts/collect-snapshots.mjs   (server/.env의 키도 읽는다)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { refreshStatus } = await import(path.join(ROOT, 'server/live.js').replace(/\\/g, '/').replace(/^([A-Za-z]):/, 'file:///$1:'));
const { runtime } = await import(path.join(ROOT, 'server/repo/prepared.js').replace(/\\/g, '/').replace(/^([A-Za-z]):/, 'file:///$1:'));
const { scheduleTime } = await import(path.join(ROOT, 'server/time.js').replace(/\\/g, '/').replace(/^([A-Za-z]):/, 'file:///$1:'));

await refreshStatus();
if (!runtime.snapshots) { console.error('[collect] 병무청 조회 실패(키 없음 또는 응답 오류). 아무것도 저장하지 않았어요.'); process.exit(2); }
const now = Date.now();
const rows = runtime.snapshots
  .filter((s) => s.applyEnd && scheduleTime(s.applyEnd, true) >= now - 86400000) // 마감 하루 지난 것까지(마감 직후 최종값 확보)
  .map((s) => ({ t: s.collectedAt, b: s.branch, r: s.roundLabel, c: s.category, m: s.mosCode, n: s.mosName, u: s.unit, e: s.enlistMonth, as: s.applyStart, ae: s.applyEnd, q: s.quota, a: s.applicants }));
const dir = path.join(ROOT, 'server/data/history');
fs.mkdirSync(dir, { recursive: true });
const file = path.join(dir, `${new Date().toISOString().slice(0, 7)}.jsonl`);
fs.appendFileSync(file, rows.map((r) => JSON.stringify(r)).join('\n') + (rows.length ? '\n' : ''));
console.log(`[collect] ${rows.length}행 저장 → ${path.relative(ROOT, file)} (접수 중·막 마감된 회차만)`);
