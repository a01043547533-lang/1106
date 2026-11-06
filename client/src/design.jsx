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
    const updateTitle = () => { document.title = `${main?.querySelector('h1')?.textContent || '페이지 안내'} | 입대타이밍`; };
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
  }, [location.key, location.pathname, navigation]);
  return null;
}
