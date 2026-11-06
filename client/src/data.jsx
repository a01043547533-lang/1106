// React 화면에서 같은 출처의 서버 API를 조회한다. 병무청 인증키는 전달받지 않는다.
import { createContext, useContext, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

export const DataContext = createContext({ path: null, data: {}, meta: {} });

export function useMeta() {
  return useContext(DataContext).meta || {};
}

// key: SSR data 안의 이름 / url: 클라이언트 이동 시 부를 API / pick: API 응답에서 값 꺼내기
export function useRouteData(key, url, pick = (r) => r) {
  const initial = useContext(DataContext);
  const { pathname } = useLocation();
  const fromServer = initial.path === pathname && initial.data && key in initial.data;
  const [state, setState] = useState(() => ({ value: fromServer ? initial.data[key] : undefined, error: null, loading: !fromServer }));

  useEffect(() => {
    if (fromServer && state.value !== undefined) return undefined; // SSR 값 그대로
    let alive = true;
    setState((s) => ({ ...s, loading: true }));
    fetch(url)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((r) => alive && setState({ value: pick(r), error: null, loading: false }))
      .catch((error) => alive && setState({ value: undefined, error, loading: false }));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  return state;
}
