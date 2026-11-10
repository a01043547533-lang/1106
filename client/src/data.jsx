// 경로별 응답에도 동일한 갱신·오류·주소 전환 처리를 적용한다.
import { createContext, useContext } from 'react';
import { useApi } from './lib/use-api.js';
export const DataContext = createContext({ path: null, data: {}, meta: {} });
export function useMeta() { return useContext(DataContext).meta || {}; }
export function useRouteData(key, url, pick = (r) => r) {
  const state = useApi(url);
  return { ...state, value: state.data == null ? undefined : pick(state.data) };
}
