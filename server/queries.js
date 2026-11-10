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
  for (const it of repo.getDataset('mos').items) {
    const n = norm(it);
    if (!n.mosCode) continue;
    map.set(n.mosCode, { mosCode: n.mosCode, mosName: n.mosName, branch: n.branch, category: n.category });
  }
  for (const s of repo.latestSnapshots()) {
    if (!s.mosCode || map.has(s.mosCode)) continue;
    map.set(s.mosCode, { mosCode: s.mosCode, mosName: s.mosName, branch: s.branch, category: s.category });
  }
  for (const r of [...repo.getJobfit().items, ...repo.getPreparedJobfit().items]) {
    if (!r.mosCode || map.has(r.mosCode)) continue;
    map.set(r.mosCode, { mosCode: r.mosCode, mosName: r.mosName, branch: r.branch, category: '취업맞춤특기병' });
  }
  return [...map.values()].sort((a, b) =>
    String(a.branch).localeCompare(String(b.branch), 'ko') || String(a.mosName).localeCompare(String(b.mosName), 'ko'));
}

export function mosDetail(mosCode) {
  const mos = byMos(repo.getDataset('mos').items, mosCode)[0] || null;
  const snapshots = repo.latestSnapshots().filter((s) => s.mosCode === mosCode);
  const day = today();
  // 실시간 자료에서 빠진 특기(입영일이 모두 지난 경우 등)는 저장된 기준자료로 보여 주고 출처도 그렇게 표시한다.
  let jf = repo.getJobfit();
  if (jf.source === 'api' && !jf.items.some((r) => r.mosCode === mosCode)) jf = repo.getPreparedJobfit();
  const jobfit = jf.items.filter((r) => r.mosCode === mosCode).map((r) => jobfitRow(r, day))
    .sort((a, b) => String(a.enlistDate).localeCompare(String(b.enlistDate)));
  if (!mos && !snapshots.length && !jobfit.length) return null;
  const n = norm(mos);
  const snap = [...snapshots].sort((a, b) => String(b.collectedAt).localeCompare(String(a.collectedAt)))[0] || null;
  const branch = n.branch || snap?.branch || jobfit[0]?.branch || null;
  const term = repo.getServiceTerms().find((t) => t.branch === branch && /현역|병/.test(t.type || '')) || null;
  return {
    mosCode,
    mosName: n.mosName || snap?.mosName || jobfit[0]?.mosName || mosCode,
    branch,
    category: n.category || snap?.category || (jobfit.length ? '취업맞춤특기병' : null),
    jobfit,
    jobfitFetchedAt: jobfit.length ? jf.fetchedAt : null,
    jobfitSource: jobfit.length ? jf.source : null,
    mos,
    eligibility: repo.getEligibleByMos().get(mosCode) || [],
    documents: byMos(repo.getDataset('docs').items, mosCode),
    finalRates: repo.getFinalRates().filter((f) => f.mosCode === mosCode),
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
  const start = (v) => String(v || '').split('~')[0];
  const rounds = (sched.rounds || []).map((r) => ({ ...r, canApply: start(r.writtenApply) >= day, inTime: !deadline || r.finalResult <= String(deadline).slice(0, 10) }));
  return { year: sched.year, source: sched.source, sourceUrl: sched.sourceUrl, note: sched.note, live: Boolean(sched.live), rounds };
}
