// 라우트별 SSR 데이터 로더. 자기 /api/* 를 HTTP로 다시 부르지 않고 queries를 직접 쓴다.
import * as q from './queries.js';
import { operationStatus } from './repo/index.js';

// 화면에 있는 라우트. 여기에 없는 경로는 404로 내려준다.
export const STATIC_ROUTES = ['/', '/now', '/mos', '/calendar', '/find', '/plan', '/score', '/alerts', '/prepare', '/social', '/privacy', '/terms', '/ads', '/status'];

export function loadRoute(pathname) {
  const meta = q.meta();
  if (pathname === '/status') return { status: 200, meta, data: { health: operationStatus() } };
  if (pathname === '/') {
    return { status: 200, meta, data: { now: q.nowList().items.slice(0, 5), stats: q.stats(), calendar: q.calendarList().items.slice(0, 3) } };
  }
  if (pathname === '/now') return { status: 200, meta, data: { now: q.nowList().items } };
  if (pathname === '/mos') return { status: 200, meta, data: { mosIndex: q.mosIndex() } };
  if (pathname === '/calendar') return { status: 200, meta, data: { calendar: q.calendarList().items } };

  const m = pathname.match(/^\/mos\/([^/]+)$/);
  if (m) {
    const code = decodeURIComponent(m[1]);
    const detail = q.mosDetail(code);
    return detail ? { status: 200, meta, data: { mos: detail } } : { status: 404, meta, data: { notFound: true } };
  }
  if (STATIC_ROUTES.includes(pathname)) return { status: 200, meta, data: {} };
  return { status: 404, meta, data: { notFound: true } };
}
