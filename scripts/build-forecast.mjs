// history/*.jsonl에서 「마감 N시간 전 지원률 → 마감 지원률」 비율을 뽑아 server/data/forecast.json을 만든다.
// 빌드 때 실행되고(npm run build), 화면은 이 파일로 현재 지원률에 비율을 곱해 「마감 예상」을 보여 준다.
// 모델은 일부러 단순하다: 설명할 수 있고, 표본 수와 범위(25~75%)를 같이 보여 줘 과신을 막는다.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { scheduleTime } = await import(path.join(ROOT, 'server/time.js').replace(/\\/g, '/').replace(/^([A-Za-z]):/, 'file:///$1:'));
const dir = path.join(ROOT, 'server/data/history');
const out = path.join(ROOT, 'server/data/forecast.json');
export const BUCKETS = [[72, 48], [48, 24], [24, 12], [12, 6], [6, 0]]; // 마감까지 남은 시간 구간(시)
const MIN_SAMPLES = 8;
const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.jsonl')).sort() : [];
const groups = new Map();
let rowCount = 0;
for (const f of files) {
  for (const line of fs.readFileSync(path.join(dir, f), 'utf8').split('\n')) {
    if (!line.trim()) continue;
    let r; try { r = JSON.parse(line); } catch { continue; }
    rowCount++;
    const key = [r.b, r.r, r.c, r.m, r.u, r.e].join('|');
    if (!groups.has(key)) groups.set(key, { branch: r.b, category: r.c, end: scheduleTime(r.ae, true), points: [] });
    const q = Number(r.q), a = Number(r.a);
    if (q > 0 && Number.isFinite(a)) groups.get(key).points.push({ t: Date.parse(r.t), rate: a / q });
  }
}
const now = Date.now();
const samples = []; // { branch, category, bucket, ratio }
let closedGroups = 0;
for (const g of groups.values()) {
  if (!Number.isFinite(g.end) || g.end > now - 3600000) continue; // 마감 뒤 1시간 지난 회차만(최종값이 들어왔을 때)
  g.points.sort((x, y) => x.t - y.t);
  const final = g.points.filter((p) => p.t <= g.end + 3600000).at(-1);
  if (!final) continue;
  closedGroups++;
  for (const [hi, lo] of BUCKETS) {
    const inBucket = g.points.filter((p) => { const h = (g.end - p.t) / 3600000; return h <= hi && h > lo; });
    const p = inBucket.at(-1); // 구간에서 마감에 가장 가까운 관측
    if (!p || p.rate < 0.05) continue; // 0에 가까운 값에서의 비율은 의미가 없다
    samples.push({ branch: g.branch, category: g.category, bucket: `${hi}-${lo}`, ratio: final.rate / p.rate });
  }
}
const stat = (arr) => { const v = arr.map((s) => s.ratio).sort((a, b) => a - b); const q = (p) => v[Math.min(v.length - 1, Math.floor(p * (v.length - 1)))]; return { n: v.length, median: +q(0.5).toFixed(3), p25: +q(0.25).toFixed(3), p75: +q(0.75).toFixed(3) }; };
const byKey = (fn) => { const m = {}; for (const s of samples) { const k = fn(s); if (!k) continue; (m[k] ??= {})[s.bucket] ??= []; m[k][s.bucket].push(s); } return Object.fromEntries(Object.entries(m).map(([k, b]) => [k, Object.fromEntries(Object.entries(b).filter(([, v]) => v.length >= MIN_SAMPLES).map(([bk, v]) => [bk, stat(v)]))])); };
const forecast = {
  builtAt: new Date().toISOString(), rows: rowCount, closedRounds: closedGroups, samples: samples.length, minSamples: MIN_SAMPLES, buckets: BUCKETS.map(([hi, lo]) => `${hi}-${lo}`),
  overall: byKey(() => 'all').all || {},
  byBranch: byKey((s) => s.branch),
  byCategory: byKey((s) => `${s.branch}|${s.category}`),
  since: files[0]?.replace('.jsonl', '') || null,
};
fs.writeFileSync(out, JSON.stringify(forecast));
console.log(`[forecast] 기록 ${rowCount}행 · 마감 회차 ${closedGroups}개 · 표본 ${samples.length}개 → ${path.relative(ROOT, out)}${Object.keys(forecast.overall).length ? '' : ' (표본 부족: 화면에는 「기록 수집 중」으로 표시)'}`);
