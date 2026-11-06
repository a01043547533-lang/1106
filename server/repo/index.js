// 데이터 접근 함수 모음. API 핸들러와 수집기는 이 함수들만 부른다.
import { readJson, writeJson, readJsonl, appendJsonl, retainJsonl } from './files.js';
import { APIS } from '../config.js';
import { updateSubscriptions } from './files.js';
export { updateSubscriptions, acquireLock, backupSnapshots } from './files.js';

// ── 수집기가 채우는 데이터셋 ──
// 저장 형식: { fetchedAt, totalCount, source, items: [...] }
export const DATASET_FILES = {
  mos: 'mos_master.json',
  docs: 'documents.json',
  score: 'scoring_rules.json',
  scoreSp: 'scoring_rules_special.json',
  eligible: 'eligibility.json',
  jobfit: 'jobfit.json',
  social: 'social_orgs.json',
};

export function getDataset(key) {
  return readJson(DATASET_FILES[key], { fetchedAt: null, totalCount: 0, source: 'sample', items: [] });
}
export function saveDataset(key, value) {
  writeJson(DATASET_FILES[key], value);
}

// ── 접수현황 스냅샷 (추가만) ──
export const getSnapshots = () => readJsonl('snapshots.jsonl');
export const appendSnapshots = (rows) => appendJsonl('snapshots.jsonl', rows);

// (roundLabel, mosCode, branch, unit, category)별 가장 최근 스냅샷
export function latestSnapshots() {
  const map = new Map();
  for (const s of getSnapshots()) {
    const k = snapKey(s);
    const prev = map.get(k);
    if (!prev || prev.collectedAt <= s.collectedAt) map.set(k, s);
  }
  return [...map.values()];
}
// 같은 특기라도 입영월·입영부대가 다르면 별도 줄이다.
export const snapKey = (s) => [s.branch, s.roundLabel, s.enlistMonth, s.unit, s.category, s.mosCode].join('|');

// ── 내가 채우는 파일 ──
export const getFinalRates = () => readJson('final_rates.json', []);
export const saveFinalRates = (v) => writeJson('final_rates.json', v);
export const getServiceTerms = () => readJson('service_terms.json', []);
export const getCalendar = () => readJson('calendar.json', []);
export const getLottery = () => readJson('lottery.json', []);
export const getRules = () => readJson('rules.json', []);
export const getLinks = () => readJson('links.json', {});

// ── 구독 ──
export const getSubscriptions = () => readJson('subscriptions.json', []);
export const saveSubscriptions = (v) => writeJson('subscriptions.json', v);
export function expireSubscriptions(now = new Date()) {
  updateSubscriptions((subscriptions) => {
    for (let i = subscriptions.length - 1; i >= 0; i--) {
      if (!subscriptions[i].verifiedAt && Number(now) - Date.parse(subscriptions[i].createdAt) >= 7 * 86400000) subscriptions.splice(i, 1);
    }
  });
}

// ── 수집 로그 ──
export const appendCollectLog = (row) => appendJsonl('collect_log.jsonl', row);
export const getCollectLog = () => readJsonl('collect_log.jsonl');
export const getSentLog = () => readJsonl('sent_log.jsonl', { strict: true });
export const appendSentLog = (row) => appendJsonl('sent_log.jsonl', row);
export const pruneSentLog = (now = new Date()) => retainJsonl('sent_log.jsonl', (row) => !Number.isFinite(Date.parse(row.at)) || Number(now) - Date.parse(row.at) < 90 * 86400000);
export const getSsrErrors = () => readJsonl('ssr_errors.jsonl');
export function readSample(file) {
  if (file.endsWith('.jsonl')) return readJsonl(`sample/${file}`);
  const value = readJson(`sample/${file}`, []);
  return Array.isArray(value) ? value : value.items || [];
}

// ── 상태 요약 ──
export function collectStatus(now = Date.now()) {
  // 연속 실패는 가장 자주 도는 접수현황(status) 기준으로 센다.
  const log = getCollectLog().filter((r) => r.api === 'status');
  let consecutiveFailures = 0;
  for (let i = log.length - 1; i >= 0; i--) {
    if (log[i].ok) break;
    consecutiveFailures++;
  }
  const lastOk = [...log].reverse().find((r) => r.ok);
  const snaps = getSnapshots();
  const lastSnap = snaps.length ? snaps[snaps.length - 1] : null;
  const lastCollectedAt = lastOk?.at || (lastSnap?.source === 'api' ? lastSnap.collectedAt : null);
  const isSample = !lastSnap || lastSnap.source === 'sample';
  const stale = !lastCollectedAt || now - Date.parse(lastCollectedAt) > 6 * 3600000;
  return { lastCollectedAt, lastAttemptAt: log.at(-1)?.at || null, consecutiveFailures, isSample, stale };
}

export function operationStatus(now = Date.now()) {
  const logs = getCollectLog();
  const apis = Object.entries(APIS).map(([key, api]) => {
    const entries = logs.filter((row) => row.api === key).sort((a, b) => String(a.at).localeCompare(String(b.at)));
    const last = entries.at(-1);
    let consecutiveFailures = 0;
    for (let i = entries.length - 1; i >= 0 && !entries[i].ok; i--) consecutiveFailures++;
    return { key, name: api.name, lastAttemptAt: last?.at || null, ok: last?.ok ?? null,
      lastSuccessAt: entries.findLast((row) => row.ok)?.at || null,
      lastFailureAt: entries.findLast((row) => !row.ok)?.at || null,
      httpStatus: last?.httpStatus ?? null, consecutiveFailures };
  });
  return { ...collectStatus(now), apis,
    ssrErrors24h: getSsrErrors().filter((row) => { const at = Date.parse(row.at); return at <= now && at >= now - 86400000; }).length,
    checkedAt: new Date(now).toISOString(),
  };
}
