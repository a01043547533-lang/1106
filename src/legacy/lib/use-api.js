import { useEffect, useState } from 'react';
import { LIVE_EVENT, getJson, peekJson } from './fetch-cache.js';

const initial = (url) => {
  const data = peekJson(url);
  return { url, data: data ?? null, error: null, loading: Boolean(url) && data === undefined, at: data === undefined ? null : new Date() };
};

export function useApi(url, { interval = 0 } = {}) {
  const [state, setState] = useState(() => initial(url));
  useEffect(() => {
    let alive = true;
    let request = 0;
    setState(initial(url));
    if (!url) return undefined;
    const load = (force = false) => {
      const id = ++request;
      getJson(url, { force }).then(
        (data) => { if (alive && id === request) setState({ url, data, error: null, loading: false, at: new Date() }); },
        (error) => { if (alive && id === request) setState({ url, data: null, error, loading: false, at: null }); },
      );
    };
    // 최초 조회는 숨겨진 탭에서도 수행한다. 정기 갱신만 가시성에 따라 멈춘다.
    if (peekJson(url) === undefined) load();
    const visible = () => typeof document === 'undefined' || !document.hidden;
    const resume = () => { if (visible() && peekJson(url) === undefined) load(); };
    const onLive = () => { if (peekJson(url) === undefined) load(true); };
    const timer = interval ? setInterval(() => { if (visible()) load(true); }, interval) : null;
    globalThis.window?.addEventListener(LIVE_EVENT, onLive);
    globalThis.window?.addEventListener('focus', resume);
    globalThis.document?.addEventListener('visibilitychange', resume);
    return () => {
      alive = false;
      if (timer) clearInterval(timer);
      globalThis.window?.removeEventListener(LIVE_EVENT, onLive);
      globalThis.window?.removeEventListener('focus', resume);
      globalThis.document?.removeEventListener('visibilitychange', resume);
    };
  }, [url, interval]);
  // effect가 실행되기 전 렌더에서도 다른 주소의 응답을 노출하지 않는다.
  return state.url === url ? state : initial(url);
}
