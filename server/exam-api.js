// 국가기술자격 정기 시험 일정 — 한국산업인력공단 「국가기술자격 종목별 시험정보」 API(공공데이터포털 15003029).
// 병무청과 같은 공공데이터포털 인증키로 호출된다. 이 서비스는 https를 받지 않아 http로 부른다(인증키 외 개인정보 없음).
// 회차마다 첫 행이 정기 접수, 그다음 행은 빈자리 추가 접수라 하나로 합친다. 상시 기능사·필기면제검정은 뺀다.
import { XMLParser } from 'fast-xml-parser';
import { API_KEY, APIS } from './config.js';
import { runtime } from './repo/prepared.js';

const parser = new XMLParser({ parseTagValue: false, ignoreAttributes: true });
const OPS = [['getEList', '기사·산업기사'], ['getCList', '기능사']];
const iso = (v) => (/^\d{8}$/.test(String(v || '')) ? `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}` : null);
const range = (a, b) => { const x = iso(a), y = iso(b); return x && y && x !== y ? `${x}~${y}` : x || y || null; };

// '기사,산업기사(2026년도 제3회)' → { year: 2026, name: '정기 기사 제3회' } / '2026년 정기 기능사 4회' → '정기 기능사 제4회'
export function roundName(description, level) {
  const d = String(description || '');
  const year = Number((/(\d{4})년/.exec(d) || [])[1]) || null;
  const no = (/제?(\d+)회/.exec(d) || [])[1];
  if (!no || /상시|면제/.test(d)) return null;
  return { year, name: `정기 ${level === '기능사' ? '기능사' : '기사'} 제${no}회` };
}

export function normalizeExamRows(rows, level) {
  const groups = new Map();
  for (const r of rows) {
    const n = roundName(r.description, level);
    if (!n) continue;
    if (!groups.has(n.name)) groups.set(n.name, { ...n, rows: [] });
    groups.get(n.name).rows.push(r);
  }
  return [...groups.values()].map((g) => {
    const rs = g.rows.sort((a, b) => String(a.docregstartdt).localeCompare(String(b.docregstartdt)));
    const main = rs[0];
    const extraW = rs.slice(1).map((r) => range(r.docregstartdt, r.docregenddt)).filter((v) => v && v !== range(main.docregstartdt, main.docregenddt));
    const pracMain = [...rs].sort((a, b) => String(a.pracregstartdt).localeCompare(String(b.pracregstartdt)))[0];
    const extraP = rs.map((r) => range(r.pracregstartdt, r.pracregenddt)).filter((v) => v && v !== range(pracMain.pracregstartdt, pracMain.pracregenddt));
    const last = (k) => rs.map((r) => iso(r[k])).filter(Boolean).sort().at(-1) || null;
    return { level, name: g.name, year: g.year,
      writtenApply: range(main.docregstartdt, main.docregenddt), writtenApplyExtra: [...new Set(extraW)],
      writtenExam: iso(main.docexamdt), writtenResult: iso(main.docpassdt),
      practicalApply: range(pracMain.pracregstartdt, pracMain.pracregenddt), practicalApplyExtra: [...new Set(extraP)],
      practicalExam: range(main.pracexamstartdt, main.pracexamenddt), finalResult: last('pracpassdt') };
  }).sort((a, b) => String(a.writtenApply).localeCompare(String(b.writtenApply)));
}

let task = null;
let next = 0;
// 하루 한 번이면 충분하다(연간 일정이라 거의 바뀌지 않는다). 실패하면 10분 뒤 다시.
export async function refreshExams(fetchImpl = fetch) {
  if (task) return task;
  if (Date.now() < next) return;
  task = (async () => {
    const at = new Date().toISOString();
    try {
      if (!API_KEY) throw new Error('missing_key');
      const rounds = [];
      for (const [op, level] of OPS) {
        const res = await fetchImpl(`${APIS.exam.url}/${op}?serviceKey=${API_KEY}`, { signal: AbortSignal.timeout(10000) });
        if (!res.ok) throw new Error(`upstream_http_${res.status}`);
        const data = parser.parse(await res.text());
        const header = data.response?.header || data.OpenAPI_ServiceResponse?.cmmMsgHeader;
        const code = String(header?.resultCode ?? header?.returnReasonCode ?? '');
        if (!['0', '00'].includes(code)) throw new Error(`upstream_error_${code || 'none'}`);
        const raw = data.response.body?.items?.item || [];
        rounds.push(...normalizeExamRows(Array.isArray(raw) ? raw : [raw], level));
      }
      if (!rounds.length) throw new Error('invalid_response');
      rounds.sort((a, b) => String(a.writtenApply).localeCompare(String(b.writtenApply))); // 기사·기능사를 섞어 필기 접수 날짜순
      runtime.exams = { rounds, fetchedAt: at, year: rounds[0].year };
      runtime.logs.push({ api: 'exam', at, ok: true, httpStatus: 200, rows: rounds.length });
      next = Date.now() + 24 * 3600000;
    } catch (error) {
      const { describeFailure } = await import('./live.js');
      const f = describeFailure(error);
      runtime.logs.push({ api: 'exam', at, ok: false, httpStatus: null, error: f.code, reason: f.reason });
      next = Date.now() + 10 * 60000;
    } finally { runtime.logs = runtime.logs.slice(-50); }
  })();
  try { await task; } finally { task = null; }
}
