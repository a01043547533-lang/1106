// 과제 배포용 읽기 전용 공개 데이터 저장소.
import { readJson, readJsonl } from './files.js';
import { APIS } from '../config.js';
import { readPrepared, runtime } from './prepared.js';
export const getDataset = (key) => readPrepared(key);
// 자격(eligible) 자료를 특기코드별로 묶은 색인. 자료 객체가 바뀌면(캐시 교체) 다시 만든다.
const eligibleIndex = new WeakMap();
export function getEligibleByMos() {
  const ds = readPrepared('eligible');
  let index = eligibleIndex.get(ds);
  if (!index) {
    index = new Map();
    for (const it of ds.items) { const code = it._norm.mosCode; if (!index.has(code)) index.set(code, []); index.get(code).push(it); }
    eligibleIndex.set(ds, index);
  }
  return index;
}
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
export const getForecast = () => readJson('forecast.json', null);
export const getExamSchedule = () => readJson('exam_schedule.json', null);
// 맞춤형 특기병 정보: 실시간 조회값이 있으면 그것을, 없으면 저장된 기준자료를 쓴다.
const toNum = (v) => (v === null || v === undefined || v === '' ? null : Number(v));
let preparedJobfit = null;
export function getPreparedJobfit() {
  if (preparedJobfit) return preparedJobfit;
  const ds = readPrepared('jobfit', { keep: false });
  preparedJobfit = { source: ds.source === 'missing' ? 'missing' : 'prepared', fetchedAt: ds.fetchedAt,
    items: ds.items.map((it) => { const n = it._norm; return { ...n, enlistDate: String(n.enlistDate || ''), quota: toNum(n.quota), selected: toNum(n.selected), vacancy: toNum(n.vacancy) }; }) };
  return preparedJobfit;
}
export function getJobfit() {
  if (runtime.jobfit) return { source: 'api', fetchedAt: runtime.jobfit.fetchedAt, items: runtime.jobfit.items };
  return getPreparedJobfit();
}
export function collectStatus(now = Date.now()) {
  // 상단 배너·수집 시각은 접수현황(status) 기록만 본다. 다른 API의 실패가 섞이지 않게 한다.
  const logs = runtime.logs.filter((r) => r.api === 'status');
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