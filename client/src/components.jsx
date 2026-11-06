import { CountNumber } from './motion.jsx';
// 여러 화면이 함께 쓰는 작은 부품들. 외부 UI 라이브러리 없이 만든다.
import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { MMA_APPLY_URL, MMA_PLANS_URL, MMA_PORTAL_URL } from './lib/official.js';

export const n = (it) => it?._norm || it || {};
export const fmtRate = (r) => (r === null || r === undefined ? '-' : Number(r).toFixed(2));
export const formatKst = (value) => value && Number.isFinite(Date.parse(value))
  ? `${new Date(Date.parse(value) + 9 * 3600000).toISOString().slice(0, 19).replace('T', ' ')} KST` : '기록 없음';
export const monthLabel = (m) => (!m || m === '*' ? '입영월 미정' : m.replace('-', '년 ') + '월');

// 클라이언트에서만 부르는 API (SSR 데이터가 없는 화면용)
export function useApi(url, { interval = 0 } = {}) {
  const [state, setState] = useState({ data: null, error: null, loading: Boolean(url), at: null });
  useEffect(() => {
    if (!url) { setState({ data: null, error: null, loading: false, at: null }); return undefined; }
    let alive = true;
    const load = () => {
      if (typeof document !== 'undefined' && document.hidden) return; // 탭이 가려져 있으면 갱신을 멈춘다
      fetch(url)
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
        .then((data) => alive && setState({ data, error: null, loading: false, at: new Date() }))
        .catch((error) => alive && setState((s) => ({ ...s, error, loading: false })));
    };
    setState((s) => ({ ...s, loading: true }));
    load();
    const id = interval ? setInterval(load, interval) : null;
    return () => { alive = false; if (id) clearInterval(id); };
  }, [url, interval]);
  return state;
}

export function Status({ state, empty }) {
  if (state.loading) return <p className="feedback loading" role="status">{state.value || state.data ? '선택한 조건으로 갱신 중이에요…' : '불러오는 중이에요…'}</p>;
  if (state.error) return <p className="feedback error" role="alert">지금은 불러올 수 없어요. 잠시 후 다시 확인해 주세요.</p>;
  if (empty) return <p className="feedback empty" role="status">{empty}</p>;
  return null;
}

// 광고 심사 통과 후 실제 스크립트/광고 단위를 교체할 위치: AdSlot 한 곳.
const DEMO_ADS = [
  { id: 'prepare', brand: 'FIRST PACK', title: '첫날의 짐을 가볍게.', copy: '입대 준비물 키트', action: '광고 예시 보기', to: '/ads' },
  { id: 'plan', brand: 'ZERO HOUR', title: '새로운 일상, 같은 페이스.', copy: '데일리 디지털 워치', action: '광고 예시 보기', to: '/ads' },
  { id: 'find', brand: 'NEXT CLASS', title: '자격증 공부, 한 강씩.', copy: '온라인 자격증 클래스', action: '인강 광고 예시 보기', to: '/ads' },
];
function AdArtwork({ kind }) {
  return <svg viewBox="0 0 240 170" className="ad-art" aria-hidden="true" focusable="false">
    <ellipse cx="122" cy="151" rx="76" ry="9" fill="#000" opacity=".14" />
    {kind === 'prepare' ? <g>
      <rect x="46" y="59" width="140" height="89" rx="14" fill="#b7bd9a" stroke="#555e42" strokeWidth="2" />
      <path d="M87 59V45q29-18 58 0v14" fill="none" stroke="#555e42" strokeWidth="9" />
      <path d="M48 82h136" stroke="#f8f3df" strokeWidth="3" />
      <rect x="60" y="98" width="56" height="31" rx="3" fill="#f4eed9" />
      <path d="M70 109h34m-34 9h22" stroke="#66704f" strokeWidth="3" />
      <rect x="159" y="79" width="39" height="71" rx="8" fill="#f7f4e8" stroke="#c5c4b4" />
      <rect x="168" y="69" width="21" height="13" rx="3" fill="#263c30" />
      <path d="M171 104h15m-15 7h15" stroke="#7e9479" strokeWidth="3" />
    </g> : kind === 'plan' ? <g transform="rotate(16 120 85)">
      <rect x="91" y="3" width="58" height="163" rx="17" fill="#2e3436" />
      <path d="M100 16h40m-40 10h40m-40 119h40m-40 10h40" stroke="#171d1f" strokeWidth="4" />
      <rect x="76" y="42" width="88" height="86" rx="23" fill="#181f22" stroke="#4e595c" strokeWidth="3" />
      <rect x="86" y="58" width="68" height="48" rx="8" fill="#b9c8b1" />
      <path d="M97 71h13v9H97v10h13m11-19h13v19h-13Zm-6 7v2m0 5v2m24-16h6m-6 19h6" fill="none" stroke="#283a31" strokeWidth="3" />
      <circle cx="109" cy="116" r="3" fill="#687772" /><circle cx="131" cy="116" r="3" fill="#687772" />
    </g> : <g>
      <rect x="44" y="25" width="150" height="108" rx="8" fill="#25313d" stroke="#8fabc1" strokeWidth="3" />
      <rect x="52" y="33" width="134" height="91" rx="3" fill="#fff5d8" />
      <rect x="62" y="45" width="64" height="67" rx="5" fill="#f5bc4c" />
      <circle cx="94" cy="78" r="19" fill="#233f77" /><path d="m89 68 15 10-15 10Z" fill="#fff5d8" />
      <path d="M136 53h39m-39 12h32m-32 12h39m-39 12h22" stroke="#9da78b" strokeWidth="4" />
      <path d="M44 133h150l19 15H25Z" fill="#b8c7d0" /><path d="M95 133h47l-4 5h-39Z" fill="#6c8496" />
    </g>}
  </svg>;
}
export function AdSlot({ size = '320x100' }) {
  const [w, h] = size.split('x').map(Number);
  return <section className="ad-gallery" aria-label="가상 광고 예시 3개">
    {DEMO_ADS.map(ad => <aside key={ad.id} className={`ad-slot demo-ad ad-${ad.id}${h >= 250 ? ' demo-ad-tall' : ''}`} style={{ maxWidth: w, minHeight: h }} aria-label={`${ad.brand} 가상 광고`}>
      <div className="ad-topline"><span className="ad-brand">{ad.brand}</span><span className="demo-ad-label">가상 광고</span></div>
      <Link to={ad.to} className="ad-creative">
        <div className="ad-copy"><span>{ad.copy}</span><strong>{ad.title}</strong></div>
        <AdArtwork kind={ad.id} />
        <span className="ad-bottom"><span className="ad-disclaimer">가상 브랜드 · 판매하지 않음</span><span className="ad-cta">{ad.action} <span aria-hidden="true">↗</span></span></span>
      </Link>
    </aside>)}
  </section>;
}

export function CertificateResources() {
  return <section className="doc-section certificate-helper" aria-labelledby="certificate-title">
    <div className="certificate-intro"><h2 id="certificate-title">자격증 준비 도우미</h2><p>필요한 시험과 접수 일정은 공식 사이트에서 확인하세요. <Link to="/score">내 자격의 배점 확인 →</Link></p></div>
    <div className="certificate-links">
      <a href="https://www.q-net.or.kr/" target="_blank" rel="noopener noreferrer"><span><strong>Q-Net</strong><small>국가자격 종목 · 시험 일정 · 응시 안내</small></span><span aria-hidden="true">↗</span></a>
      <a href="https://license.korcham.net/" target="_blank" rel="noopener noreferrer"><span><strong>대한상공회의소 자격평가사업단</strong><small>컴퓨터활용능력 · 워드프로세서 등</small></span><span aria-hidden="true">↗</span></a>
      <p>지원 자격·배점 인정 여부는 특기별 모집공고를 확인하세요.</p>
    </div>
  </section>;
}

export function RateBar({ rate, countUp = false }) {
  if (rate === null || rate === undefined) return <span className="muted">-</span>;
  const cls = rate < 1 ? 'low' : rate >= 3 ? 'high' : 'mid';
  const label = rate < 1 ? '미달' : rate >= 3 ? '붐빔' : null;
  return (
    <span className="ratebar-wrap">
      <span className={`ratebar ${cls}`} aria-hidden="true"><span style={{ width: `${Math.min(rate / 3, 1) * 100}%` }} /></span>
      <b><CountNumber value={rate} decimals={2} animate={countUp} /></b>
      {label && <span className={`badge ${cls === 'low' ? 'green' : 'red'}`}>{label}</span>}
    </span>
  );
}

export function BranchBadge({ branch }) {
  return <span className={`branch b-${branch || '기타'}`}>{branch || '기타'}</span>;
}

export function OfficialApplyLink({ compact = false, mosName, children }) {
  return <a href={MMA_APPLY_URL} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer"
    className={`official-apply${compact ? ' compact' : ''}`}
    aria-label={`${mosName ? `${mosName} · ` : ''}병무청 지원서 작성 (새 창)`}>
    {children || (compact ? '공식 지원 ↗' : '병무청에서 지원서 작성 ↗')}
  </a>;
}

export function OfficialApplyGuide({ specialty, snapshot }) {
  return <section className="card official-apply-guide" id="official-apply" aria-label="병무청 공식 지원 안내">
    <h2>{specialty ? `${specialty.mosName} 지원하기` : '원하는 특기를 찾았다면, 병무청에서 지원하세요'}</h2>
    {specialty && <div className="apply-selection">
      <b>{[specialty.branch, specialty.category, specialty.mosName].filter(Boolean).join(' · ')}</b>
      <span>특기코드 {specialty.mosCode}</span>
      {snapshot && <span>{snapshot.roundLabel && `${snapshot.roundLabel}회차 · `}{monthLabel(snapshot.enlistMonth)}{snapshot.unit && ` · ${snapshot.unit}`}</span>}
      {snapshot?.applyStart && snapshot?.applyEnd && <span>조회한 회차의 접수기간: {snapshot.applyStart} ~ {snapshot.applyEnd}</span>}
    </div>}
    <ol className="apply-steps">
      <li>병무청 <b>군지원 → 통합지원서 작성</b>을 선택해요.</li>
      <li>본인인증 후 지원할 군·모집분야·특기를 선택해요.</li>
      <li>지원서를 제출한 뒤 병무청에서 접수 결과를 확인해요.</li>
    </ol>
    <div className="apply-actions">
      <OfficialApplyLink mosName={specialty?.mosName} />
      <a href={MMA_PLANS_URL} target="_blank" rel="noopener noreferrer">공식 모집계획 확인 ↗</a>
    </div>
    <p className="muted small">새 창에서 병무청으로 이동해요. 실제 접수기간과 지원 자격은 병무청 화면에서 확인하고, 본인인증과 최종 제출도 그곳에서 진행해 주세요.</p>
    <p className="muted small">지원 메뉴가 바로 열리지 않으면 <a href={MMA_PORTAL_URL} target="_blank" rel="noopener noreferrer">병무민원포털 홈</a>에서 군지원 메뉴로 들어가세요.</p>
  </section>;
}

// 제도 안내 접었다 펴는 박스 (rules.json의 id 목록)
export function RulesBox({ title, ids }) {
  const rules = useApi('/api/rules');
  const items = (rules.data?.items || []).filter((r) => ids.includes(r.id));
  if (!items.length) return null;
  return (
    <details className="rules">
      <summary>{title}</summary>
      <ul>
        {items.map((r) => (
          <li key={r.id}>
            {r.text} {!r.verified && <span className="badge gray">공고 확인 필요</span>}
            {r.sourceUrl && <> <a href={r.sourceUrl} target="_blank" rel="noreferrer">출처</a></>}
          </li>
        ))}
      </ul>
    </details>
  );
}

// API가 제공하는 이름 그대로 선택해 기존 검색·배점 요청에 전달한다.
export function MultiPicker({ value, onChange, placeholder = '자격증·면허·전공 이름' }) {
  const all = useApi('/api/eligible-items');
  const inputId = useId();
  const [q, setQ] = useState('');
  const [limit, setLimit] = useState(20);
  const list = all.data?.items || [];
  const hits = q.trim() ? list.filter(x => x.includes(q.trim())) : list;
  const toggle = name => onChange(value.includes(name) ? value.filter(x => x !== name) : [...value, name]);
  return <div className="picker">
    <p className="picker-help">목록에서 선택하거나 이름으로 검색하세요. 여러 개 선택할 수 있어요.</p>
    <label htmlFor={inputId}>자격·면허·전공 검색</label>
    <input id={inputId} value={q} onChange={e => { setQ(e.target.value); setLimit(20); }} placeholder={all.loading ? '목록을 불러오는 중…' : placeholder} disabled={all.loading} />
    {value.length > 0 && <div className="picker-selected"><span className="small">선택한 항목 {value.length}개</span><div className="chips">
      {value.map(v => <button type="button" key={v} className="chip on" aria-label={v + ' 선택 해제'} onClick={() => toggle(v)}>{v} <span aria-hidden="true">×</span></button>)}
    </div></div>}
    {all.loading ? <p className="feedback loading" role="status">선택 목록을 불러오는 중이에요…</p> : all.error ? <p className="feedback error" role="alert">목록을 불러오지 못했어요. 잠시 후 페이지를 새로고침해 주세요.</p> : !list.length ? <p className="feedback empty" role="status">선택 가능한 자격 정보를 준비 중이에요.</p> : <>
      <fieldset className="picker-options"><legend>{q.trim() ? '검색 결과' : '선택 가능한 항목'} · {hits.length.toLocaleString()}개</legend>
        {hits.length ? <div className="picker-option-grid">{hits.slice(0, limit).map(name => <label key={name} className={value.includes(name) ? 'selected' : ''}>
          <input type="checkbox" checked={value.includes(name)} onChange={() => toggle(name)} /><span>{name}</span>
        </label>)}</div> : <p className="muted" role="status">일치하는 항목이 없어요. 다른 이름으로 검색해 주세요.</p>}
      </fieldset>
      {hits.length > limit && <button type="button" className="picker-more" onClick={() => setLimit(n => n + 20)}>항목 더 보기 ({Math.min(limit, hits.length)} / {hits.length.toLocaleString()})</button>}
    </>}
  </div>;
}

// 알림 신청 폼
export function SubscribeForm() {
  return <div className="subscription-unavailable"><p>과제 배포에서는 이메일 알림을 제공하지 않아요. 이메일 주소는 수집하지 않습니다.</p><Link to="/calendar">모집 일정 확인하기 →</Link><p className="muted small"><Link to="/privacy">개인정보처리방침</Link></p></div>;
}

export function dday(date) {
  if (!date) return null;
  const d = Math.ceil((new Date(date.slice(0, 10)) - new Date(new Date().toISOString().slice(0, 10))) / 86400000);
  if (d > 0) return `D-${d}`;
  if (d === 0) return 'D-day';
  return null;
}

export function addMonths(ym, months) {
  const [y, m] = ym.split('-').map(Number);
  const t = y * 12 + (m - 1) + months;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`;
}
