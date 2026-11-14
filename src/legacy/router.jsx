'use client';
// react-router-dom → Next.js 연결. 1탄 화면 코드는 그대로 두고 이 파일만 바꿔 끼운다.
import { forwardRef, useEffect, useMemo } from 'react';
import NextLink from 'next/link';
import {
  useParams as useNextParams,
  usePathname,
  useRouter,
  useSearchParams as useNextSearchParams,
} from 'next/navigation';

function toHref(to) {
  if (to == null) return '/';
  if (typeof to === 'string') return to;
  const { pathname = '', search = '', hash = '' } = to;
  const s = search && !search.startsWith('?') ? `?${search}` : search;
  const h = hash && !hash.startsWith('#') ? `#${hash}` : hash;
  return `${pathname}${s}${h}` || '/';
}

// 1탄은 미리 불러오기가 없던 SPA라 기본값을 끈다(특기 목록 수백 개 링크가 화면에 보일 때마다 서버를 부르지 않게).
export const Link = forwardRef(function Link({ to, replace, state: _state, reloadDocument, prefetch = false, ...rest }, ref) {
  void _state;
  const href = toHref(to);
  if (reloadDocument) return <a ref={ref} href={href} {...rest} />;
  return <NextLink ref={ref} href={href} replace={replace} prefetch={prefetch} {...rest} />;
});

function isActive(pathname, href, end) {
  const path = href.split(/[?#]/)[0] || '/';
  if (path === '/' || end) return pathname === path;
  return pathname === path || pathname.startsWith(path + '/');
}

export const NavLink = forwardRef(function NavLink({ to, end, className, style, children, ...rest }, ref) {
  const pathname = usePathname() || '/';
  const href = toHref(to);
  const active = isActive(pathname, href, end);
  const cls = typeof className === 'function' ? className({ isActive: active, isPending: false }) : [className, active ? 'active' : ''].filter(Boolean).join(' ');
  const st = typeof style === 'function' ? style({ isActive: active, isPending: false }) : style;
  const kids = typeof children === 'function' ? children({ isActive: active, isPending: false }) : children;
  return (
    <Link ref={ref} to={href} className={cls || undefined} style={st} aria-current={active ? 'page' : undefined} {...rest}>
      {kids}
    </Link>
  );
});

export function Navigate({ to, replace = false }) {
  const router = useRouter();
  const href = toHref(to);
  useEffect(() => {
    if (replace) router.replace(href);
    else router.push(href);
  }, [router, href, replace]);
  return null;
}

export function useNavigate() {
  const router = useRouter();
  return useMemo(
    () => (to, opts = {}) => {
      if (typeof to === 'number') {
        if (to < 0) router.back();
        else router.forward();
        return;
      }
      const href = toHref(to);
      if (opts.replace) router.replace(href);
      else router.push(href);
    },
    [router],
  );
}

export function useLocation() {
  const pathname = usePathname() || '/';
  // 쿼리는 구독하지 않는다: useSearchParams를 쓰면 공통 틀 전체가 서버에서 안 그려지고,
  // 계산기가 주소를 바꿀 때마다(replaceState) 화면이 맨 위로 튄다. 쿼리가 필요한 화면은 useSearchParams를 쓴다.
  const search = typeof window !== 'undefined' ? window.location.search : '';
  // react-router의 location.key 대신 경로로 만든 키 (스크롤 위치 기억용)
  return { pathname, search, hash: '', state: null, key: pathname };
}

// 뒤로/앞으로 가기(popstate)로 바뀐 주소면 POP, 링크·코드 이동이면 PUSH. 처음 열었을 때는 POP(react-router와 같음).
const nav = { pop: true };
if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    nav.pop = true;
  });
  // 링크를 누르면 PUSH (해시 링크 뒤로가기 뒤에 POP 표시가 남는 것 방지)
  document.addEventListener('click', (e) => {
    if (e.target instanceof Element && e.target.closest('a[href]')) nav.pop = false;
  }, true);
}
export function useNavigationType() {
  const loc = useLocation();
  // 주소가 바뀐 그 렌더에서 한 번 읽고, 커밋 뒤에 표시를 지운다.
  const type = useMemo(() => (loc.key && nav.pop ? 'POP' : 'PUSH'), [loc.key]);
  useEffect(() => {
    nav.pop = false;
  }, [loc.key]);
  return type;
}

export function useParams() {
  const p = useNextParams() || {};
  const out = {};
  for (const [k, v] of Object.entries(p)) out[k] = Array.isArray(v) ? v.join('/') : decodeURIComponent(String(v));
  return out;
}

export function useSearchParams() {
  const sp = useNextSearchParams();
  const router = useRouter();
  const pathname = usePathname() || '/';
  const params = useMemo(() => new URLSearchParams(sp ? sp.toString() : ''), [sp]);
  const setParams = useMemo(
    () => (next, opts = {}) => {
      const value = typeof next === 'function' ? next(new URLSearchParams(params)) : next;
      const q = value instanceof URLSearchParams ? value : new URLSearchParams(value || {});
      const s = q.toString();
      const href = s ? `${pathname}?${s}` : pathname;
      if (opts.replace) router.replace(href, { scroll: false });
      else router.push(href, { scroll: false });
    },
    [params, pathname, router],
  );
  return [params, setParams];
}
