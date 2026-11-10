import { nextExamWindow } from '../shared/dates.js';
// API 핸들러와 SSR 로더가 함께 쓰는 조회 함수.
// 같은 함수를 쓰기 때문에 화면 본문 숫자와 /api 응답 숫자가 갈리지 않는다.
import * as repo from './repo/index.js';
import { runtime } from './repo/prepared.js';
import { SITE } from './config.js';
import { koreaDay, scheduleTime } from './time.js';

export const today = koreaDay;
export { scheduleTime };
export const norm = (it) => it?._norm || it || {};
const byMos = (items, mosCode) => items.filter((it) => (norm(it).mosCode ?? it.mosCode) === mosCode);

export function meta() {
  const { lastCollectedAt, isSample, consecutiveFailures, stale } = repo.collectStatus();
  return { source: isSample ? 'sample' : 'api', collectedAt: lastCollectedAt, consecutiveFailures, stale, publicConfig: publicConfig() };
}
export const publicConfig = () => ({ mailMode: 'disabled', subscriptionsEnabled: false, deploymentMode: 'serverless', contactEmail: SITE.contactEmail, privacyUpdatedAt: '2026-11-06' });

export function nowList({ branch, category, unit, sort = 'rate_asc' } = {}) {
  const now = Date.now();
  const all = repo.latestSnapshots();
  let rows = all.filter((s) => (!s.applyStart || scheduleTime(s.applyStart) <= now) && (!s.applyEnd || scheduleTime(s.applyEnd, true) >= now));
  if (branch) rows = rows.filter((s) => s.branch === branch);
  if (category) rows = rows.filter((s) => s.category === category);
  if (unit) rows = rows.filter((s) => s.unit === unit);
  const dir = sort === 'rate_desc' ? -1 : 1;
  rows.sort((a, b) => dir * ((a.rate ?? Infinity) - (b.rate ?? Infinity)));
  return { count: rows.length, items: rows, ...scheduleSummary(all, now) };
}

// 접수 중인 회차가 없는 군도 이유를 보여 줄 수 있게, 회차(군·회차·모집구분·접수기간) 단위로 묶어
// 군별 상태(접수 중 회차 수·지난 마감·다음 회차)와 곧 시작하는 접수 목록을 만든다. 접수기간이 없는 행은 뺀다.
const BRANCH_ORDER = ['육군', '해군', '공군', '해병대'];
function scheduleSummary(all, now) {
  const groups = new Map();
  for (const s of all) {
    const start = scheduleTime(s.applyStart), end = scheduleTime(s.applyEnd, true);
    if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
    const key = [s.branch, s.roundLabel, s.category, s.applyStart, s.applyEnd].join('|');
    let g = groups.get(key);
    if (!g) groups.set(key, (g = { branch: s.branch, roundLabel: s.roundLabel, category: s.category, applyStart: s.applyStart, applyEnd: s.applyEnd, start, end, mos: new Set(), quota: 0, months: new Set() }));
    if (s.mosCode) g.mos.add(s.mosCode);
    g.quota += Number(s.quota) || 0;
    if (s.enlistMonth && s.enlistMonth !== '*') g.months.add(s.enlistMonth);
  }
  const list = [...groups.values()];
  const plain = ({ start, end, mos, months, ...g }) => ({ ...g, specialties: mos.size, enlistMonths: [...months].sort() });
  const byStart = (a, b) => a.start - b.start || String(a.branch).localeCompare(String(b.branch), 'ko');
  const upcoming = list.filter((g) => g.start > now).sort(byStart).slice(0, 20).map(plain);
  const branchStatus = BRANCH_ORDER.map((branch) => {
    const mine = list.filter((g) => g.branch === branch);
    const open = mine.filter((g) => g.start <= now && g.end >= now);
    const next = mine.filter((g) => g.start > now).sort(byStart)[0];
    const last = mine.filter((g) => g.end < now).sort((a, b) => b.end - a.end)[0];
    return { branch, openRounds: open.length, openSpecialties: new Set(open.flatMap((g) => [...g.mos])).size,
      next: next ? plain(next) : null, lastEnd: last?.applyEnd || null, lastRound: last?.roundLabel || null };
  });
  return { upcoming, branchStatus };
}

// 맞춤형 특기병: 입영일(YYYYMMDD)을 YYYY-MM-DD로 바꾸고 오늘 이전 입영일에 past 표시를 붙인다.
const isoDay = (d) => (/^\d{8}$/.test(d) ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}` : d || null);
const jobfitRow = (r, day) => ({ branch: r.branch, mosCode: r.mosCode, mosName: r.mosName, unit: r.unit, roundLabel: [r.year, r.round].filter(Boolean).join('-'),
  enlistDate: isoDay(r.enlistDate), quota: r.quota, selected: r.selected, vacancy: r.vacancy, past: isoDay(r.enlistDate) < day });
export function jobfitList() {
  const ds = repo.getJobfit();
  const day = today();
  const items = ds.items.map((r) => jobfitRow(r, day))
    .sort((a, b) => String(a.enlistDate).localeCompare(String(b.enlistDate)) || String(a.branch).localeCompare(String(b.branch), 'ko') || String(a.mosName).localeCompare(String(b.mosName), 'ko'));
  return { jobfitSource: ds.source, fetchedAt: ds.fetchedAt, today: day, items };
}
let jobfitCodes = null;
export const isJobfitCode = (code) => {
  if (!jobfitCodes) jobfitCodes = new Set(repo.getPreparedJobfit().items.map((r) => r.mosCode));
  return jobfitCodes.has(code);
};

// 특기 전체 목록 (군사특기 정보 + 접수현황에 나온 특기를 합친다). 사이트맵과 /mos 목록이 쓴다.
export function mosIndex() {
  const map = new Map();
  const key = (b, c) => `${normBranch(b)}|${c}`;
  for (const it of repo.getDataset('mos').items) {
    const n = norm(it);
    if (!n.mosCode) continue;
    map.set(key(n.branch, n.mosCode), { mosCode: n.mosCode, mosName: n.mosName, branch: normBranch(n.branch), category: n.category });
  }
  for (const s of repo.latestSnapshots()) {
    if (!s.mosCode || map.has(key(s.branch, s.mosCode))) continue;
    map.set(key(s.branch, s.mosCode), { mosCode: s.mosCode, mosName: s.mosName, branch: normBranch(s.branch), category: s.category });
  }
  for (const r of [...repo.getJobfit().items, ...repo.getPreparedJobfit().items]) {
    if (!r.mosCode || map.has(key(r.branch, r.mosCode))) continue;
    map.set(key(r.branch, r.mosCode), { mosCode: r.mosCode, mosName: r.mosName, branch: normBranch(r.branch), category: '취업맞춤특기병' });
  }
  // 같은 코드가 여러 군에 있으면 표시해 둔다(화면·사이트맵이 군까지 넣은 주소를 쓰게)
  const count = {}; for (const m of map.values()) count[m.mosCode] = (count[m.mosCode] || 0) + 1;
  for (const m of map.values()) m.shared = count[m.mosCode] > 1;
  return [...map.values()].sort((a, b) =>
    String(a.branch).localeCompare(String(b.branch), 'ko') || String(a.mosName).localeCompare(String(b.mosName), 'ko'));
}

// 특기 코드는 군마다 따로 매겨져 같은 코드가 여러 군에 있다(예: 46 = 해군 건축·토목 / 공군 비파괴검사병).
// 그래서 특기는 「군 + 코드」로 찾는다. 자격 자료는 해병대를 「해병」으로 적어 표기를 맞춘다.
export const normBranch = (b) => (b === '해병' ? '해병대' : b || null);
const ELIG_LIMIT = 150; // 화면은 80개만 보여 주므로 여유 있게. 4.5MB(Vercel 응답 한도)를 넘던 특기(901 등)가 있었다.
const KIND_ORDER = { 자격: 0, 면허: 1, 전공: 2 };
export function branchesOfCode(code) {
  const set = new Set();
  for (const it of repo.getDataset('mos').items) if (norm(it).mosCode === code) set.add(normBranch(norm(it).branch));
  for (const r of repo.latestSnapshots()) if (r.mosCode === code) set.add(normBranch(r.branch));
  for (const r of [...repo.getJobfit().items, ...repo.getPreparedJobfit().items]) if (r.mosCode === code) set.add(normBranch(r.branch));
  // 여러 군 여부는 실제 특기 자료로만 판단한다. 자격 자료에만 다른 군의 같은 코드가 있는 경우가 있어(36·43 등), 그걸로 판단하면 목록과 상세가 어긋난다.
  set.delete(null);
  const list = [...set].sort((a, b) => a.localeCompare(b, 'ko'));
  return list;
}
// 한 군의 인정 자격 전체(중복 항목 제거). 상세는 일부만, 대조(match)는 전체를 쓴다.
function eligibilityOf(code, branch) {
  const seen = new Map();
  for (const e of repo.getEligibleByMos().get(code) || []) { const x = e._norm; if (normBranch(x.branch) !== branch || !x.item || seen.has(x.item)) continue; seen.set(x.item, e); }
  return [...seen.values()].sort((a, b) => (KIND_ORDER[a._norm.kind] ?? 9) - (KIND_ORDER[b._norm.kind] ?? 9) || String(a._norm.item).localeCompare(String(b._norm.item), 'ko'));
}
export function mosMatch(code, branch, items) {
  const want = new Set(items);
  const b = normBranch(branch) || branchesOfCode(code)[0];
  return { mosCode: code, branch: b, items: eligibilityOf(code, b).filter((e) => want.has(e._norm.item)) };
}
// 회차별 마감 지원률. final_rates.json에는 군이 없어서, 여러 군이 쓰는 코드는 군 정보가 있는 접수 기록으로 다시 계산한다.
function finalRatesOf(code, branch, shared) {
  if (!shared) return repo.getFinalRates().filter((f) => f.mosCode === code);
  const by = new Map();
  for (const r of repo.latestSnapshots()) {
    const end = scheduleTime(r.applyEnd, true);
    if (!Number.isFinite(end) || end > Date.now() || !(Date.parse(r.collectedAt) >= end)) continue;
    if (r.mosCode !== code || normBranch(r.branch) !== branch || !r.roundLabel) continue;
    const g = by.get(r.roundLabel) || { quota: 0, applicants: 0 };
    g.quota += Number(r.quota) || 0; g.applicants += Number(r.applicants) || 0; by.set(r.roundLabel, g);
  }
  return [...by.entries()].filter(([, g]) => g.quota > 0).map(([roundLabel, g]) => ({ roundLabel, mosCode: code, rate: Math.round((g.applicants / g.quota) * 100) / 100, source: 'snapshots' }));
}
export function mosDetail(mosCode, branchParam = null) {
  const branches = branchesOfCode(mosCode);
  if (!branches.length) return null;
  const want = normBranch(branchParam);
  if (want && !branches.includes(want)) return null;
  // 군을 안 정했는데 여러 군이 쓰는 코드면 고르게 한다(섞어 보여 주지 않는다)
  if (!want && branches.length > 1) {
    const choices = branches.map((b) => { const m = repo.getDataset('mos').items.map(norm).find((x) => x.mosCode === mosCode && normBranch(x.branch) === b); const sn = repo.latestSnapshots().find((r) => r.mosCode === mosCode && normBranch(r.branch) === b); const el = (repo.getEligibleByMos().get(mosCode) || []).find((e) => normBranch(e._norm.branch) === b); return { branch: b, mosName: m?.mosName || sn?.mosName || el?._norm.mosName || mosCode, category: m?.category || sn?.category || null }; });
    return { ambiguous: true, mosCode, branches, choices };
  }
  const branch = want || branches[0];
  const shared = branches.length > 1;
  const mos = repo.getDataset('mos').items.find((it) => norm(it).mosCode === mosCode && normBranch(norm(it).branch) === branch) || null;
  const snapshots = repo.latestSnapshots().filter((s) => s.mosCode === mosCode && normBranch(s.branch) === branch);
  const day = today();
  // 실시간 자료에서 빠진 특기(입영일이 모두 지난 경우 등)는 저장된 기준자료로 보여 주고 출처도 그렇게 표시한다.
  let jf = repo.getJobfit();
  const mine = (r) => r.mosCode === mosCode && normBranch(r.branch) === branch;
  if (jf.source === 'api' && !jf.items.some(mine)) jf = repo.getPreparedJobfit();
  const jobfit = jf.items.filter(mine).map((r) => jobfitRow(r, day)).sort((a, b) => String(a.enlistDate).localeCompare(String(b.enlistDate)));
  const elig = eligibilityOf(mosCode, branch);
  if (!mos && !snapshots.length && !jobfit.length && !elig.length) return null;
  const n = norm(mos);
  const snap = [...snapshots].sort((a, b) => String(b.collectedAt).localeCompare(String(a.collectedAt)))[0] || null;
  const term = repo.getServiceTerms().find((t) => t.branch === branch && /현역|병/.test(t.type || '')) || null;
  const kinds = {}; for (const e of elig) kinds[e._norm.kind || '기타'] = (kinds[e._norm.kind || '기타'] || 0) + 1;
  const otherNames = elig[0]?._norm.mosName;
  return {
    mosCode,
    mosName: n.mosName || snap?.mosName || jobfit[0]?.mosName || otherNames || mosCode,
    branch,
    branches,
    category: n.category || snap?.category || (jobfit.length ? '취업맞춤특기병' : null),
    jobfit,
    jobfitFetchedAt: jobfit.length ? jf.fetchedAt : null,
    jobfitSource: jobfit.length ? jf.source : null,
    mos,
    eligibility: elig.slice(0, ELIG_LIMIT),
    eligibilityTotal: elig.length,
    eligibilityKinds: kinds,
    documents: repo.getDataset('docs').items.filter((it) => norm(it).mosCode === mosCode && normBranch(norm(it).branch) === branch),
    finalRates: finalRatesOf(mosCode, branch, shared),
    snapshots,
    snapshot: snap,
    forecast: snap ? forecastFor(snap) : null,
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

// ── 마감 지원률 예측 ──
// forecast.json(빌드 때 history에서 계산)의 「마감 N시간 전 → 마감」 비율을 현재 지원률에 곱한다.
// 표본이 적으면 예측을 내지 않고 상태만 알려 준다. 과신을 막으려고 25~75% 범위를 함께 준다.
export function forecastFor(row, now = Date.now()) {
  const f = repo.getForecast();
  if (!f) return { status: 'none' };
  const end = scheduleTime(row.applyEnd, true);
  if (!Number.isFinite(end) || end < now) return { status: 'closed' };
  const hours = (end - now) / 3600000;
  const bucket = f.buckets.find((b) => { const [hi, lo] = b.split('-').map(Number); return hours <= hi && hours > lo; });
  if (!bucket) return { status: 'too-early', hours: Math.round(hours) };
  const pick = (table) => table && table[bucket];
  const stat = pick(f.byCategory?.[`${row.branch}|${row.category}`]) || pick(f.byBranch?.[row.branch]) || pick(f.overall);
  const basis = pick(f.byCategory?.[`${row.branch}|${row.category}`]) ? 'category' : pick(f.byBranch?.[row.branch]) ? 'branch' : pick(f.overall) ? 'overall' : null;
  if (!stat || row.rate == null) return { status: 'collecting', hours: Math.round(hours), samples: f.samples, closedRounds: f.closedRounds };
  const r2 = (v) => Math.round(v * 100) / 100;
  return { status: 'ok', hours: Math.round(hours), bucket, basis, n: stat.n, expected: r2(row.rate * stat.median), low: r2(row.rate * stat.p25), high: r2(row.rate * stat.p75), builtAt: f.builtAt };
}
export function forecastSummary() {
  const f = repo.getForecast();
  return f ? { builtAt: f.builtAt, since: f.since, rows: f.rows, closedRounds: f.closedRounds, samples: f.samples, ready: Object.keys(f.overall || {}).length > 0 } : { ready: false, rows: 0, closedRounds: 0, samples: 0 };
}

// ── 자격 시험 일정 ──
// 접수 마감일 전에 최종 합격 발표가 나는 정기 시험 중, 아직 필기 원서접수가 남은 것을 고른다.
export function examsBefore(deadline, day = today()) {
  const live = runtime.exams;
  const sched = live ? { year: live.year, rounds: live.rounds, source: `한국산업인력공단 국가기술자격 시험정보 API · ${live.fetchedAt.slice(0, 10)} 조회`, sourceUrl: 'https://www.data.go.kr/data/15003029/openapi.do', live: true } : repo.getExamSchedule();
  if (!sched) return { year: null, rounds: [], source: null };
  const rounds = (sched.rounds || []).map((r) => ({ ...r, canApply: Boolean(nextExamWindow(r, day)), inTime: !deadline || Boolean(r.finalResult && r.finalResult <= String(deadline).slice(0, 10)) }));
  return { year: sched.year, source: sched.source, sourceUrl: sched.sourceUrl, note: sched.note, live: Boolean(sched.live), rounds };
}
