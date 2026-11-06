// 수집기. 병무청 API는 여기서만 호출한다.
//   npm run collect        → 접수현황만 (자주)
//   npm run collect:daily  → 나머지 7개 (하루 1번)
// 키가 없거나 호출이 실패해도 절대 비정상 종료하지 않는다. sample/을 읽어 같은 형식으로 저장한다.
import { APIS } from './config.js';
import { fetchAll, sleep } from './mma.js';
import * as repo from './repo/index.js';

// ════════════════════════════════════════════════════════════════
// 필드 매핑표 — 명세서를 보고 여기만 고치면 된다.
// 각 항목은 "후보 필드명 배열"이다. 앞에서부터 처음 값이 있는 필드를 쓴다.
// ✔ = 공공데이터포털 명세에서 확인한 필드명 / ? = 추정. 첫 호출 로그의 실제 필드명으로 바꿀 것
// ════════════════════════════════════════════════════════════════
export const FIELD_MAP = {
  // 15031295 접수현황 (✔ 실제 응답 확인)
  status: {
    branch:      ['gunGbnm'],
    roundLabel:  ['mojipTms'],
    year:        ['mojipYy'],
    enlistMonth: ['ipyeongDe'],      // 입영월 (YYYYMM)
    unit:        ['iybudaeCdm'],     // 입영부대명
    category:    ['mojipGbnm'],      // 모집구분 (기술행정병(연모집) 등)
    mosCode:     ['gsteukgiCd'],
    mosName:     ['gsteukgiNm'],
    applyStart:  ['jeopsuSjdtm'],
    applyEnd:    ['jeopsuJrdtm'],
    quota:       ['seonbalPcnt'],    // 모집(선발)인원
    applicants:  ['jeopsuPcnt'],     // 접수인원
    shortage:    ['extremes'],       // 과부족 (음수면 미달)
    rate:        ['rate'],           // API 값은 정수로 잘려 와서 아래에서 다시 계산한다
  },
  // 3066488 군사특기 정보 (✔ 실제 응답 확인) — 한 줄에 기준 하나(gjhangmokNm=항목, cjgijunVl=값). 수집기가 특기별로 묶는다
  mos: {
    branch:     ['gunGbnm'],
    category:   ['mjgubNm'],
    mosCode:    ['gsteukgiCd'],
    mosName:    ['gsteukgiNm'],
    year:       ['mojipYy'],
    round:      ['mojipTms'],
    applyStart: ['jeopsuSjdtm'],
    applyEnd:   ['jeopsuJrdtm'],
    enlistFrom: ['iyyjsijakYm'],
    enlistTo:   ['iyyjjongryoYm'],
    criterion:  ['gjhangmokNm'],
    value:      ['cjgijunVl'],
  },
  // 3066489 구비서류 (✔ 실제 응답 확인)
  docs: {
    branch:   ['gunGbnm'],
    category: ['mjgubun'],
    mosCode:  ['gsteukgiCd'],
    mosName:  ['gsteukgiNm'],
    docName:  ['jcseoryuNm'],
    required: ['psjechulYn'],
  },
  // 3066490 선발배점기준 (2026-11-06 실제 응답 확인)
  score: {
    branch:   ['gunGbnm', 'gtcdNm1'],
    category: ['mjgubNm', 'mjgubun'],
    mosCode:  ['gsteukgiCd'],
    mosName:  ['gsteukgiNm'],
    year:     ['mojipYy'],
    round:    ['mojipTms'],
    gradeCode:['bjgijunDgcd'],
    gradeName:['bjgijunDgnm'],
    kindCode: ['bjgijunGbcd'],
    kindName: ['bjgijunGbnm'],
    detailName: ['bjgjsangseNm'],
    directScore: ['jjgwanryeonScor'],
    indirectScore: ['gjgwanryeonScor'],
    applyStart: ['jeopsuSjdtm'],
    applyEnd: ['jeopsuJrdtm'],
    minValue: ['cjgijunVl'],
    maxValue: ['cggijunVl'],
  },
  // 3066491 전문특기병 배점구분 (✔ 실제 응답 확인)
  scoreSp: {
    branch:   ['gunGbnm'],
    mosCode:  ['gsteukgiCd'],
    mosName:  ['gsteukgiNm'],
    year:     ['mojipYy'],
    round:    ['mojipTms'],
    kindName: ['jmtgbjgijunNm'],   // 전공 / 자격 / 출결 …
    itemName: ['jmtgbaejeomNm'],   // 대학 4학년 재학(직접관련학과) …
    relName:  ['bjgwanryeonGbnm'],
    minValue: ['cjgijunVl'],
    maxValue: ['cggijunVl'],
    applyStart: ['jeopsuSjdtm'],
    applyEnd:   ['jeopsuJrdtm'],
  },
  // 3066750 지원가능 정보 (✔ 명세 확인)
  eligible: {
    branch:  ['gtcdNm1'],
    mosCode: ['gsteukgiCd'],
    mosName: ['gsteukgiNm'],
    item:    ['gtcdNm2'],        // 자격면허전공명
    kind:    ['gubun'],          // 자격 / 면허 / 전공
    level:   ['jgmyeonheoDg'],   // 자격면허등급
    relation:['jjganjeopGbcd'],  // 직접 / 간접
  },
  // 15017227 맞춤형 특기병 (✔ 명세 확인)
  jobfit: {
    branch:     ['gtcdNm1'],
    year:       ['mojipYy'],
    round:      ['mojipTms'],
    mosCode:    ['gsteukgiCd'],
    mosName:    ['gsteukgiNm'],
    unit:       ['gtcdNm2'],
    enlistDate: ['ipyeongDt'],
    quota:      ['mojipPcnt'],
    selected:   ['cjsbinweon'],
    vacancy:    ['jygs'],
  },
  // 3066757 사회복무요원 복무기관 (✔ 명세 확인)
  social: {
    region:    ['Bjdsgg'],
    regionCode:['bjdsggjusoCd'],
    orgCode:   ['bmgigwanCd'],
    orgName:   ['bokmuGgm'],
    parentOrg: ['dpBokmuGgm'],
    address:   ['drmJuso'],
    office:    ['gtcdNm'],
    phone:     ['jeonhwaNo'],
    limits:    ['sbjhjilbyeong'],
    sexCrimeLimit: ['sbjjehanYn'],
    orgType:   ['ssggdaeBr'],
  },
};

// ── 변환 도우미 ──
const pick = (item, keys) => {
  for (const k of keys) {
    const v = item?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
  }
  return null;
};
const num = (v) => {
  if (v === null || v === undefined) return null;
  const n = Number(String(v).replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : null;
};
// "20261110" / "202611101400" / "2026-11-10 14:00" → "2026-11-10" 또는 "2026-11-10T14:00"
const toDate = (v) => {
  if (!v) return null;
  const d = String(v).replace(/[^0-9]/g, '');
  if (d.length >= 12) return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}T${d.slice(8, 10)}:${d.slice(10, 12)}`;
  if (d.length >= 8) return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
  return String(v);
};
const toMonth = (v) => {
  if (!v) return null;
  const d = String(v).replace(/[^0-9]/g, '');
  return d.length >= 6 ? `${d.slice(0, 4)}-${d.slice(4, 6)}` : String(v);
};
const mapItem = (item, map) => Object.fromEntries(Object.entries(map).map(([k, keys]) => [k, pick(item, keys)]));

const readSample = repo.readSample;

function log(api, ok, extra = {}) {
  repo.appendCollectLog({ at: new Date().toISOString(), api, ok, httpStatus: null, error: null, rows: 0, ...extra });
}

// 응답에 실제로 어떤 필드가 오는지 콘솔에 찍는다. 매핑표를 고칠 때 이걸 보고 고친다.
function printFields(key, items) {
  if (!items.length) return;
  console.log(`  [${key}] 응답 필드: ${Object.keys(items[0]).join(', ')}`);
}

// ════════════ 접수현황 ════════════
async function collectStatus() {
  const collectedAt = new Date().toISOString();
  let rows = [];
  let source = 'api';
  try {
    const { items, httpStatus } = await fetchAll('status', APIS.status);
    printFields('status', items);
    rows = items.map((it) => {
      const m = mapItem(it, FIELD_MAP.status);
      if (m.branch === '해병') m.branch = '해병대';
      const quota = num(m.quota);
      const applicants = num(m.applicants);
      // API의 rate는 소수점이 잘려 오므로(272명 중 2명 → 0) 모집·접수인원으로 직접 계산한다.
      let rate = quota ? Math.round((applicants / quota) * 100) / 100 : num(m.rate);
      return {
        collectedAt, branch: m.branch, roundLabel: [m.year, m.roundLabel].filter(Boolean).join('-') || null,
        enlistMonth: toMonth(m.enlistMonth), unit: m.unit,
        category: /카투사/.test(`${m.category}${m.mosName}`) ? '카투사' : m.category,
        mosCode: m.mosCode, mosName: m.mosName,
        applyStart: toDate(m.applyStart), applyEnd: toDate(m.applyEnd),
        quota, applicants, shortage: num(m.shortage) ?? (quota !== null && applicants !== null ? applicants - quota : null),
        rate, source,
      };
    });
    log('status', true, { httpStatus, rows: rows.length });
    const katusa = rows.filter((r) => r.category === '카투사');
    console.log(katusa.length
      ? `  카투사 분야 ${katusa.length}건 수집 (입영월: ${[...new Set(katusa.map((r) => r.enlistMonth))].join(', ')})`
      : '  API에 카투사 없음');
  } catch (e) {
    source = 'sample';
    log('status', false, { httpStatus: e.httpStatus ?? null, error: e.message });
    console.warn(`  접수현황 실패 → sample 사용: ${e.message}`);
    rows = readSample('snapshots.sample.jsonl').map((r) => ({ ...r, collectedAt, source }));
  }

  // 직전 값과 같은 줄(roundLabel, mosCode, applicants 동일)은 추가하지 않는다.
  const last = new Map(repo.latestSnapshots().map((s) => [repo.snapKey(s), s]));
  const fresh = rows.filter((r) => {
    const prev = last.get(repo.snapKey(r));
    return !prev || ['applicants', 'quota', 'rate', 'source', 'applyStart', 'applyEnd'].some((key) => prev[key] !== r[key]);
  });
  repo.appendSnapshots(fresh);
  console.log(`  스냅샷 ${rows.length}건 중 ${fresh.length}건 추가 (source:${source})`);

  // 접수가 끝난 회차·특기는 마지막 스냅샷을 final_rates.json에 자동 기록한다.
  if (source === 'api') {
    const now = new Date().toISOString();
    const finals = repo.getFinalRates();
    const have = new Set(finals.map((f) => `${f.roundLabel}|${f.mosCode}`));
    for (const s of repo.latestSnapshots()) {
      if (s.source !== 'api' || !s.applyEnd || s.applyEnd > now) continue;
      const k = `${s.roundLabel}|${s.mosCode}`;
      if (have.has(k)) continue;
      finals.push({ roundLabel: s.roundLabel, mosCode: s.mosCode, rate: s.rate, source: 'api' });
      have.add(k);
    }
    repo.saveFinalRates(finals);
  }
}

// 군사특기 정보는 기준 한 개가 한 줄이라, (연도·회차·군·모집구분·특기)별로 한 건으로 묶고 최신 회차만 남긴다.
function pivotMos(items) {
  const groups = new Map();
  for (const it of items) {
    const m = mapItem(it, FIELD_MAP.mos);
    const k = [m.branch, m.category, m.mosCode].join('|');
    const rk = `${m.year}-${String(m.round).padStart(4, '0')}`;
    let g = groups.get(k);
    if (!g || g.rk < rk) { g = { rk, m, criteria: {} }; groups.set(k, g); }
    if (g.rk === rk && m.criterion) g.criteria[m.criterion] = m.value;
  }
  return [...groups.values()].map(({ m, criteria: c }) => {
    const h = num(c['신장']); const w = num(c['체중']);
    const vL = num(c['교정시력_좌']); const vR = num(c['교정시력_우']);
    const vision = [vL, vR].filter((v) => v !== null);
    const grade = num(c['신체등급코드']);
    return {
      criteria: c,
      _norm: {
        branch: m.branch === '해병' ? '해병대' : m.branch, category: m.category, mosCode: m.mosCode, mosName: m.mosName,
        year: m.year, round: m.round, applyStart: toDate(m.applyStart), applyEnd: toDate(m.applyEnd),
        enlistFrom: toMonth(m.enlistFrom), enlistTo: toMonth(m.enlistTo),
        heightMin: h, weightMin: w, visionMin: vision.length ? Math.max(...vision) : null, gradeMax: grade,
        height: h ? `${h}cm 이상` : null, weight: w ? `${w}kg 이상` : null,
        vision: vision.length ? `교정시력 ${Math.max(...vision)} 이상` : null,
        minGrade: grade ? String(grade) : null,
        interview: c['면접실시여부'] || null, yearRound: c['연간모집여부'] || null,
        colorVision: c['색각장애코드허용값'] || null, education: c['신분선발기준학력코드'] || null,
      },
    };
  });
}

// ════════════ 나머지 7개 ════════════
const DAILY = [
  ['mos', 'mos_master.sample.json'],
  ['docs', null],
  ['score', 'scoring_rules.sample.json'],
  ['scoreSp', null],
  ['eligible', 'eligibility.sample.json'],
  ['jobfit', null],
  ['social', null],
];

async function collectDataset(key, sampleFile) {
  const fetchedAt = new Date().toISOString();
  try {
    let items; let totalCount; let httpStatus; let norm;
    if (key === 'score') {
      // 화면은 특기별 최신 회차만 사용한다. 전체 40만여 행을 메모리에 쌓지 않는다.
      const latest = new Map();
      const r = await fetchAll(key, APIS[key], {
        numOfRows: 9999,
        reduce: (page) => {
          for (const it of page) {
            const n = mapItem(it, FIELD_MAP.score);
            const group = `${n.branch}|${n.mosCode}`;
            const round = `${n.year}-${String(n.round).padStart(4, '0')}`;
            const current = latest.get(group);
            if (!current || round > current.round) latest.set(group, { round, items: [{ ...it, _norm: n }] });
            else if (round === current.round) current.items.push({ ...it, _norm: n });
          }
        },
        onProgress: (seen, total, page) => { if (page % 10 === 0 || seen >= total) console.log(`    선발배점 ${seen} / ${total}건 확인`); },
      });
      ({ totalCount, httpStatus } = r);
      items = norm = [...latest.values()].flatMap((group) => group.items);
      printFields(key, items);
    } else if (key === 'eligible') {
      // 지원가능 정보는 100만 건이 넘는다. 받으면서 (군·특기·자격·구분·등급·직간접) 기준으로 중복을 지우고 정규화 값만 남긴다.
      const uniq = new Map();
      let printed = false;
      const r = await fetchAll(key, APIS[key], {
        reduce: (page) => {
          if (!printed) { printFields(key, page); printed = true; }
          for (const it of page) {
            const n = mapItem(it, FIELD_MAP.eligible);
            const k = [n.branch, n.mosCode, n.item, n.kind, n.level, n.relation].join('|');
            if (!uniq.has(k)) uniq.set(k, { _norm: n });
          }
        },
        onProgress: (seen, total, page) => {
          if (page % 50 === 0 || seen >= total) console.log(`    지원가능 정보 ${seen.toLocaleString()} / ${Number(total).toLocaleString()}건 (고유 ${uniq.size.toLocaleString()}건)`);
        },
      });
      ({ totalCount, httpStatus } = r);
      norm = [...uniq.values()];
      items = norm;
    } else {
      ({ items, totalCount, httpStatus } = await fetchAll(key, APIS[key]));
      printFields(key, items);
      // 원본 필드는 그대로 두고, 화면에서 쓰는 정규화 값을 _norm에 붙인다.
      norm = key === 'mos' ? pivotMos(items) : items.map((it) => ({ ...it, _norm: mapItem(it, FIELD_MAP[key]) }));
      if (key === 'mos') console.log(`  군사특기 ${items.length}줄 → 특기 ${norm.length}개로 묶음`);
    }
    repo.saveDataset(key, { fetchedAt, totalCount, source: 'api', items: norm });
    log(key, true, { httpStatus, rows: items.length });
    console.log(`  ${APIS[key].name}: ${items.length}건`);

    if (key === 'score' || key === 'scoreSp') {
      const flagged = items.filter((it) => /출결|면접/.test(Object.values(it).join(' ')));
      if (flagged.length) {
        console.log(`  ⚠ ${APIS[key].name}에 출결·면접 구분값이 여전히 ${flagged.length}건 있어요 (제도상 폐지 → 합계에서 뺌):`);
        for (const f of flagged.slice(0, 20)) console.log('    -', JSON.stringify(f));
      }
    }
  } catch (e) {
    log(key, false, { httpStatus: e.httpStatus ?? null, error: e.message });
    const items = sampleFile ? readSample(sampleFile) : [];
    repo.saveDataset(key, { fetchedAt, totalCount: items.length, source: 'sample', items });
    console.warn(`  ${APIS[key].name} 실패 → sample ${items.length}건 사용: ${e.message}`);
  }
}

async function main() {
  const only = process.argv.find((arg) => arg.startsWith('--only='))?.slice(7);
  if (only) {
    const entry = DAILY.find(([key]) => key === only);
    if (!entry) throw new Error('알 수 없는 개별 수집 대상');
    await collectDataset(...entry);
    return;
  }
  const daily = process.argv.includes('--daily');
  console.log(`[수집 시작] ${new Date().toISOString()} ${daily ? '(daily 7개)' : '(접수현황)'}`);
  try {
    if (daily) {
      const force = process.argv.includes('--force');
      for (const [key, sample] of DAILY) {
        // 지원가능 정보는 100만 건 이상이라 한 번 받는 데 40분 넘게 걸린다. 7일에 한 번만 받는다(--force면 바로).
        if (key === 'eligible' && !force) {
          const ds = repo.getDataset('eligible');
          const ageDays = ds.fetchedAt ? (Date.now() - Date.parse(ds.fetchedAt)) / 86400000 : Infinity;
          if (ds.source === 'api' && ageDays < 7) {
            console.log(`  지원가능 정보: ${ageDays.toFixed(1)}일 전에 받아서 건너뛰어요 (바로 받으려면 npm run collect:eligible)`);
            continue;
          }
        }
        await collectDataset(key, sample);
        await sleep(1000);
      }
    } else {
      await collectStatus();
    }
  } catch (e) {
    // 어떤 경우에도 비정상 종료하지 않는다.
    log(daily ? 'daily' : 'status', false, { error: `예상 못 한 오류: ${e.message}` });
    console.error('  예상 못 한 오류:', e);
  }
  console.log('[수집 끝]');
}

main();
