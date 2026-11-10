import { XMLParser } from 'fast-xml-parser';
import { API_KEY, APIS } from './config.js';
import { runtime } from './repo/prepared.js';
const parser = new XMLParser({ parseTagValue: false, ignoreAttributes: true });
let task = null;
// 공공데이터포털 결과코드 → 사람이 읽을 원인. 키·요청주소·응답 원문은 기록하지 않는다.
const PORTAL_CODES = { '1': '응용 프로그램 오류', '10': '잘못된 요청 변수', '12': '서비스 없음(요청 주소 확인)', '20': '서비스 접근 거부', '22': '하루 요청 한도 초과', '30': '등록되지 않은 인증키(키 값·인코딩 확인, 활용신청 승인 여부 확인)', '31': '기한이 만료된 인증키', '32': '등록되지 않은 IP', '99': '기타 오류' };
export function describeFailure(error) {
  const m = String(error?.message || error || '');
  if (m === 'missing_key') return { code: 'missing_key', reason: '서버에 MMA_API_KEY가 없어요(Vercel 환경변수 확인 후 재배포)' };
  if (error?.name === 'TimeoutError' || error?.name === 'AbortError' || /timeout|aborted/i.test(m)) return { code: 'timeout', reason: '병무청 응답이 제한 시간 안에 오지 않았어요' };
  const http = /^upstream_http_(\d+)$/.exec(m);
  if (http && ['401', '403'].includes(http[1])) return { code: `http_${http[1]}`, reason: `인증키가 거부됐어요(HTTP ${http[1]}). Vercel 환경변수 MMA_API_KEY 값이 공공데이터포털의 일반 인증키(Encoding)와 같은지, 활용신청이 승인됐는지 확인하세요` };
  if (http) return { code: `http_${http[1]}`, reason: `공공데이터포털이 HTTP ${http[1]}로 응답했어요(포털 장애일 수 있어요)` };
  const portal = /^upstream_error_(\w+)$/.exec(m); if (portal) return { code: `portal_${portal[1]}`, reason: `공공데이터포털 결과코드 ${portal[1]}: ${PORTAL_CODES[portal[1]] || '알 수 없는 오류'}` };
  if (m === 'incomplete_response' || m === 'invalid_response') return { code: m, reason: '응답이 비었거나 일부만 왔어요' };
  if (/fetch failed|ENOTFOUND|ECONNRESET|ECONNREFUSED|EAI_AGAIN/i.test(m + String(error?.cause?.code || ''))) return { code: 'network', reason: `병무청 서버에 연결하지 못했어요(${error?.cause?.code || '네트워크 오류'})` };
  return { code: 'unknown', reason: '알 수 없는 오류' };
}
let nextAttempt = 0;
const number = (v) => v == null || v === '' ? null : Number(String(v).replaceAll(',', ''));
function date(value) {
  if (!value) return null;
  if (/^\d{8,14}$/.test(value)) return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}${value.length >= 12 ? `T${value.slice(8, 10)}:${value.slice(10, 12)}:00+09:00` : ''}`;
  return value;
}
export async function refreshStatus(fetchImpl = fetch) {
  if (task) return task;
  if (Date.now() < nextAttempt) return;
  task = (async () => {
    const at = new Date().toISOString();
    try {
      if (!API_KEY) throw new Error('missing_key');
      const rows = [];
      let total = Infinity;
      // 3페이지/최대 15초로 서버 함수 실행시간을 제한한다. 일부만 받은 자료는 게시하지 않는다.
      const signal = AbortSignal.timeout(25000);
      for (let page = 1; rows.length < total && page <= 3; page++) {
        const response = await fetchImpl(`${APIS.status.url}?serviceKey=${API_KEY}&numOfRows=9999&pageNo=${page}`, { signal });
        if (!response.ok) throw new Error(`upstream_http_${response.status}`);
        const text = await response.text();
        const data = parser.parse(text);
        // 인증키 오류 등은 OpenAPI_ServiceResponse 형태로 온다
        const header = data.response?.header || data.OpenAPI_ServiceResponse?.cmmMsgHeader;
        const code = String(header?.resultCode ?? header?.returnReasonCode ?? '');
        if (!header || !['0', '00'].includes(code)) throw new Error(`upstream_error_${code || 'none'}`);
        const body = data.response.body;
        const items = body.items?.item || [];
        rows.push(...(Array.isArray(items) ? items : [items]));
        total = Number(body.totalCount);
        if (!Number.isFinite(total)) throw new Error('invalid_response');
      }
      if (rows.length < total) throw new Error('incomplete_response');
      runtime.snapshots = rows.map((r) => {
        const quota = number(r.seonbalPcnt); const applicants = number(r.jeopsuPcnt);
        const month = String(r.ipyeongDe || '');
        return { branch: r.gunGbnm === '해병' ? '해병대' : r.gunGbnm, mosCode: r.gsteukgiCd, mosName: r.gsteukgiNm,
          roundLabel: [r.mojipYy, r.mojipTms].filter(Boolean).join('-'), category: r.mojipGbnm, unit: r.iybudaeCdm,
          enlistMonth: /^\d{6}$/.test(month) ? `${month.slice(0, 4)}-${month.slice(4)}` : month || null,
          applyStart: date(r.jeopsuSjdtm), applyEnd: date(r.jeopsuJrdtm), quota, applicants,
          rate: quota > 0 && applicants != null ? Math.round(applicants / quota * 100) / 100 : null,
          collectedAt: at, source: 'api' };
      });
      runtime.logs.push({ api: 'status', at, ok: true, httpStatus: 200, ms: Date.now() - Date.parse(at), rows: runtime.snapshots.length });
      nextAttempt = Date.now() + 30000;
    } catch (error) {
      // 키/상위 요청 URL/응답 원문은 로그와 사용자 응답에 포함하지 않는다. 원인 분류만 남긴다.
      const f = describeFailure(error);
      runtime.logs.push({ api: 'status', at, ok: false, httpStatus: /^http_(\d+)$/.exec(f.code)?.[1] ? Number(/^http_(\d+)$/.exec(f.code)[1]) : null, error: f.code, reason: f.reason, ms: Date.now() - Date.parse(at) });
      nextAttempt = Date.now() + 30000;
    } finally { runtime.logs = runtime.logs.slice(-50); }
  })();
  try { await task; } finally { task = null; }
}

// 맞춤형 특기병 정보(입영일별 모집·선발·잔여). 한 페이지(약 100여 건)라 10분 캐시로 충분하다.
// 실패하면 runtime.jobfit을 비우지 않고(이전 성공값 유지) 저장된 기준자료로 넘어간다.
let jobfitTask = null;
let jobfitNext = 0;
export async function refreshJobfit(fetchImpl = fetch) {
  if (jobfitTask) return jobfitTask;
  if (Date.now() < jobfitNext) return;
  jobfitTask = (async () => {
    const at = new Date().toISOString();
    try {
      if (!API_KEY) throw new Error('missing_key');
      const response = await fetchImpl(`${APIS.jobfit.url}?serviceKey=${API_KEY}&numOfRows=1000&pageNo=1`, { signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error(`upstream_http_${response.status}`);
      const data = parser.parse(await response.text());
      const header = data.response?.header || data.OpenAPI_ServiceResponse?.cmmMsgHeader;
      const code = String(header?.resultCode ?? header?.returnReasonCode ?? '');
      if (!header || !['0', '00'].includes(code)) throw new Error(`upstream_error_${code || 'none'}`);
      const body = data.response.body;
      const raw = body.items?.item || [];
      const rows = Array.isArray(raw) ? raw : [raw];
      const total = Number(body.totalCount);
      if (!Number.isFinite(total) || rows.length < total) throw new Error('incomplete_response');
      const items = rows.map((r) => ({ branch: r.gtcdNm1 === '해병' ? '해병대' : r.gtcdNm1, year: r.mojipYy, round: r.mojipTms,
        mosCode: r.gsteukgiCd, mosName: r.gsteukgiNm, unit: r.gtcdNm2, enlistDate: String(r.ipyeongDt || ''),
        quota: number(r.mojipPcnt), selected: number(r.cjsbinweon), vacancy: number(r.jygs) }));
      if (items.some((r) => !r.mosCode || !Number.isFinite(r.quota) || !/^\d{8}$/.test(r.enlistDate))) throw new Error('invalid_response');
      runtime.jobfit = { items, fetchedAt: at };
      runtime.logs.push({ api: 'jobfit', at, ok: true, httpStatus: 200 });
      jobfitNext = Date.now() + 10 * 60000;
    } catch (error) {
      const f = describeFailure(error);
      runtime.logs.push({ api: 'jobfit', at, ok: false, httpStatus: null, error: f.code, reason: f.reason });
      jobfitNext = Date.now() + 60000;
    } finally { runtime.logs = runtime.logs.slice(-50); }
  })();
  try { await jobfitTask; } finally { jobfitTask = null; }
}
