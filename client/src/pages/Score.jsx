// 내 점수 — 자격으로 갈 수 있는 특기 → 배점표
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AdSlot, BranchBadge, MultiPicker, n, useApi } from '../components.jsx';

function RulesTable({ pick, items }) {
  const url = `/api/score-rules?${new URLSearchParams({ branch: pick.branch || '', mosCode: pick.mosCode, category: pick.category || '' })}`;
  const st = useApi(url);
  const d = st.data;
  if (st.loading) return <p className="muted">배점표를 불러오는 중이에요…</p>;
  if (st.error || !d) return <p className="muted">지금은 불러올 수 없어요</p>;
  if (d.lottery) return <p className="card warn">{d.note}</p>;
  const rows = (d.items || []).map(n);
  const special = pick.category && /전문특기/.test(pick.category);
  const mine = (r) => items.some((x) => [r.detailName, r.itemName, r.gradeName].filter(Boolean).some((v) => v.includes(x) || x.includes(v)));
  return (
    <>
      {d.lotteryFrom && <p className="warn">{d.lotteryFrom}부터는 점수 대신 추첨이에요. {d.note}</p>}
      <p className="muted small">기준: {d.appliedRound || '-'} · 수집 {d.fetchedAt ? d.fetchedAt.slice(0, 10) : '-'}</p>
      {special && <p className="small">면접이 실기로 바뀐 특기가 있어요. 군별 공지를 함께 확인하세요. <a href="https://www.mma.go.kr" target="_blank" rel="noreferrer">병무청 공지</a></p>}
      {!rows.length ? <p className="muted">이 특기의 배점 정보가 아직 없어요</p> : (
        <div className="table-wrap">
          <table className="grid">
            <thead><tr><th>구분</th><th>항목</th>{special ? <th>점수</th> : <><th>직접</th><th>간접</th></>}</tr></thead>
            <tbody>
              {rows.slice(0, 80).map((r, i) => (
                <tr key={i} className={mine(r) ? 'best' : ''}>
                  <td>{r.kindName}</td>
                  <td>{[r.gradeName, r.detailName, r.itemName].filter(Boolean).join(' · ')}</td>
                  {special ? <td>{r.maxValue ?? r.minValue ?? '-'}</td> : <><td>{r.directScore ?? '-'}</td><td>{r.indirectScore ?? '-'}</td></>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="muted small">출결·면접 점수는 2025년 12월 30일 접수부터 폐지됐어요. 표에 남아 있어도 합계에 넣지 마세요.</p>
    </>
  );
}

export default function Score() {
  const [items, setItems] = useState([]);
  const [pick, setPick] = useState(null);
  const elig = useApi(items.length ? `/api/eligible?items=${encodeURIComponent(items.join(','))}` : null);
  const list = elig.data?.items || [];
  return (
    <>
      <h1>모집병 점수 계산기(배점 기준)</h1>
      <p className="lead">가진 자격·면허·전공을 고르면 갈 수 있는 특기를 보여 주고, 특기를 누르면 배점표에서 내 항목을 표시해 줘요.</p>
      <section className="card">
        <h2>1단계 · 내 자격</h2>
        <MultiPicker value={items} onChange={(v) => { setItems(v); setPick(null); }} />
      </section>
      {items.length > 0 && (
        <section className="card">
          <h2>갈 수 있는 특기 <span className="muted">({list.length})</span></h2>
          {elig.loading && <p className="muted">찾는 중이에요…</p>}
          {!elig.loading && !list.length && <p className="muted">이 자격으로 배점을 받는 특기를 찾지 못했어요</p>}
          <ul className="cards">
            {list.slice(0, 60).map((m) => (
              <li key={`${m.branch}-${m.mosCode}`} className={`mcard ${pick?.mosCode === m.mosCode ? 'on' : ''}`}>
                <button className="cardbtn" onClick={() => setPick(m)}>
                  <BranchBadge branch={m.branch} /> <b>{m.mosName}</b>
                  <div className="muted small">{m.category || ''} · {m.matched.map((x) => `${x.item}(${x.relation || '-'})`).join(', ')}</div>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      {pick && (
        <section className="card">
          <h2>2단계 · {pick.mosName} 배점표</h2>
          <RulesTable pick={pick} items={items} />
          <p><Link to={`/mos/${encodeURIComponent(pick.mosCode)}`}>특기 상세 보기 →</Link></p>
        </section>
      )}
      <AdSlot size="320x100" />
    </>
  );
}
