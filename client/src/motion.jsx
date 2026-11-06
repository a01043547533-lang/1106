import { useContext, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { DataContext } from './data.jsx';

const allowed = () => !matchMedia('(prefers-reduced-motion: reduce)').matches;
export function useClientData(key) {
  const initial = useContext(DataContext);
  const { pathname } = useLocation();
  return !(initial.path === pathname && key in (initial.data || {}));
}

// SSR and the first client render always contain the completed value.
export function CountNumber({ value, decimals = 0, animate = false }) {
  const [run, setRun] = useState(false);
  useEffect(() => { if (animate && allowed()) setRun(true); }, [animate]);
  if (value == null) return '-';
  return <span className={run ? 'count-number counting' : 'count-number'} style={{ '--target': Math.round(Number(value) * 10 ** decimals) }}>
    <span className="count-final">{Number(value).toFixed(decimals)}</span>
    {run && <span aria-hidden="true" className={`count-visual ${decimals ? 'decimal' : ''}`} />}
  </span>;
}

export function useReveal(ref, dependency) {
  useEffect(() => {
    if (!ref.current || !allowed()) return undefined;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(({ target, isIntersecting }) => {
        if (isIntersecting) {
          target.classList.remove('reveal-ready');
          target.classList.add('reveal-played');
          observer.unobserve(target);
        }
      });
    }, { threshold: 0.1 });
    const targets = ref.current.querySelectorAll('.steps:not(.reveal-played), .chart .line:not(.reveal-played)');
    targets.forEach((el) => { el.classList.add('reveal-ready'); observer.observe(el); });
    return () => { observer.disconnect(); targets.forEach((el) => el.classList.remove('reveal-ready')); };
  }, [ref, dependency]);
}

export function useHomeMotion(ref) {
  useEffect(() => {
    const root = ref.current;
    if (allowed()) root.querySelector('h1')?.classList.add('kinetic-play');
    const move = (e) => {
      if (!allowed() || !matchMedia('(hover:hover) and (pointer:fine)').matches) return;
      const hero = e.target.closest('.home-hero');
      if (!hero) return;
      const box = hero.getBoundingClientRect();
      const clamp = (value) => Math.max(-8, Math.min(8, value));
      hero.style.setProperty('--paper-x', `${clamp((e.clientX - box.left - box.width / 2) / box.width * 16)}px`);
      hero.style.setProperty('--paper-y', `${clamp((e.clientY - box.top - box.height / 2) / box.height * 16)}px`);
    };
    const leave = (e) => {
      const hero = e.target.closest('.home-hero');
      if (hero && !hero.contains(e.relatedTarget)) { hero.style.removeProperty('--paper-x'); hero.style.removeProperty('--paper-y'); }
    };
    root.addEventListener('pointermove', move); root.addEventListener('pointerout', leave);
    return () => { root.removeEventListener('pointermove', move); root.removeEventListener('pointerout', leave); };
  }, [ref]);
}

export function useRowMotion(ref, filter) {
  const previous = useRef(filter);
  useEffect(() => {
    if (previous.current === filter) return;
    previous.current = filter;
    if (!allowed()) return;
    const rows = ref.current?.querySelectorAll('tbody tr') || [];
    rows.forEach((row, i) => { row.classList.remove('row-enter'); row.style.setProperty('--row-delay', `${i * 30}ms`); });
    if (rows.length) void rows[0].offsetHeight;
    rows.forEach((row) => row.classList.add('row-enter'));
  }, [filter, ref]);
}

export function HoverSummary({ targetRef, rows }) {
  const [tip, setTip] = useState(null);
  useEffect(() => {
    const root = targetRef.current;
    const media = matchMedia('(hover:hover) and (pointer:fine)');
    let timer; let active; let latest;
    const leave = () => { clearTimeout(timer); active = null; setTip(null); };
    const move = (e) => {
      if (!media.matches || !allowed()) return;
      const row = e.target.closest('tr[data-summary]');
      if (!row) { leave(); return; }
      latest = { data: rows[Number(row.dataset.summary)], x: Math.max(8, Math.min(e.clientX + 16, innerWidth - 230)), y: Math.max(8, Math.min(e.clientY + 16, innerHeight - 150)) };
      if (active === row) { setTip((old) => old ? latest : old); return; }
      leave(); active = row;
      timer = setTimeout(() => setTip(latest), 80);
    };
    root?.addEventListener('pointermove', move); root?.addEventListener('pointerleave', leave);
    media.addEventListener('change', leave);
    return () => { leave(); root?.removeEventListener('pointermove', move); root?.removeEventListener('pointerleave', leave); media.removeEventListener('change', leave); };
  }, [targetRef, rows]);
  return tip && <aside aria-hidden="true" className="hover-summary" style={{ left: tip.x, top: tip.y }}><b>{tip.data.mosName}</b><div>모집 {tip.data.quota} / 접수 {tip.data.applicants}</div><div>입영월 {tip.data.enlistMonth}</div></aside>;
}
