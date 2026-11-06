import { PageHeading } from '../design.jsx';
// 내 점수 — 자격으로 갈 수 있는 특기 → 배점표
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AdSlot, BranchBadge, MultiPicker, n, useApi } from '../components.jsx';

function RulesTable({ pick, items }) {
  const url = `/api/score-rules?${new URLSearchParams({ branch: pick.branch || '', mosCode: pick.mosCode, category: pick.category || '' })}`;
  const st = useApi(url);
  const d = st.data;
  if (st.loading) return <p className="muted" role="status">배점표를 불러오는 중이에요…</p>;
  if (st.error || !d) return <p className="muted" role="alert">배점표를 불러오지 못했어요. 잠시 후 다시 특기를 선택해 주세요.</p>;
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
            <thead><tr><th>구분</th><th>항목</th>{special ? <th>배점</th> : <><th>직접 관련 배점</th><th>간접 관련 배점</th></>}</tr></thead>
            <tbody>
              {rows.slice(0, 80).map((r, i) => (
                <tr key={i} className={mine(r) ? 'best' : ''}>
                  <td>{r.kindName}</td>
                  <td>{mine(r) && <strong className="score-match">선택 자격과 이름 일치</strong>}{[r.gradeName, r.detailName, r.itemName].filter(Boolean).join(' · ')}</td>
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
      <PageHeading title="내 자격은 몇 점일까요?" description="자격·면허·전공을 선택하고, 관심 있는 특기의 배점을 확인하세요." />
      <ol className="score-guide" aria-label="배점 확인 순서">
        <li aria-current={!items.length ? 'step' : undefined}><b>01</b><span>내 자격 선택</span></li>
        <li aria-current={items.length > 0 && !pick ? 'step' : undefined}><b>02</b><span>관심 특기 선택</span></li>
        <li aria-current={pick ? 'step' : undefined}><b>03</b><span>항목별 배점 확인</span></li>
      </ol>
      <p className="score-notice">이 화면은 <strong>자격별 배점표</strong>를 보여 줍니다. 총점이나 합격 가능성을 자동으로 계산하지는 않아요.</p>
      <section className="card">
        <h2>1. 가지고 있는 자격을 선택하세요</h2>
        <MultiPicker value={items} onChange={(v) => { setItems(v); setPick(null); }} />
      </section>
      {items.length > 0 && (
        <section className="card">
          <h2>2. 배점을 확인할 특기를 누르세요</h2>
          {elig.loading && <p className="muted" role="status">선택한 자격과 관련 있는 특기를 찾고 있어요…</p>}
          {elig.error && <p role="alert">특기 목록을 불러오지 못했어요. 잠시 후 자격을 다시 선택해 주세요.</p>}
          {!elig.loading && !elig.error && !list.length && <p className="muted">선택한 자격과 연결된 특기가 없어요. 다른 자격이나 전공을 선택해 보세요.</p>}
          {!elig.loading && !elig.error && list.length > 0 && <p className="muted">관련 특기 {list.length}개{list.length > 60 ? ' 중 60개 표시' : ''} · 최종 지원 자격은 특기 상세와 모집 공고에서 확인하세요.</p>}
          <ul className="cards">
            {list.slice(0, 60).map((m) => (
              <li key={`${m.branch}-${m.mosCode}`} className={`mcard ${pick?.mosCode === m.mosCode ? 'on' : ''}`}>
                <button className="cardbtn" aria-pressed={pick?.mosCode === m.mosCode} onClick={() => setPick(m)}>
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
          <h2>3. {pick.mosName} 배점 확인</h2>
          <p><strong>선택한 자격:</strong> {items.join(', ')}</p>
          <p className="muted">선택한 자격과 이름이 일치하거나 포함된 항목을 강조했어요. 실제 인정 항목과 관련 구분을 확인한 뒤 배점을 읽어 주세요. 강조 표시는 배점 확정이나 자동 합산을 뜻하지 않아요.</p>
          <RulesTable pick={pick} items={items} />
          <p><Link to={`/mos/${encodeURIComponent(pick.mosCode)}`}>특기 상세 보기 →</Link></p>
        </section>
      )}
      <AdSlot size="320x100" />
    </>
  );
}
