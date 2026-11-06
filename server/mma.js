// 병무청 API 호출기. XML을 받아 item 배열로 돌려준다.
// numOfRows=1000으로 시작해 totalCount까지 pageNo를 돌리고, 호출 사이 1초를 쉰다.
import { XMLParser } from 'fast-xml-parser';
import { API_KEY } from './config.js';
import { saveRaw } from './repo/files.js';

const parser = new XMLParser({ ignoreAttributes: true, parseTagValue: false, trimValues: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function findItems(obj) {
  // response.body.items.item 이 기본이지만, 구조가 달라도 찾아낸다.
  const body = obj?.response?.body ?? obj?.body ?? obj;
  const total = Number(body?.totalCount ?? 0);
  let items = body?.items?.item ?? body?.items ?? [];
  if (items && !Array.isArray(items)) items = typeof items === 'object' ? [items] : [];
  return { items, total };
}

// reduce: 페이지마다 받은 item을 줄여서 보관할 때 쓴다(지원가능 정보처럼 100만 건이 넘는 API용).
// rawPages: 원본 XML을 앞에서 몇 페이지까지 보관할지(용량 보호).
export async function fetchAll(apiKey, api, { numOfRows = 1000, extraParams = {}, reduce = null, rawPages = 5, onProgress = null } = {}) {
  if (!API_KEY) throw new Error('MMA_API_KEY가 없어요');
  if (!api.url) throw new Error(`${api.name} 요청주소(.env)가 비어 있어요`);

  const all = [];
  let seen = 0;
  let pageNo = 1;
  let total = Infinity;
  let httpStatus = null;

  while (seen < total) {
    const qs = new URLSearchParams({ numOfRows: String(numOfRows), pageNo: String(pageNo), ...extraParams });
    // 공공데이터포털 키는 이미 인코딩된 형태일 수 있으니 그대로 붙인다.
    const url = `${api.url}?serviceKey=${API_KEY}&${qs}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
    httpStatus = res.status;
    const xml = await res.text();
    if (pageNo <= rawPages) saveRaw(apiKey, pageNo, xml);
    const parsed = parser.parse(xml);
    if (!res.ok) {
      // 공공데이터포털 오류 응답(OpenAPI_ServiceResponse)의 사유를 같이 보여 준다.
      const h = parsed?.OpenAPI_ServiceResponse?.cmmMsgHeader;
      const why = h ? ` ${h.returnAuthMsg || h.errMsg} (코드 ${h.returnReasonCode})` : '';
      throw Object.assign(new Error(`HTTP ${res.status}${why}`), { httpStatus });
    }
    const header = parsed?.response?.header ?? parsed?.OpenAPI_ServiceResponse?.cmmMsgHeader;
    const code = String(header?.resultCode ?? header?.returnReasonCode ?? '00');
    if (code !== '00' && code !== '0') {
      const msg = header?.resultMsg ?? header?.returnAuthMsg ?? header?.errMsg ?? 'API 오류';
      throw Object.assign(new Error(`resultCode ${code}: ${msg}`), { httpStatus });
    }
    const { items, total: t } = findItems(parsed);
    seen += items.length;
    total = Number.isFinite(t) && t > 0 ? t : seen;
    if (reduce) reduce(items); else all.push(...items);
    if (onProgress) onProgress(seen, total, pageNo);
    if (!items.length) break;
    pageNo++;
    if (seen < total) await sleep(1000);
  }
  return { items: all, totalCount: total === Infinity ? seen : total, httpStatus };
}

export { sleep };
