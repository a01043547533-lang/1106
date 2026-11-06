import { CountNumber } from './motion.jsx';
// 여러 화면이 함께 쓰는 작은 부품들. 외부 UI 라이브러리 없이 만든다.
import { useEffect, useState } from 'react';
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
  if (state.loading && !state.value && !state.data) return <p className="muted">불러오는 중이에요…</p>;
  if (state.error) return <p className="muted">지금은 불러올 수 없어요</p>;
  if (empty) return <p className="muted">{empty}</p>;
  return null;
}

// 광고 자리표시. 실제 광고 코드는 심사 통과 뒤 이 컴포넌트 한 곳에서만 갈아끼운다.
export function AdSlot({ size = '320x100' }) {
  // [광고 심사 통과 후 삽입 위치] 광고 스크립트/광고 단위는 이 함수 안에서만 교체한다.
  const [w, h] = size.split('x').map(Number);
  return (
    <aside className={`ad-slot demo-ad${h >= 250 ? ' demo-ad-tall' : ''}`} style={{ maxWidth: w, minHeight: h }} aria-label="가상 광고 예시">
      <div className="demo-ad-label">가상 광고 · 준비노트</div>
      <div className="demo-ad-body"><span className="demo-ad-icon" aria-hidden="true">✓</span><div><strong>입대 준비, 하나씩 체크!</strong><span>준비물부터 당일 일정까지</span></div></div>
      {h >= 250 && <p>놓치기 쉬운 준비물을<br />체크리스트로 확인해 보세요.</p>}
      <Link to="/prepare">입대 준비 안내 보기 →</Link>
    </aside>
  );
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

// 여러 개 골라 담는 자동완성 입력 (자격·면허·전공)
export function MultiPicker({ value, onChange, placeholder = '자격증·면허·전공 이름' }) {
  const all = useApi('/api/eligible-items');
  const [q, setQ] = useState('');
  const list = all.data?.items || [];
  const hits = q.trim() ? list.filter((x) => x.includes(q.trim()) && !value.includes(x)).slice(0, 8) : [];
  return (
    <div className="picker">
      <div className="chips">
        {value.map((v) => (
          <button type="button" key={v} className="chip on" onClick={() => onChange(value.filter((x) => x !== v))}>{v} ✕</button>
        ))}
      </div>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={all.loading ? '목록을 불러오는 중…' : placeholder} aria-label={placeholder} />
      {hits.length > 0 && (
        <ul className="suggest" role="listbox">
          {hits.map((h) => <li key={h}><button type="button" onClick={() => { onChange([...value, h]); setQ(''); }}>{h}</button></li>)}
        </ul>
      )}
      {!all.loading && !list.length && <p className="muted small">자격 목록을 모으는 중이에요(지원가능 정보 수집 후 채워져요)</p>}
    </div>
  );
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
