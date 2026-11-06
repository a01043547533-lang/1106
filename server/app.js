// Express API. 화면은 병무청 API를 직접 부르지 않고 여기 /api/* 만 읽는다.
import express from 'express';

import * as repo from './repo/index.js';
import * as q from './queries.js';
import { TRUST_PROXY, SERVERLESS } from './config.js';
import { refreshStatus } from './live.js';
import { requestLimit } from './rate-limit.js';


export const app = express();
app.disable('x-powered-by');
app.set('trust proxy', TRUST_PROXY);
app.use('/api', (req, res, next) => { res.set({ 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff' }); next(); });
app.use('/api', requestLimit());
app.use(express.json({ limit: '50kb' }));
app.use('/api', async (req, res, next) => {
  if (!SERVERLESS) return next();
  if (['/subscribe', '/verify', '/unsubscribe'].includes(req.path)) return res.status(503).json({ error: '과제 배포에서는 이메일 알림을 제공하지 않습니다. 일정 화면을 확인해 주세요.' });
  if (['/now', '/stats', '/calendar', '/rounds', '/plan', '/health', '/mos', '/mos/search'].includes(req.path) || req.path.startsWith('/mos/')) await refreshStatus();
  next();
});
const startedAt = Date.now();

// 모든 응답에 { source, collectedAt }를 넣는다.
function send(res, data) {
  res.json({ ...q.meta(), ...data });
}

const { today, norm } = q;
const list = (v) => (v ? String(v).split(',').map((s) => s.trim()).filter(Boolean) : []);

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

app.get('/api/plan', (req, res) => {
  const months = list(req.query.months).slice(0, 3);
  const snaps = repo.latestSnapshots();
  const NEED = '병무청 공지 확인 필요';
  const items = months.map((month) => {
    const rows = snaps.filter((s) => s.enlistMonth === month);
    const rounds = [...new Map(rows.map((s) => [`${s.branch}|${s.roundLabel}`, s])).values()];
    return {
      month,
      rounds: rounds.map((s) => ({
        branch: s.branch,
        round: s.roundLabel,
        schedule: {
          applyStart: s.applyStart || NEED,
          applyEnd: s.applyEnd || NEED,
          firstResult: NEED,
          finalResult: NEED,
          enlist: s.enlistMonth || NEED,
        },
      })),
      specialties: rows.map((s) => ({ branch: s.branch, mosCode: s.mosCode, mosName: s.mosName, rate: s.rate })),
    };
  });
  send(res, { items });
});

// /api/mos/search 는 /api/mos/:mosCode 보다 먼저 등록해야 한다.
app.get('/api/mos/search', (req, res) => {
  // ★ 차별점. 입력은 절대 저장하지 않고 로그에도 남기지 않는다.
  const height = Number(req.query.height) || null;
  const weight = Number(req.query.weight) || null;
  const vision = Number(req.query.vision) || null;
  const grade = Number(req.query.grade) || null;
  const items = new Set(list(req.query.items));
  const branch = req.query.branch || null;

  const mos = repo.getDataset('mos').items;
  const elig = repo.getDataset('eligible').items;
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

      const need = elig.filter((e) => norm(e).mosCode === n.mosCode).map((e) => norm(e).item).filter(Boolean);
      const anyItemOk = !need.length || need.some((x) => items.has(x));
      const missing = !anyItemOk ? need.slice(0, 3) : [];
      const snap = latest.find((s) => s.mosCode === n.mosCode && s.branch === n.branch);

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

app.get('/api/mos/:mosCode', (req, res) => {
  const d = q.mosDetail(req.params.mosCode);
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
  const want = new Set(list(req.query.items));
  const map = new Map();
  const catOf = new Map(repo.getDataset('mos').items.map((it) => [norm(it).mosCode, norm(it).category]));
  for (const e of repo.getDataset('eligible').items) {
    const n = norm(e);
    if (!want.has(n.item)) continue;
    const k = `${n.branch}|${n.mosCode}`;
    if (!map.has(k)) map.set(k, { branch: n.branch, mosCode: n.mosCode, mosName: n.mosName, category: catOf.get(n.mosCode) || null, matched: [] });
    map.get(k).matched.push({ item: n.item, kind: n.kind, level: n.level, relation: n.relation });
  }
  send(res, { items: [...map.values()] });
});

app.get('/api/eligible-items', (req, res) => {
  const set = new Set(repo.getDataset('eligible').items.map((e) => norm(e).item).filter(Boolean));
  send(res, { items: [...set].sort((a, b) => a.localeCompare(b, 'ko')) });
});

app.get('/api/calendar', (req, res) => send(res, q.calendarList({ from: req.query.from || undefined, to: req.query.to || undefined })));

// 사회복무요원 복무기관 검색 (API에 필터 변수가 없어 서버에서 거른다)
app.get('/api/social-orgs', (req, res) => {
  const items = repo.getDataset('social').items.map(norm);
  const region = req.query.region || '';
  const type = req.query.type || '';
  const qq = String(req.query.q || '').trim();
  const regions = [...new Set(items.map((o) => String(o.region || '').split(' ')[0]).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ko'));
  const types = [...new Set(items.map((o) => o.orgType).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ko'));
  let rows = items;
  if (region) rows = rows.filter((o) => String(o.region || '').startsWith(region));
  if (type) rows = rows.filter((o) => o.orgType === type);
  if (qq) rows = rows.filter((o) => `${o.orgName} ${o.parentOrg} ${o.address}`.includes(qq));
  send(res, { total: rows.length, items: rows.slice(0, 100), regions, types });
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
