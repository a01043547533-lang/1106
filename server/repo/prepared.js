// 배포 함수에서는 공개 기준자료를 읽기만 한다. 환경변수·구독 정보는 패키징하지 않는다.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { DATA_DIR } from '../config.js';
const cache = new Map();
export function readPrepared(key) {
  if (!['mos', 'docs', 'score', 'scoreSp', 'eligible', 'jobfit', 'social'].includes(key)) throw new Error('Unknown dataset');
  if (cache.has(key)) return cache.get(key);
  const file = path.join(DATA_DIR, 'prepared', `${key}.json.gz`);
  if (!fs.existsSync(file)) return { source: 'missing', fetchedAt: null, items: [] };
  const packed = JSON.parse(zlib.gunzipSync(fs.readFileSync(file)).toString('utf8'));
  const data = { source: packed.source, fetchedAt: packed.fetchedAt, totalCount: packed.totalCount,
    items: packed.rows.map((row) => ({ _norm: Object.fromEntries(packed.columns.map((key, i) => [key, row[i]])) })) };
  if (cache.size >= 3) cache.delete(cache.keys().next().value);
  cache.set(key, data);
  return data;
}
export const runtime = { snapshots: null, logs: [] };
