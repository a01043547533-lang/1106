// SSR로 내려온 첫 데이터를 화면과 공유한다.
// 첫 화면은 서버가 준 데이터를 그대로 쓰고(다시 부르지 않음), 다른 페이지로 이동하면 /api에서 가져온다.
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
