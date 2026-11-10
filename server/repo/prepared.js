// 배포 함수에서는 공개 기준자료를 읽기만 한다. 환경변수·구독 정보는 패키징하지 않는다.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { DATA_DIR } from '../config.js';
const cache = new Map();
// keep:false는 작은 자료를 LRU(3개)에 넣지 않고 읽는다. 큰 자격 자료가 밀려나 매번 다시 풀리는 것을 막는다.
export function readPrepared(key, { keep = true } = {}) {
  if (!['mos', 'docs', 'score', 'scoreSp', 'eligible', 'jobfit', 'social'].includes(key)) throw new Error('Unknown dataset');
  if (cache.has(key)) return cache.get(key);
  const file = path.join(DATA_DIR, 'prepared', `${key}.json.gz`);
  if (!fs.existsSync(file)) return { source: 'missing', fetchedAt: null, items: [] };
  const packed = JSON.parse(zlib.gunzipSync(fs.readFileSync(file)).toString('utf8'));
  const data = { source: packed.source, fetchedAt: packed.fetchedAt, totalCount: packed.totalCount,
    items: packed.rows.map((row) => ({ _norm: Object.fromEntries(packed.columns.map((key, i) => [key, row[i]])) })) };
  if (!keep) return data;
  // 자격(eligible) 하나가 약 370MB이고 나머지 6개를 합쳐도 약 23MB라, 전부 들고 있어도 메모리 차이는 작다.
  // 예전 3칸 제한은 배점표·특기 상세를 번갈아 열 때마다 자격 자료를 다시 풀게 해(약 1초) 오히려 느렸다.
  if (cache.size >= 7) cache.delete(cache.keys().next().value);
  cache.set(key, data);
  return data;
}
export const runtime = { snapshots: null, jobfit: null, exams: null, logs: [] };
