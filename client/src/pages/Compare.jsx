import { PageHeading } from '../design.jsx';
// 특기 비교함 — 최대 3개 특기를 나란히 비교한다. 선택 목록은 이 브라우저에만 저장(localStorage)한다.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BranchBadge, RateBar, fmtRate, monthLabel, n } from '../components.jsx';
import { MosSearch } from '../mos-search.jsx';

const KEY = 'ipdae-compare';
const MAX = 3;
const readList = () => { try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v.filter((x) => typeof x === 'string').slice(0, MAX) : []; } catch { return []; } };
const listeners = new Set();
const writeList = (list) => { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* 저장 불가 환경이면 메모리로만 */ } for (const fn of listeners) fn(list); };

export function useCompareList() {
  const [list, setList] = useState(readList);
  useEffect(() => { listeners.add(setList); return () => listeners.delete(setList); }, []);
  const toggle = (code) => { const cur = readList(); writeList(cur.includes(code) ? cur.filter((c) => c !== code) : cur.length >= MAX ? cur : [...cur, code]); };
  const remove = (code) => writeList(readList().filter((c) => c !== code));
  return { list, toggle, remove, full: list.length >= MAX };
}

// 특기 상세에서 쓰는 버튼
export function CompareToggle({ code }) {
  const { list, toggle, full } = useCompareList();
  const on = list.includes(code);
  return <span className="compare-toggle">
    <button type="button" className={`cal-ics${on ? ' on' : ''}`} onClick={() => toggle(code)} disabled={!on && full} aria-pressed={on}>{on ? '비교함에서 빼기' : full ? `비교함이 가득 찼어요 (${MAX}개)` : `비교함에 담기 (${list.length}/${MAX})`}</button>
    {list.length > 0 && <Link to="/compare">비교함 보기 ({list.length}) →</Link>}
  </span>;
}

const yesNo = (v) => (v === 'Y' ? '있음' : v === 'N' ? '없음' : '-');
const ROWS = [
  ['군 · 모집구분', (d) => [d.branch, d.category].filter(Boolean).join(' · ')],
  ['복무기간', (d) => (d.serviceTerm?.months ? `${d.serviceTerm.months}개월 (${d.serviceTerm.type})` : '-')],
  ['현재 접수 회차', (d) => (d.snapshot ? `${d.snapshot.roundLabel ?? '-'}회차 · ${monthLabel(d.snapshot.enlistMonth)}${d.snapshot.unit ? ` · ${d.snapshot.unit}` : ''}` : '접수 중 아님')],
  ['접수기간', (d) => (d.snapshot?.applyStart ? `${d.snapshot.applyStart} ~ ${d.snapshot.applyEnd}` : '-')],
  ['현재 지원률', (d) => (d.snapshot ? <><RateBar rate={d.snapshot.rate} /><div className="muted small">모집 {d.snapshot.quota}명 · 접수 {d.snapshot.applicants}명</div></> : '-')],
  ['최근 회차 마감 지원률', (d) => { const r = [...(d.finalRates || [])].sort((a, b) => String(b.roundLabel).localeCompare(String(a.roundLabel), 'ko', { numeric: true })).slice(0, 3); return r.length ? r.map((x) => `${x.roundLabel}: ${fmtRate(x.rate)}`).join(' · ') : '-'; }],
  ['신장 · 체중', (d) => [n(d.mos).height, n(d.mos).weight].filter(Boolean).join(' · ') || '-'],
  ['시력 · 색각', (d) => [n(d.mos).vision, n(d.mos).colorVision].filter(Boolean).join(' · ') || '-'],
  ['신체등급', (d) => (n(d.mos).minGrade ? `${n(d.mos).minGrade}급 이내` : '-')],
  ['학력', (d) => n(d.mos).education || '-'],
  ['면접 · 연간모집', (d) => `면접 ${yesNo(n(d.mos).interview)} · 연간모집 ${yesNo(n(d.mos).yearRound)}`],
  ['인정 자격·전공', (d) => { const items = [...new Set((d.eligibility || []).map((e) => n(e).item).filter(Boolean))]; return items.length ? `${items.length}종 (${items.slice(0, 3).join(', ')}${items.length > 3 ? ' 등' : ''})` : '-'; }],
  ['구비서류', (d) => { const docs = [...new Set((d.documents || []).map((e) => n(e).docName).filter(Boolean))]; return docs.length ? `${docs.length}종` : '-'; }],
];

export default function Compare() {
  const { list, remove, toggle, full } = useCompareList();
  const [details, setDetails] = useState({});
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const missing = list.filter((c) => !details[c]);
    if (!missing.length) return undefined;
    let alive = true; setLoading(true);
    Promise.all(missing.map((c) => fetch(`/api/mos/${encodeURIComponent(c)}`).then((r) => (r.ok ? r.json() : null)).catch(() => null).then((d) => [c, d || { error: true, mosCode: c }])))
      .then((pairs) => { if (alive) { setDetails((s) => ({ ...s, ...Object.fromEntries(pairs) })); setLoading(false); } });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list]);
  const cols = list.map((c) => details[c]).filter(Boolean);
  return (
    <>
      <PageHeading title="특기 비교함" description={`후보 특기를 최대 ${MAX}개까지 담아 복무기간, 신체조건, 지원률 흐름을 나란히 비교해요. 목록은 이 브라우저에만 저장돼요.`} />
      <section className="card">
        <h2>특기 담기 <span className="muted small">({list.length}/{MAX})</span></h2>
        {full ? <p className="muted small">비교함이 가득 찼어요. 아래 표에서 하나를 빼면 다른 특기를 담을 수 있어요.</p> : <MosSearch onPick={(m) => toggle(m.mosCode)} exclude={list} placeholder="비교할 특기 이름이나 코드" />}
        <p className="muted small">특기 상세 화면의 「비교함에 담기」 버튼으로도 담을 수 있어요. <Link to="/mos">특기 목록</Link> · <Link to="/find">내 조건으로 찾기</Link></p>
      </section>
      {!list.length && <section className="card"><p>아직 담은 특기가 없어요. 고민 중인 특기 2~3개를 담으면 어떤 조건이 다른지 한눈에 보여요.</p></section>}
      {list.length > 0 && <div className="table-wrap compare-wrap">
        <table className="grid compare-table">
          <thead><tr><th scope="col">항목</th>{list.map((c) => { const d = details[c]; return <th scope="col" key={c}>{d && !d.error ? <><BranchBadge branch={d.branch} /> <Link to={`/mos/${encodeURIComponent(c)}`}>{d.mosName}</Link></> : d?.error ? `불러오기 실패 (${c})` : '불러오는 중…'}<div><button type="button" className="link small" onClick={() => remove(c)}>빼기</button></div></th>; })}</tr></thead>
          <tbody>
            {ROWS.map(([label, fn]) => <tr key={label}><th scope="row">{label}</th>{list.map((c) => { const d = details[c]; return <td key={c}>{d && !d.error ? fn(d) : loading ? '…' : '-'}</td>; })}</tr>)}
            <tr><th scope="row">더 보기</th>{list.map((c) => <td key={c}><Link to={`/mos/${encodeURIComponent(c)}`}>상세</Link> · <Link to={`/calc?mos=${encodeURIComponent(c)}`}>예상 배점</Link></td>)}</tr>
          </tbody>
        </table>
      </div>}
      {cols.length > 0 && <aside className="note" aria-labelledby="compare-help"><p className="note-title" id="compare-help">비교할 때 보는 순서</p><p>먼저 신체조건·학력으로 지원 가능한지 거르고, 복무기간과 입영월이 내 계획에 맞는지 본 다음, 마지막에 지원률 흐름을 확인하세요. 지원률이 낮다고 합격이 보장되지는 않아요.</p><p className="note-links"><Link to="/guide/enlist-month">입영월 고르는 법</Link> · <Link to="/guide/rate-reading">지원률 읽는 법</Link></p></aside>}
    </>
  );
}
