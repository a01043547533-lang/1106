import { XMLParser } from 'fast-xml-parser';
import { API_KEY, APIS } from './config.js';
import { runtime } from './repo/prepared.js';
const parser = new XMLParser({ parseTagValue: false, ignoreAttributes: true });
let task = null;
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
      const signal = AbortSignal.timeout(15000);
      for (let page = 1; rows.length < total && page <= 3; page++) {
        const response = await fetchImpl(`${APIS.status.url}?serviceKey=${API_KEY}&numOfRows=9999&pageNo=${page}`, { signal });
        if (!response.ok) throw new Error('upstream_http');
        const data = parser.parse(await response.text());
        const header = data.response?.header;
        if (!header || !['0', '00'].includes(String(header.resultCode))) throw new Error('upstream_error');
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
      runtime.logs.push({ api: 'status', at, ok: true, httpStatus: 200 });
      nextAttempt = Date.now() + 30000;
    } catch {
      // 키/상위 요청 URL/응답 원문은 로그와 사용자 응답에 포함하지 않는다.
      runtime.logs.push({ api: 'status', at, ok: false, httpStatus: null });
      nextAttempt = Date.now() + 30000;
    } finally { runtime.logs = runtime.logs.slice(-50); }
  })();
  try { await task; } finally { task = null; }
}
