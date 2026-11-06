import { PageHeading } from '../design.jsx';
import { HoverSummary, useRowMotion } from '../motion.jsx';
import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useRouteData } from '../data.jsx';
import { AdSlot, OfficialApplyLink, RateBar, RulesBox, Status, monthLabel, useApi } from '../components.jsx';

const BRANCHES = ['전체', '육군', '해군', '공군', '해병대'];

export default function Now() {
  const tableRef = useRef(null);
  const first = useRouteData('now', '/api/now?sort=rate_asc', (r) => r.items);
  const [branch, setBranch] = useState('전체');
  const [category, setCategory] = useState('');
  const [unit, setUnit] = useState('');
  const [sort, setSort] = useState('asc');
  // 30초마다 자동 갱신 (탭이 가려져 있으면 멈춤). 첫 화면은 SSR 값을 쓴다.
  const live = useApi('/api/now?sort=rate_asc', { interval: 30000 });
  const all = live.data?.items || first.value || [];

  const cats = useMemo(() => [...new Set(all.filter((s) => branch === '전체' || s.branch === branch).map((s) => s.category).filter(Boolean))], [all, branch]);
  const units = useMemo(() => [...new Set(all.filter((s) => branch === '전체' || s.branch === branch).map((s) => s.unit).filter(Boolean))], [all, branch]);

  let rows = all.filter((s) => (branch === '전체' || s.branch === branch) && (!category || s.category === category) && (!unit || s.unit === unit));
  rows = [...rows].sort((a, b) => (sort === 'asc' ? 1 : -1) * ((a.rate ?? 99) - (b.rate ?? 99)));

  useRowMotion(tableRef, `${branch}|${category}|${unit}|${sort}`);

  return (
    <>
      <PageHeading title="지금 접수 중인 모집병 실시간 지원률" description="지원률 = 접수인원 ÷ 모집인원이에요. 1.0 미만은 미달, 3.0 이상은 붐빔으로 표시해요." />
      <p className="muted small">특기 이름을 눌러 조건을 확인한 뒤, 오른쪽 ‘공식 지원’에서 병무청 통합지원서를 작성해 주세요. 새 창이 열립니다.</p>
      <RulesBox title="중복접수 규칙 보기" ids={[1, 2, 3, 4]} />

      <div className="tabs" role="group" aria-label="군별 필터">
        {BRANCHES.map((b) => (
          <button key={b} aria-pressed={branch === b} className={branch === b ? 'on' : ''} onClick={() => { setBranch(b); setCategory(''); setUnit(''); }}>{b}</button>
        ))}
      </div>
      <div className="filters">
        <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="모집분야">
          <option value="">모집분야 전체</option>
          {cats.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select value={unit} onChange={(e) => setUnit(e.target.value)} aria-label="입영부대">
          <option value="">입영부대 전체</option>
          {units.map((u) => <option key={u}>{u}</option>)}
        </select>
        <button onClick={() => setSort(sort === 'asc' ? 'desc' : 'asc')}>{sort === 'asc' ? '지원률 낮은 순' : '지원률 높은 순'} ⇅</button>
      </div>
      <p className="muted small">{live.at ? `마지막 갱신 ${live.at.toLocaleTimeString('ko-KR')} · 30초마다 자동 갱신` : '30초마다 자동 갱신'}</p>

      <Status state={first} empty={!rows.length ? '조건에 맞는 접수 중 특기가 없어요' : null} />
      <div className="table-wrap" ref={tableRef}>
        <table className="grid">
          <thead><tr><th>특기</th><th>모집분야</th><th>입영</th><th>모집/접수 (명)</th><th>지원률</th><th>지원</th></tr></thead>
          <tbody>
            {rows.map((s, index) => (
              <tr data-summary={index} key={`${s.branch}-${s.mosCode}-${s.unit}-${s.enlistMonth}`}>
                <td><Link to={`/mos/${encodeURIComponent(s.mosCode)}`}>{s.mosName}</Link><div className="muted small">{s.branch}{s.unit ? ` · ${s.unit}` : ''}</div></td>
                <td>{s.category}</td>
                <td>{monthLabel(s.enlistMonth)}</td>
                <td>{s.quota} / {s.applicants}</td>
                <td><RateBar rate={s.rate} /></td>
                <td><OfficialApplyLink compact mosName={s.mosName} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <HoverSummary targetRef={tableRef} rows={rows} />
      <AdSlot size="320x100" />
    </>
  );
}
