// 특기 검색 상자 — 계산기·비교함이 함께 쓴다. /api/mos 목록을 이름·코드·모집구분으로 거른다.
import { useId, useState } from 'react';
import { BranchBadge, useApi } from './components.jsx';

export function MosSearch({ onPick, exclude = [], placeholder = '특기 이름이나 코드 (예: 전차승무, S22)', label = '특기 검색' }) {
  const idx = useApi('/api/mos');
  const id = useId();
  const [q, setQ] = useState('');
  const list = idx.data?.items || [];
  const term = q.trim().toLowerCase();
  const hits = term ? list.filter((m) => !exclude.includes(m.mosCode) && !exclude.includes(`${m.mosCode}@${m.branch}`) && [m.mosName, m.mosCode, m.category, m.branch].filter(Boolean).some((v) => String(v).toLowerCase().includes(term))).slice(0, 12) : [];
  return <div className="mos-search">
    <label htmlFor={id}>{label}</label>
    <input id={id} value={q} onChange={(e) => setQ(e.target.value)} placeholder={idx.loading ? '특기 목록을 불러오는 중…' : placeholder} disabled={idx.loading} autoComplete="off" />
    {term && !hits.length && !idx.loading && <p className="muted small" role="status">일치하는 특기가 없어요. 다른 이름으로 검색해 보세요.</p>}
    {hits.length > 0 && <ul className="mos-search-hits" role="listbox" aria-label="검색 결과">
      {hits.map((m) => <li key={`${m.branch}-${m.mosCode}-${m.category}`}><button type="button" role="option" aria-selected="false" onClick={() => { onPick(m); setQ(''); }}><BranchBadge branch={m.branch} /> <b>{m.mosName}</b> <span className="muted small">{[m.category, m.mosCode].filter(Boolean).join(' · ')}</span></button></li>)}
    </ul>}
  </div>;
}
