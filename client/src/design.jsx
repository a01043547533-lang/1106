import { useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

export function PageHeading({ title, description, eyebrow }) {
  return <div className="page-heading">{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1 tabIndex={-1}>{title}</h1>{description && <p className="lead">{description}</p>}</div>;
}

// Presentation only. Existing routes, requests and page state stay with each page.
export function RouteExperience() {
  const location = useLocation();
  const navigation = useNavigationType();
  const previous = useRef(null);
  const positions = useRef(new Map());
  useEffect(() => {
    const main = document.getElementById('main-content');
    const title = main?.querySelector('h1');
    const siteUrl = (import.meta.env.VITE_SITE_URL || window.location.origin).replace(/\/$/, '');
    const setMeta = (tag, keyAttr, keyValue, attr, value) => {
      let el = document.head.querySelector(`${tag}[${keyAttr}="${keyValue}"]`);
      if (!el) { el = document.createElement(tag); el.setAttribute(keyAttr, keyValue); document.head.appendChild(el); }
      el.setAttribute(attr, value);
    };
    const updateTitle = () => {
      const h1 = main?.querySelector('h1')?.textContent?.trim();
      const home = location.pathname === '/';
      const title = home ? '입대타이밍 · 모집병 지원률과 모집 일정' : `${h1 || '페이지 안내'} | 입대타이밍`;
      const lead = main?.querySelector('.page-heading .lead, .hero-lead, article p.lead')?.textContent?.trim();
      const description = (lead || '병무청 공공데이터로 모집병 접수현황, 지원률, 특기별 지원 조건, 모집 일정을 확인하세요.').slice(0, 160);
      const br = location.pathname.startsWith('/mos/') ? new URLSearchParams(location.search).get('branch') : null;
      const canonical = siteUrl + (home ? '/' : location.pathname.replace(/\/$/, '')) + (br ? `?branch=${encodeURIComponent(br)}` : '');
      const noindex = /^\/(status|contact)$/.test(location.pathname) || Boolean(h1 && h1.includes('찾을 수 없어요'));
      document.title = title;
      setMeta('meta', 'name', 'description', 'content', description);
      setMeta('link', 'rel', 'canonical', 'href', canonical);
      setMeta('meta', 'property', 'og:title', 'content', title);
      setMeta('meta', 'property', 'og:description', 'content', description);
      setMeta('meta', 'property', 'og:url', 'content', canonical);
      setMeta('meta', 'name', 'robots', 'content', noindex ? 'noindex, follow' : 'index, follow');
    };
    updateTitle();
    const observer = new MutationObserver(updateTitle);
    if (main) observer.observe(main, { childList: true, subtree: true, characterData: true });
    if (previous.current && previous.current !== location.key) {
      if (title) { title.tabIndex = -1; title.focus({ preventScroll: true }); }
      window.scrollTo(0, navigation === 'POP' ? positions.current.get(location.key) || 0 : 0);
    }
    previous.current = location.key;
    const remember = () => positions.current.set(location.key, window.scrollY);
    window.addEventListener('scroll', remember, { passive: true });
    return () => { observer.disconnect(); window.removeEventListener('scroll', remember); };
  }, [location.key, location.pathname, location.search, navigation]);
  return null;
}
