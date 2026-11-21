'use client';
// 브라우저에서만 그리는 상자. 날짜·localStorage·실시간 값에 따라 내용이 바뀌는 1탄 화면은
// 서버(빌드 시점)와 브라우저 결과가 달라질 수 있어 원래처럼 브라우저에서만 그린다.
// fallback을 주면 서버 HTML에는 그 내용이 들어가고(검색엔진이 읽는 본문), 브라우저가 붙으면 children으로 바뀐다.
import { useSyncExternalStore } from 'react';

const noop = () => () => {};
/** @param {{ children: import('react').ReactNode, fallback?: import('react').ReactNode }} props */
export default function ClientOnly({ children, fallback = null }) {
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  return mounted ? children : fallback;
}
