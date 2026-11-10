// Express API. 화면은 병무청 API를 직접 부르지 않고 여기 /api/* 만 읽는다.
import express from 'express';

import * as repo from './repo/index.js';
import * as q from './queries.js';
import { TRUST_PROXY, SERVERLESS } from './config.js';
import { refreshJobfit, refreshStatus } from './live.js';
import { refreshExams } from './exam-api.js';
import { waitUntil } from '@vercel/functions';
import { runtime } from './repo/prepared.js';
import { requestLimit } from './rate-limit.js';


export const app = express();
app.disable('x-powered-by');
app.set('trust proxy', TRUST_PROXY);
app.use('/api', (req, res, next) => { res.set({ 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff' }); next(); });
app.use('/api', requestLimit());
app.use(express.json({ limit: '50kb' }));
app.use('/api', async (req, res, next) => {
  if (!SERVERLESS) return next();
  if (['/subscribe', '/verify', '/unsubscribe'].includes(req.path)) return res.status(503).json({ error: '이메일 알림은 제공하지 않습니다. 모집 일정 화면을 확인해 주세요.' });
  // 이미 받아 둔 실시간 자료가 있으면 기다리지 않고 바로 응답하고 갱신은 뒤에서 한다.
  // 서버가 막 켜져 실시간 자료가 없을 때만 첫 조회를 기다린다(그래야 첫 화면부터 최신 값).
  // 갱신은 waitUntil로 응답 뒤에도 끝까지 살려 둔다(Vercel은 응답 직후 함수를 멈추므로, 이게 없으면 조회가 영영 끝나지 않는다).
  // 실시간 값이 아직 없으면 최대 3초만 기다리고, 그래도 안 끝나면 저장된 기록으로 먼저 답한다(화면은 「갱신 중」 표시).
  const waits = [];
  const refresh = (fn, have) => {
    const task = Promise.resolve(fn()).catch(() => {});
    waitUntil(task);
    if (!have) waits.push(task);
  };
  if (['/now', '/stats', '/calendar', '/rounds', '/plan', '/plan-overview', '/health', '/mos', '/mos/search', '/forecast', '/ping'].includes(req.path) || req.path.startsWith('/mos/')) refresh(refreshStatus, Boolean(runtime.snapshots));
  // 맞춤형 특기병 정보는 그 화면과 해당 특기 상세에서만 새로 받는다(다른 화면은 기다리지 않게).
  let code = '';
  try { code = req.path.startsWith('/mos/') && req.path !== '/mos/search' ? decodeURIComponent(req.path.slice(5)) : ''; } catch { code = ''; }
  if (req.path === '/jobfit' || (code && q.isJobfitCode(code))) refresh(refreshJobfit, Boolean(runtime.jobfit));
  if (req.path === '/exam-schedule') refresh(refreshExams, Boolean(runtime.exams));
  if (waits.length) await Promise.race([Promise.all(waits), new Promise((r) => setTimeout(r, 3000))]);
  next();
});
const startedAt = Date.now();

// 모든 응답에 { source, collectedAt }를 넣는다.
function send(res, data) {
  res.json({ ...q.meta(), ...data });
}

const { today, norm } = q;
const list = (v) => (v ? String(v).split(',').map((s) => s.trim()).filter(Boolean) : []);
const selectedItems = (query) => query.item === undefined ? list(query.items)
  : [...new Set([].concat(query.item).filter((item) => typeof item === 'string').map((item) => item.trim()).filter(Boolean))];

// ── 과제 필수 6개 ─────────────────────────────

app.get('/api/now', (req, res) => send(res, q.nowList(req.query)));

app.get('/api/rounds', (req, res) => {
  const map = new Map();
  for (const s of repo.latestSnapshots()) {
    const k = `${s.branch}|${s.roundLabel}|${s.enlistMonth}`;
    if (!map.has(k)) map.set(k, { branch: s.branch, roundLabel: s.roundLabel, enlistMonth: s.enlistMonth, applyStart: s.applyStart, applyEnd: s.applyEnd });
  }
  const items = [...map.values()].sort((a, b) => String(a.enlistMonth).localeCompare(String(b.enlistMonth)));
  send(res, { items });
});

// 입영월별 접수 상태(칩 표시용)와 입영 기준 접수 시기 통계. 플래너가 「왜 다 마감인지, 언제 열리는지」를 말할 수 있게 한다.
function planOverview(snaps, now = Date.now()) {
  const statusOf = (s) => { const a = q.scheduleTime(s.applyStart), b = q.scheduleTime(s.applyEnd, true); if (!Number.isFinite(b)) return 'unknown'; if (b < now) return 'closed'; if (Number.isFinite(a) && a > now) return 'upcoming'; return 'open'; };
  const months = {};
  const leads = [];
  for (const s of snaps) {
    if (!s.enlistMonth || s.enlistMonth === '*') continue;
    const m = (months[s.enlistMonth] ??= { open: 0, upcoming: 0, closed: 0, applyMonths: new Set() });
    m[statusOf(s)] = (m[statusOf(s)] || 0) + 1;
    if (s.applyStart) { m.applyMonths.add(String(s.applyStart).slice(0, 7)); const [ey, em] = s.enlistMonth.split('-').map(Number); const [ay, am] = String(s.applyStart).slice(0, 7).split('-').map(Number); if (ey && ay) leads.push(ey * 12 + em - (ay * 12 + am)); }
  }
  leads.sort((a, b) => a - b);
  const pct = (p) => leads.length ? leads[Math.min(leads.length - 1, Math.floor(p * (leads.length - 1)))] : null;
  const unscheduled = [...new Map(snaps.filter((s) => (!s.enlistMonth || s.enlistMonth === '*') && statusOf(s) !== 'closed').map((s) => [`${s.branch}|${s.roundLabel}|${s.category}`, { branch: s.branch, round: s.roundLabel, category: s.category, status: statusOf(s), applyStart: s.applyStart, applyEnd: s.applyEnd }])).values()];
  return { months: Object.fromEntries(Object.entries(months).map(([k, v]) => [k, { open: v.open, upcoming: v.upcoming, closed: v.closed, applyMonths: [...v.applyMonths].sort() }])),
    lead: leads.length ? { p25: pct(0.25), median: pct(0.5), p75: pct(0.75), n: leads.length } : null, unscheduled };
}
app.get('/api/plan-overview', (req, res) => send(res, planOverview(repo.latestSnapshots())));

app.get('/api/plan', (req, res) => {
  const months = list(req.query.months).slice(0, 3);
  const snaps = repo.latestSnapshots();
  const overview = planOverview(snaps);
  const NEED = '병무청 공지 확인 필요';
  const items = months.map((month) => {
    const rows = snaps.filter((s) => s.enlistMonth === month);
    const rounds = [...new Map(rows.map((s) => [`${s.branch}|${s.roundLabel}|${s.category}|${s.applyStart}|${s.applyEnd}`, s])).values()];
    // 접수 상태: open(접수 중) → upcoming(예정) → closed(마감) 순으로 보여 준다. 마감은 지원할 수 없으니 뒤로.
    const now = Date.now();
    const statusOf = (s) => { const a = q.scheduleTime(s.applyStart), b = q.scheduleTime(s.applyEnd, true); if (!Number.isFinite(b)) return 'unknown'; if (b < now) return 'closed'; if (Number.isFinite(a) && a > now) return 'upcoming'; return 'open'; };
    const order = { open: 0, upcoming: 1, unknown: 2, closed: 3 };
    rounds.sort((x, y) => order[statusOf(x)] - order[statusOf(y)] || String(x.applyStart).localeCompare(String(y.applyStart)));
    return {
      month,
      rounds: rounds.map((s) => ({
        branch: s.branch,
        round: s.roundLabel,
        category: s.category,
        status: statusOf(s),
        schedule: {
          applyStart: s.applyStart || NEED,
          applyEnd: s.applyEnd || NEED,
          firstResult: NEED,
          finalResult: NEED,
          enlist: s.enlistMonth || NEED,
        },
      })),
      specialties: rows.map((s) => ({ branch: s.branch, mosCode: s.mosCode, mosName: s.mosName, rate: s.rate, status: statusOf(s) })),
      applyMonths: overview.months[month]?.applyMonths || [],
    };
  });
  send(res, { items, lead: overview.lead, unscheduled: overview.unscheduled });
});

// /api/mos/search 는 /api/mos/:mosCode 보다 먼저 등록해야 한다.
app.get('/api/mos/search', (req, res) => {
  // ★ 차별점. 입력은 절대 저장하지 않고 로그에도 남기지 않는다.
  const height = Number(req.query.height) || null;
  const weight = Number(req.query.weight) || null;
  const vision = Number(req.query.vision) || null;
  const grade = Number(req.query.grade) || null;
  const items = new Set(selectedItems(req.query));
  const branch = req.query.branch || null;

  const mos = repo.getDataset('mos').items;
  const eligByMos = repo.getEligibleByMos();
  const latest = repo.latestSnapshots();

  const results = mos
    .map((it) => {
      const n = norm(it);
      if (branch && n.branch !== branch) return null;
      const reasons = [];
      const unknown = [];
      if (height) { if (n.heightMin == null) unknown.push('신장'); else if (height < n.heightMin) reasons.push(`신장 기준 미달(${n.heightMin}cm 이상)`); }
      if (weight) { if (n.weightMin == null) unknown.push('체중'); else if (weight < n.weightMin) reasons.push(`체중 기준 미달(${n.weightMin}kg 이상)`); }
      if (vision) { if (n.visionMin == null) unknown.push('시력'); else if (vision < n.visionMin) reasons.push(`시력 기준 미달(교정 ${n.visionMin} 이상)`); }
      if (grade) { if (n.gradeMax == null) unknown.push('신체등급'); else if (grade > n.gradeMax) reasons.push(`신체등급 기준 미달(${n.gradeMax}급 이내)`); }

      const need = (eligByMos.get(n.mosCode) || []).filter((e) => q.normBranch(norm(e).branch) === q.normBranch(n.branch)).map((e) => norm(e).item).filter(Boolean);
      const anyItemOk = !need.length || need.some((x) => items.has(x));
      const missing = !anyItemOk ? need.slice(0, 3) : [];
      const snap = latest.find((s) => s.mosCode === n.mosCode && q.normBranch(s.branch) === q.normBranch(n.branch));

      let group = 'ok';
      if (reasons.length) group = 'physical';
      else if (!anyItemOk) group = 'item';
      return {
        mosCode: n.mosCode, mosName: n.mosName, branch: n.branch, category: n.category,
        interview: n.interview, yearRound: n.yearRound, rate: snap?.rate ?? null,
        group, reasons, missingItems: missing, unknownCriteria: unknown,
      };
    })
    .filter(Boolean);

  const groups = {
    ok: results.filter((r) => r.group === 'ok'),
    item: results.filter((r) => r.group === 'item'),
    physical: results.filter((r) => r.group === 'physical'),
  };
  const reasonCount = {};
  for (const r of groups.physical) for (const x of r.reasons) reasonCount[x] = (reasonCount[x] || 0) + 1;
  send(res, { total: results.length, groups, topReasons: Object.entries(reasonCount).sort((a, b) => b[1] - a[1]) });
});

app.get('/api/mos', (req, res) => send(res, { items: q.mosIndex() }));

// 보유 자격과 이 특기(군 기준)의 인정 자격 대조. 상세는 일부만 보내므로 계산기는 이걸로 전체를 대조한다.
app.get('/api/mos/:mosCode/match', (req, res) => send(res, q.mosMatch(req.params.mosCode, req.query.branch || null, selectedItems(req.query))));

app.get('/api/mos/:mosCode', (req, res) => {
  const d = q.mosDetail(req.params.mosCode, req.query.branch || null);
  if (!d) return res.status(404).json({ error: '특기를 찾을 수 없어요', mosCode: req.params.mosCode });
  send(res, d);
});

app.get('/api/score-rules', (req, res) => {
  const { branch, mosCode, category } = req.query;
  const special = category === '전문특기병';
  const ds = repo.getDataset(special ? 'scoreSp' : 'score');
  let items = ds.items;
  if (branch) items = items.filter((it) => norm(it).branch === branch);
  if (mosCode) items = items.filter((it) => norm(it).mosCode === mosCode);
  // 지난 회차 기록도 함께 오므로 가장 최근 연도·회차만 남긴다.
  const rk = (it) => `${norm(it).year}-${String(norm(it).round).padStart(4, '0')}`;
  const latest = items.reduce((mx, it) => (rk(it) > mx ? rk(it) : mx), '');
  if (latest) items = items.filter((it) => rk(it) === latest);

  const first = norm(items[0]);
  const appliedRound = first.year || first.round ? [first.year, first.round].filter(Boolean).join('-') : null;
  const base = { appliedRound, fetchedAt: ds.fetchedAt };

  // lottery.json의 '일반병'은 공군 '일반기술병', 해군 '일반/전문기술병'처럼 이름이 달라 '일반'이 들어간 모집구분에 맞춘다.
  const lot = repo.getLottery().find((l) => l.branch === branch && (l.category === category || (l.category === '일반병' && /일반/.test(category || ''))));
  if (lot && lot.effectiveFrom <= today()) return send(res, { ...base, lottery: true, note: lot.note });
  if (lot) return send(res, { ...base, lottery: false, lotteryFrom: lot.effectiveFrom, note: lot.note, items });
  send(res, { ...base, lottery: false, items });
});

app.get('/api/stats', (req, res) => send(res, q.stats()));

// ── 상용 핵심 ─────────────────────────────

app.get('/api/eligible', (req, res) => {
  // 입력은 저장하지 않는다.
  const want = new Set(selectedItems(req.query));
  const map = new Map();
  const catOf = new Map(repo.getDataset('mos').items.map((it) => [`${q.normBranch(norm(it).branch)}|${norm(it).mosCode}`, norm(it).category]));
  for (const e of repo.getDataset('eligible').items) {
    const n = norm(e);
    if (!want.has(n.item)) continue;
    const k = `${n.branch}|${n.mosCode}`;
    if (!map.has(k)) map.set(k, { branch: n.branch, mosCode: n.mosCode, mosName: n.mosName, category: catOf.get(`${q.normBranch(n.branch)}|${n.mosCode}`) || null, matched: [] });
    map.get(k).matched.push({ item: n.item, kind: n.kind, level: n.level, relation: n.relation });
  }
  send(res, { items: [...map.values()] });
});

// 자격·면허·전공 목록. 가나다순이면 「무술단증」이 맨 위라 쓸모가 없어, 지원 가능한 특기 수가 많은 순으로 준다(같으면 가나다).
const eligibleItemsCache = new WeakMap();
app.get('/api/eligible-items', (req, res) => {
  // 빌드 때 만든 eligible_items.json이 있으면 그것을 쓰고(즉시), 없을 때만 큰 자료에서 센다.
  const pre = repo.getEligibleItemsFile();
  const ds = pre ? pre : repo.getDataset('eligible');
  let items = pre ? pre.items : eligibleItemsCache.get(ds);
  if (!items) {
    const count = new Map();
    const kindOf = new Map();
    for (const e of ds.items) { const n = norm(e); if (!n.item) continue; let set = count.get(n.item); if (!set) { count.set(n.item, (set = new Set())); kindOf.set(n.item, n.kind || '기타'); } set.add(n.mosCode); }
    // 자격증·면허를 찾는 사람이 많으니 자격 → 면허 → 전공 순으로, 같은 종류 안에서는 특기 수가 많은 순.
    const kindOrder = { 자격: 0, 면허: 1, 전공: 2 };
    items = [...count.entries()].sort((a, b) => (kindOrder[kindOf.get(a[0])] ?? 9) - (kindOrder[kindOf.get(b[0])] ?? 9) || b[1].size - a[1].size || a[0].localeCompare(b[0], 'ko')).map(([item]) => ({ item, kind: kindOf.get(item), specialties: count.get(item).size }));
    eligibleItemsCache.set(ds, items);
  }
  const q = String(req.query.q || '').trim();
  const kind = String(req.query.kind || '').trim();
  let list = kind ? items.filter((x) => x.kind === kind) : items;
  const total = list.length;
  if (q) list = list.filter((x) => x.item.includes(q)).slice(0, 200);
  else if (!kind) { const per = {}; list = list.filter((x) => (per[x.kind] = (per[x.kind] || 0) + 1) <= 80); }
  else list = list.slice(0, 200);
  send(res, { items: list.map((x) => x.item), meta: list, total, kinds: [...new Set(items.map((x) => x.kind))], order: 'kind,specialties', partial: list.length < total });
});

app.get('/api/calendar', (req, res) => send(res, q.calendarList({ from: req.query.from || undefined, to: req.query.to || undefined })));

// 사회복무요원 복무기관 검색 (API에 필터 변수가 없어 서버에서 거른다)
app.get('/api/social-orgs', (req, res) => {
  // 원본 region 값이 비어 있어 관할 지방병무청(office)을 지역으로 쓴다. 저장 데이터는 바꾸지 않는다.
  const items = repo.getDataset('social').items.map(norm).map((o) => (o.region ? o : { ...o, region: o.office || null }));
  const region = req.query.region || '';
  const type = req.query.type || '';
  const qq = String(req.query.q || '').trim();
  const regions = [...new Set(items.map((o) => String(o.region || '').split(' ')[0]).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ko'));
  const types = [...new Set(items.map((o) => o.orgType).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ko'));
  let rows = items;
  if (region) rows = rows.filter((o) => String(o.region || '').split(' ')[0] === region);
  if (type) rows = rows.filter((o) => o.orgType === type);
  if (qq) rows = rows.filter((o) => `${o.orgName} ${o.parentOrg} ${o.address}`.includes(qq));
  send(res, { total: rows.length, items: rows.slice(0, 100), regions, types });
});

app.get('/api/jobfit', (req, res) => send(res, q.jobfitList()));

// 마감 예측: 접수 중인 행마다 예상 마감 지원률. 표본이 없으면 status로 알린다.
app.get('/api/forecast', (req, res) => {
  const now = Date.now();
  const items = q.nowList({}).items.map((r) => ({ branch: r.branch, mosCode: r.mosCode, roundLabel: r.roundLabel, unit: r.unit, enlistMonth: r.enlistMonth, rate: r.rate, forecast: q.forecastFor(r, now) }));
  send(res, { summary: q.forecastSummary(), items });
});
app.get('/api/exam-schedule', (req, res) => send(res, q.examsBefore(req.query.deadline || null)));
// 외부 감시용. 접수현황 수집이 연속 3회 이상 실패했거나 6시간 넘게 성공이 없으면 503을 돌려준다(UptimeRobot 등이 알림).
app.get('/api/ping', (req, res) => {
  const st = repo.collectStatus();
  const bad = st.consecutiveFailures >= 3 || st.stale;
  res.status(bad ? 503 : 200).json({ ok: !bad, consecutiveFailures: st.consecutiveFailures, lastCollectedAt: st.lastCollectedAt, liveAvailable: st.liveAvailable });
});

app.get('/api/service-terms', (req, res) => send(res, { items: repo.getServiceTerms() }));

app.get('/api/rules', (req, res) => send(res, q.rules()));

app.get('/api/health', (req, res) => {
  const st = repo.operationStatus();
  send(res, { ...st, uptime: Math.round((Date.now() - startedAt) / 1000) });
});
app.get('/api/public-config', (req, res) => res.json(q.publicConfig()));

app.use('/api', (req, res) => res.status(404).json({ error: '없는 API예요' }));

// 쿼리, 요청 본문, 오류 메시지를 찍지 않는다. Express 기본 오류 출력으로 입력값이 새지 않게 한다.
app.use('/api', (error, req, res, next) => {
  if (res.headersSent) return next(error);
  const status = error.type === 'entity.too.large' ? 413 : error.type === 'entity.parse.failed' ? 400 : 503;
  console.error(`[api] ${req.method} ${req.path} HTTP ${status}`);
  res.status(status).json({ error: status === 400 ? '요청 형식을 확인해 주세요.' : '지금은 처리할 수 없어요. 잠시 뒤 다시 시도해 주세요.' });
});
