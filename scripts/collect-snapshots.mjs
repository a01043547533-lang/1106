// 접수현황을 한 번 받아 history/에 쌓는다(마감 예측용). GitHub Actions 등에서 30분마다 실행한다.
// 저장 항목은 예측에 필요한 최소(군·회차·구분·특기·부대·입영월·접수기간·모집·접수·시각)이고, 지난 회차는 받지 않는다.
// 사용: MMA_API_KEY=... node scripts/collect-snapshots.mjs   (server/.env의 키도 읽는다)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { refreshStatus } = await import(path.join(ROOT, 'server/live.js').replace(/\\/g, '/').replace(/^([A-Za-z]):/, 'file:///$1:'));
const { runtime } = await import(path.join(ROOT, 'server/repo/prepared.js').replace(/\\/g, '/').replace(/^([A-Za-z]):/, 'file:///$1:'));
import { snapshotRows, validateSnapshotExport } from '../server/snapshot-export.js';

await refreshStatus();
let rows;
if (runtime.snapshots) {
  rows = snapshotRows(runtime.snapshots);
} else if (runtime.logs.findLast((r) => r.api === 'status')?.error === 'missing_key') {
  // GitHub에 키가 없으면 이미 운영 중인 Vercel 서버의 공개 데이터만 받는다.
  // 키를 복사하거나 노출하지 않으며, 원본 수집과 같은 항목·원래 시각을 유지한다.
  try {
    const response = await fetch('https://www.ipdae.net/api/collection-snapshot', {
      signal: AbortSignal.timeout(40000), redirect: 'error', cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error('snapshot_export_http_' + response.status);
    rows = validateSnapshotExport(await response.json());
    console.log('[collect] Vercel의 실시간 접수현황 사용');
  } catch {
    console.error('[collect] Vercel에서 검증된 최신 자료를 받지 못했어요. 아무것도 저장하지 않았어요.');
    process.exit(2);
  }
} else {
  console.error('[collect] 병무청 조회 실패. 아무것도 저장하지 않았어요.');
  process.exit(2);
}
const dir = path.join(ROOT, 'server/data/history');
fs.mkdirSync(dir, { recursive: true });
const file = path.join(dir, `${new Date().toISOString().slice(0, 7)}.jsonl`);
fs.appendFileSync(file, rows.map((r) => JSON.stringify(r)).join('\n') + (rows.length ? '\n' : ''));
console.log(`[collect] ${rows.length}행 저장 → ${path.relative(ROOT, file)} (접수 중·막 마감된 회차만)`);
