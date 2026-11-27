// 같은 주소를 여러 부품이 동시에 부르면 요청을 하나로 합치고, 잠깐 동안 결과를 재사용한다.
// 잘 바뀌지 않는 기준 자료(규칙·복무기간·특기 목록 등)는 5분, 나머지는 30초 동안 재사용한다.
// 주기 갱신(force)은 캐시를 건너뛰되, 이미 진행 중인 같은 요청이 있으면 그것을 기다린다.
const STATIC = /^\/api\/(rules|service-terms|eligible-items|public-config|calendar|mos)(\?|$)/;
const MAX_ENTRIES = 100;
const store = new Map();

const maxAgeOf = (url) => (STATIC.test(url) ? 5 * 60000 : 30000);

export function peekJson(url) {
  const hit = url && store.get(url);
  return hit && !hit.pending && 'data' in hit && Date.now() - hit.at < maxAgeOf(url) ? hit.data : undefined;
}

// 서버가 이미 계산해 보낸 응답을 캐시에 넣어 둔다. 화면이 같은 주소를 다시 부르지 않고 바로 그린다.
// 아직 쓸 만한 값이 있으면 건드리지 않는다(렌더마다 불려도 한 번만 들어감).
export function primeJson(url, data) {
  if (!url || data == null || peekJson(url) !== undefined) return;
  store.delete(url);
  store.set(url, { at: Date.now(), pending: false, data, promise: Promise.resolve(data) });
  if (store.size > MAX_ENTRIES) store.delete(store.keys().next().value);
}

export function getJson(url, { force = false } = {}) {
  const now = Date.now();
  const hit = store.get(url);
  if (hit && (hit.pending || (!force && now - hit.at < maxAgeOf(url)))) return hit.promise;
  const entry = { at: now, pending: true };
  entry.promise = fetch(url)
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then((data) => { entry.pending = false; entry.at = Date.now(); entry.data = data; return data; },
      (error) => { if (store.get(url) === entry) store.delete(url); throw error; });
  store.delete(url);
  store.set(url, entry);
  if (store.size > MAX_ENTRIES) store.delete(store.keys().next().value);
  return entry.promise;
}

// 서버가 실시간 연결을 막 마쳤을 때 접수현황 계열 캐시를 비우고, 열려 있는 화면에 다시 받으라고 알린다.
export const LIVE_EVENT = 'ipdae:live';
export function invalidate(test) {
  for (const key of [...store.keys()]) if (test(key)) store.delete(key);
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(LIVE_EVENT));
}
