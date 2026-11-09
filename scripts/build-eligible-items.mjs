// 자격·면허·전공 목록(종류·지원 가능 특기 수)을 빌드 때 미리 계산해 둔다.
// 요청 때 127만 행을 세면 서버가 깨어난 첫 요청이 1.7초 걸리므로, 작은 JSON으로 만들어 바로 읽게 한다.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const url = (p) => 'file:///' + path.join(ROOT, p).split(path.sep).join('/');
const { readPrepared } = await import(url('server/repo/prepared.js'));
const ds = readPrepared('eligible', { keep: false });
const count = new Map(), kindOf = new Map();
for (const e of ds.items) { const n = e._norm; if (!n.item) continue; let set = count.get(n.item); if (!set) { count.set(n.item, (set = new Set())); kindOf.set(n.item, n.kind || '기타'); } set.add(n.mosCode); }
const kindOrder = { 자격: 0, 면허: 1, 전공: 2 };
const items = [...count.entries()].sort((a, b) => (kindOrder[kindOf.get(a[0])] ?? 9) - (kindOrder[kindOf.get(b[0])] ?? 9) || b[1].size - a[1].size || a[0].localeCompare(b[0], 'ko')).map(([item]) => ({ item, kind: kindOf.get(item), specialties: count.get(item).size }));
fs.writeFileSync(path.join(ROOT, 'server/data/eligible_items.json'), JSON.stringify({ builtAt: new Date().toISOString(), source: ds.fetchedAt, items }));
console.log(`[eligible-items] ${items.length}개 → server/data/eligible_items.json`);
