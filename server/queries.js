// API 핸들러와 SSR 로더가 함께 쓰는 조회 함수.
// 같은 함수를 쓰기 때문에 화면 본문 숫자와 /api 응답 숫자가 갈리지 않는다.
import * as repo from './repo/index.js';
import { SITE } from './config.js';
import { koreaDay, scheduleTime } from './time.js';

export const today = koreaDay;
export const norm = (it) => it?._norm || it || {};
const byMos = (items, mosCode) => items.filter((it) => (norm(it).mosCode ?? it.mosCode) === mosCode);

export function meta() {
  const { lastCollectedAt, isSample, consecutiveFailures, stale } = repo.collectStatus();
  return { source: isSample ? 'sample' : 'api', collectedAt: lastCollectedAt, consecutiveFailures, stale, publicConfig: publicConfig() };
}
export const publicConfig = () => ({ mailMode: 'disabled', subscriptionsEnabled: false, deploymentMode: 'serverless', contactEmail: SITE.contactEmail, privacyUpdatedAt: '2026-11-06' });

export function nowList({ branch, category, unit, sort = 'rate_asc' } = {}) {
  const now = Date.now();
  let rows = repo.latestSnapshots().filter((s) => (!s.applyStart || scheduleTime(s.applyStart) <= now) && (!s.applyEnd || scheduleTime(s.applyEnd, true) >= now));
  if (branch) rows = rows.filter((s) => s.branch === branch);
  if (category) rows = rows.filter((s) => s.category === category);
  if (unit) rows = rows.filter((s) => s.unit === unit);
  const dir = sort === 'rate_desc' ? -1 : 1;
  rows.sort((a, b) => dir * ((a.rate ?? Infinity) - (b.rate ?? Infinity)));
  return { count: rows.length, items: rows };
}

// 특기 전체 목록 (군사특기 정보 + 접수현황에 나온 특기를 합친다). 사이트맵과 /mos 목록이 쓴다.
export function mosIndex() {
  const map = new Map();
  for (const it of repo.getDataset('mos').items) {
    const n = norm(it);
    if (!n.mosCode) continue;
    map.set(n.mosCode, { mosCode: n.mosCode, mosName: n.mosName, branch: n.branch, category: n.category });
  }
  for (const s of repo.latestSnapshots()) {
    if (!s.mosCode || map.has(s.mosCode)) continue;
    map.set(s.mosCode, { mosCode: s.mosCode, mosName: s.mosName, branch: s.branch, category: s.category });
  }
  return [...map.values()].sort((a, b) =>
    String(a.branch).localeCompare(String(b.branch), 'ko') || String(a.mosName).localeCompare(String(b.mosName), 'ko'));
}

export function mosDetail(mosCode) {
  const mos = byMos(repo.getDataset('mos').items, mosCode)[0] || null;
  const snapshots = repo.latestSnapshots().filter((s) => s.mosCode === mosCode);
  if (!mos && !snapshots.length) return null;
  const n = norm(mos);
  const snap = [...snapshots].sort((a, b) => String(b.collectedAt).localeCompare(String(a.collectedAt)))[0] || null;
  const branch = n.branch || snap?.branch || null;
  const term = repo.getServiceTerms().find((t) => t.branch === branch && /현역|병/.test(t.type || '')) || null;
  return {
    mosCode,
    mosName: n.mosName || snap?.mosName || mosCode,
    branch,
    category: n.category || snap?.category || null,
    mos,
    eligibility: byMos(repo.getDataset('eligible').items, mosCode),
    documents: byMos(repo.getDataset('docs').items, mosCode),
    finalRates: repo.getFinalRates().filter((f) => f.mosCode === mosCode),
    snapshots,
    snapshot: snap,
    serviceTerm: term,
    links: repo.getLinks()[mosCode] || [],
    firstCollectedAt: repo.getSnapshots()[0]?.collectedAt || null,
  };
}

export function calendarList({ from = today(), to = '9999-12-31' } = {}) {
  const rounds = new Map();
  for (const s of repo.latestSnapshots()) {
    if (!s.applyStart) continue;
    const id = `round:${s.branch}:${s.roundLabel}:${s.category}`;
    if (!rounds.has(id)) {
      rounds.set(id, {
        id, kind: '모집병', title: `${s.branch} ${s.category || ''} ${s.roundLabel || ''} 접수`.replace(/\s+/g, ' ').trim(),
        start: s.applyStart, end: s.applyEnd, target: `${s.enlistMonth || ''} 입영`, sourceUrl: 'https://www.mma.go.kr', verified: s.source === 'api',
      });
    }
  }
  const items = [...repo.getCalendar(), ...rounds.values()]
    .filter((e) => (e.end || e.start || '') >= from && (e.start || '') <= to)
    .sort((a, b) => String(a.start).localeCompare(String(b.start)));
  return { items };
}

export function stats() {
  const snaps = repo.getSnapshots();
  return {
    specialtiesTracked: new Set(snaps.map((s) => `${s.branch}|${s.mosCode}`)).size,
    snapshotsCount: snaps.length,
    subscribersCount: 0,
    firstCollectedAt: snaps[0]?.collectedAt || null,
    rulesFetchedAt: repo.getDataset('score').fetchedAt,
  };
}

export const rules = () => ({ items: repo.getRules(), lottery: repo.getLottery() });
