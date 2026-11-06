// 과제 배포용 읽기 전용 공개 데이터 저장소.
import { readJson, readJsonl } from './files.js';
import { APIS } from '../config.js';
import { readPrepared, runtime } from './prepared.js';
export const getDataset = (key) => readPrepared(key);
export const getSnapshots = () => runtime.snapshots ?? readJsonl('snapshots.jsonl');
export const snapKey = (s) => [s.branch, s.roundLabel, s.enlistMonth, s.unit, s.category, s.mosCode].join('|');
export function latestSnapshots() {
  const map = new Map();
  for (const row of getSnapshots()) {
    const key = snapKey(row); const old = map.get(key);
    if (!old || old.collectedAt <= row.collectedAt) map.set(key, row);
  }
  return [...map.values()];
}
export const getFinalRates = () => readJson('final_rates.json', []);
export const getServiceTerms = () => readJson('service_terms.json', []);
export const getCalendar = () => readJson('calendar.json', []);
export const getLottery = () => readJson('lottery.json', []);
export const getRules = () => readJson('rules.json', []);
export const getLinks = () => readJson('links.json', {});
export function collectStatus(now = Date.now()) {
  const logs = runtime.logs;
  let consecutiveFailures = 0;
  for (let i = logs.length - 1; i >= 0 && !logs[i].ok; i--) consecutiveFailures++;
  const lastOk = logs.findLast((r) => r.ok);
  const last = getSnapshots().at(-1);
  const lastCollectedAt = lastOk?.at || (last?.source === 'api' ? last.collectedAt : null);
  return { lastCollectedAt, lastAttemptAt: logs.at(-1)?.at || null, consecutiveFailures,
    isSample: last ? last.source === 'sample' : false,
    stale: !lastCollectedAt || now - Date.parse(lastCollectedAt) > 6 * 3600000,
    liveAvailable: Boolean(runtime.snapshots), connectionFailed: logs.at(-1)?.ok === false };
}
export function operationStatus(now = Date.now()) {
  const apis = Object.entries(APIS).map(([key, api]) => {
    const logs = runtime.logs.filter((row) => row.api === key); const last = logs.at(-1);
    let consecutiveFailures = 0;
    for (let i = logs.length - 1; i >= 0 && !logs[i].ok; i--) consecutiveFailures++;
    return { key, name: api.name, lastAttemptAt: last?.at || null, ok: last?.ok ?? null,
      lastSuccessAt: logs.findLast((r) => r.ok)?.at || null, lastFailureAt: logs.findLast((r) => !r.ok)?.at || null,
      httpStatus: last?.httpStatus ?? null, consecutiveFailures };
  });
  return { ...collectStatus(now), apis, deploymentMode: 'serverless', apiConfigured: Boolean(process.env.MMA_API_KEY),
    referenceData: readJson('prepared/manifest.json', []), checkedAt: new Date(now).toISOString() };
}