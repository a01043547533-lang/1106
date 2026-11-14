import { CountNumber } from './motion.jsx';
// 여러 화면이 함께 쓰는 작은 부품들. 외부 UI 라이브러리 없이 만든다.
import { useEffect, useId, useState } from 'react';
import { Link } from '@/legacy/router.jsx';
import { MMA_APPLY_URL, MMA_PLANS_URL, MMA_PORTAL_URL } from './lib/official.js';
import { downloadIcs, googleCalendarUrl } from './lib/ics.js';
import { useApi } from './lib/use-api.js';
export { useApi };
export { dday } from '../../shared/dates.js';

export const n = (it) => it?._norm || it || {};
// 특기 주소. 특기 코드는 군마다 따로 매겨져 같은 코드가 여러 군에 있으므로 군을 함께 넘긴다.
// 군이 하나뿐인 코드면 상세 화면이 주소에서 군을 지워 대표 주소(/mos/코드)로 맞춘다.
export const mosHref = (code, branch) => `/mos/${encodeURIComponent(code)}${branch ? `?branch=${encodeURIComponent(branch === '해병' ? '해병대' : branch)}` : ''}`;
export const calcHref = (code, branch) => `/calc?${new URLSearchParams({ mos: code, ...(branch ? { branch } : {}) })}`;
// 비교함 키: '코드@군' (예전에 저장된 '코드'만 있는 값도 그대로 읽는다)
export const compareKey = (code, branch) => (branch ? `${code}@${branch}` : code);
export const parseCompareKey = (key) => { const i = String(key).lastIndexOf('@'); return i > 0 ? { code: key.slice(0, i), branch: key.slice(i + 1) } : { code: key, branch: null }; };
export const fmtRate = (r) => (r === null || r === undefined ? '-' : Number(r).toFixed(2));
export const formatKst = (value) => value && Number.isFinite(Date.parse(value))
  ? `${new Date(Date.parse(value) + 9 * 3600000).toISOString().slice(0, 19).replace('T', ' ')} KST` : '기록 없음';
export const monthLabel = (m) => (!m || m === '*' ? '입영월 미정' : m.replace('-', '년 ') + '월');

// 입력값이 잠시 멈춘 뒤에만 바뀌는 값(검색 요청을 줄인다)
export function useDebounced(value, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => { const id = setTimeout(() => setV(value), ms); return () => clearTimeout(id); }, [value, ms]);
  return v;
}

export function Status({ state, empty }) {
  if (state.loading) return <p className="feedback loading" role="status">{state.value || state.data ? '선택한 조건으로 갱신 중이에요…' : '불러오는 중이에요…'}</p>;
  if (state.error) return <p className="feedback error" role="alert">지금은 불러올 수 없어요. 잠시 후 다시 확인해 주세요.</p>;
  if (empty) return <p className="feedback empty" role="status">{empty}</p>;
  return null;
}

// 마감 카운트다운 (홈·마감 임박 보드 공용)
export function Countdown({ to }) {
  const [now, setNow] = useState(null);
  useEffect(() => { setNow(Date.now()); const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  const end = new Date(to.length === 10 ? `${to}T23:59:59+09:00` : to).getTime();
  if (now === null) return <span>{to.slice(0, 10)} 마감</span>; // 서버 렌더에서는 날짜만
  const left = Math.max(0, end - now);
  const d = Math.floor(left / 86400000); const h = Math.floor((left % 86400000) / 3600000);
  const m = Math.floor((left % 3600000) / 60000); const s = Math.floor((left % 60000) / 1000);
  return <span className={left > 0 && left < 86400000 ? 'urgent countdown' : 'countdown'}>{d}일 {h}시간 {m}분 {s}초</span>;
}

// 캘린더에 추가: .ics 내려받기 + Google 캘린더 링크. 서버 호출·개인정보 없음.
export function AddToCalendar({ event, events, filename = '입대타이밍-일정', compact = false, label }) {
  const list = events || (event ? [event] : []);
  if (!list.length) return null;
  const single = list.length === 1 ? list[0] : null;
  return <span className={`cal-add${compact ? ' compact' : ''}`}>
    <button type="button" className="cal-ics" onClick={() => downloadIcs(filename, list)} aria-label={`${label || (single ? single.title : '일정 ' + list.length + '개')} 캘린더 파일 내려받기`}>{label || (compact ? '캘린더 저장' : single ? '내 캘린더에 추가' : `일정 ${list.length}개 한 번에 캘린더에 추가`)}</button>
    {single && <a className="cal-google" href={googleCalendarUrl(single)} target="_blank" rel="noopener noreferrer">Google 캘린더 ↗</a>}
  </span>;
}

// 마감 예상 지원률. 표본이 모일 때까지는 상태 문구만 보여 준다(없는 숫자를 만들지 않는다).
export function Forecast({ f, compact = false }) {
  if (!f) return null;
  if (f.status === 'ok') return <span className="forecast ok" title={`마감 ${f.hours}시간 전 기준 · 비슷한 ${f.basis === 'category' ? '모집구분' : f.basis === 'branch' ? '군' : '전체'} 회차 ${f.n}건의 변화 비율`}>마감 예상 <b>{fmtRate(f.expected)}</b>{!compact && <span className="muted small"> (범위 {fmtRate(f.low)}~{fmtRate(f.high)} · 표본 {f.n}건)</span>}</span>;
  if (f.status === 'too-early') return compact ? null : <span className="forecast muted small">마감 3일 전부터 예상치를 보여 줘요</span>;
  if (f.status === 'collecting') return compact ? <span className="forecast muted small">예측 기록 수집 중</span> : <span className="forecast muted small">마감 예상은 기록 수집 중이에요 · 마감 회차 {f.closedRounds ?? 0}개 모임 (표본 8건부터 표시)</span>;
  return null;
}

export function CertificateResources() {
  return <section className="doc-section certificate-helper" aria-labelledby="certificate-title">
    <div className="certificate-intro"><h2 id="certificate-title">자격증 준비 도우미</h2><p>필요한 시험과 접수 일정은 공식 사이트에서 확인하세요. <Link to="/calc">내 자격의 예상 배점 계산 →</Link></p></div>
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
  const inputId = useId();
  const [q, setQ] = useState('');
  const [limit, setLimit] = useState(20);
  const [kind, setKind] = useState('');
  // 입력을 멈춘 뒤 250ms에 한 번만 서버에 묻는다(글자마다 요청하지 않게). 목록 전체(3만 개)는 내려받지 않는다.
  const debounced = useDebounced(q.trim(), 250);
  const all = useApi(`/api/eligible-items?${new URLSearchParams({ ...(debounced ? { q: debounced } : {}), ...(kind ? { kind } : {}) })}`);
  const meta = all.data?.meta || [];
  const kinds = all.data?.kinds || [];
  const list = meta.map((m) => m.item);
  const hits = q.trim() && q.trim() !== debounced ? list.filter((x) => x.includes(q.trim())) : list;
  const partial = Boolean(all.data?.partial);
  const toggle = name => onChange(value.includes(name) ? value.filter(x => x !== name) : [...value, name]);
  return <div className="picker">
    <p className="picker-help">이름으로 검색하거나 목록에서 고르세요. 종류를 고르면 그 안에서 지원할 수 있는 특기가 많은 순으로 보여 줘요. 여러 개 고를 수 있어요.</p>
    <label htmlFor={inputId}>자격·면허·전공 검색</label>
    <input id={inputId} value={q} onChange={e => { setQ(e.target.value); setLimit(20); }} placeholder={all.loading ? '목록을 불러오는 중…' : placeholder} disabled={all.loading} />
    {kinds.length > 1 && <div className="chips picker-kinds" role="group" aria-label="종류">{['', ...kinds].map((k) => <button type="button" key={k || 'all'} className={`chip${kind === k ? ' on' : ''}`} aria-pressed={kind === k} onClick={() => { setKind(k); setLimit(20); }}>{k || '전체'}</button>)}</div>}
    {value.length > 0 && <div className="picker-selected"><span className="small">선택한 항목 {value.length}개</span><div className="chips">
      {value.map(v => <button type="button" key={v} className="chip on" aria-label={v + ' 선택 해제'} onClick={() => toggle(v)}>{v} <span aria-hidden="true">×</span></button>)}
    </div></div>}
    {all.loading ? <p className="feedback loading" role="status">선택 목록을 불러오는 중이에요…</p> : all.error ? <p className="feedback error" role="alert">목록을 불러오지 못했어요. 잠시 후 페이지를 새로고침해 주세요.</p> : !list.length ? <p className="feedback empty" role="status">선택 가능한 자격 정보를 준비 중이에요.</p> : <>
      <fieldset className="picker-options"><legend>{q.trim() ? '검색 결과' : `${kind || '자격·면허·전공'} · 지원 가능한 특기가 많은 순`} · {hits.length.toLocaleString()}개</legend>
        {hits.length ? <div className="picker-option-grid">{hits.slice(0, limit).map(name => <label key={name} className={value.includes(name) ? 'selected' : ''}>
          <input type="checkbox" checked={value.includes(name)} onChange={() => toggle(name)} /><span>{name}</span>
        </label>)}</div> : <p className="muted" role="status">일치하는 항목이 없어요. 다른 이름으로 검색해 주세요.</p>}
      </fieldset>
      {hits.length > limit && <button type="button" className="picker-more" onClick={() => setLimit(n => n + 20)}>항목 더 보기 ({Math.min(limit, hits.length)} / {hits.length.toLocaleString()})</button>}
      {partial && hits.length <= limit && <p className="muted small">{q.trim() ? '일치하는 항목이 더 있으면 이름을 더 적어 주세요.' : `전체 ${Number(all.data.total).toLocaleString()}개 중 많이 쓰는 항목만 보여 줘요. 이름으로 검색하면 나머지도 찾을 수 있어요.`}</p>}
    </>}
  </div>;
}

export function addMonths(ym, months) {
  const [y, m] = ym.split('-').map(Number);
  const t = y * 12 + (m - 1) + months;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`;
}
