import { PageHeading } from '../design.jsx';
import { HoverSummary, useRowMotion } from '../motion.jsx';
import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useRouteData } from '../data.jsx';
import { AddToCalendar, BranchBadge, OfficialApplyLink, RateBar, RulesBox, Status, dday, monthLabel, useApi } from '../components.jsx';
import { MMA_PLANS_URL } from '../lib/official.js';

const BRANCHES = ['전체', '육군', '해군', '공군', '해병대'];
const DOW = ['일', '월', '화', '수', '목', '금', '토'];
// '2026-11-10' 또는 '2026-11-10T14:00…' → '11.10(화)'. 요일은 날짜 자체로 구해 시간대와 무관하게 한다.
const md = (v) => { const d = String(v || '').slice(0, 10); return /^\d{4}-\d{2}-\d{2}$/.test(d) ? `${Number(d.slice(5, 7))}.${Number(d.slice(8, 10))}(${DOW[new Date(`${d}T00:00:00Z`).getUTCDay()]})` : '-'; };
const topic = (b) => `${b}${b === '해병대' ? '는' : '은'}`; // 육군은 · 해병대는
const roundName = (r) => [r.category, r.roundLabel && `${r.roundLabel}회차`].filter(Boolean).join(' ');
const startsIn = (v) => { const d = dday(String(v || '').slice(0, 10)); return d === 'D-1' ? '내일 시작' : d === 'D-day' ? '오늘 시작' : d ? `${d.slice(2)}일 뒤 시작` : '곧 시작'; };
const calEvent = (r) => ({ uid: `round-${r.branch}-${r.roundLabel}-${r.category}`, title: `${r.branch} ${roundName(r)} 접수`, start: String(r.applyStart).slice(0, 10), end: String(r.applyEnd).slice(0, 10),
  description: `접수기간 ${String(r.applyStart).slice(0, 10)} ~ ${String(r.applyEnd).slice(0, 10)} · 특기 ${r.specialties}개 · 지원은 병무청에서`, url: MMA_PLANS_URL, alarm: '-P1D' });

export default function Now() {
  const tableRef = useRef(null);
  const first = useRouteData('now', '/api/now?sort=rate_asc', (r) => r.items);
  const [branch, setBranch] = useState('전체');
  const [category, setCategory] = useState('');
  const [unit, setUnit] = useState('');
  const [sort, setSort] = useState('asc');
  // 30초마다 자동 갱신 (탭이 가려져 있으면 멈춤).
  const live = useApi('/api/now?sort=rate_asc', { interval: 30000 });
  const all = live.data?.items || first.value || [];
  const statusList = live.data?.branchStatus || [];
  const upcoming = (live.data?.upcoming || []).filter((r) => branch === '전체' || r.branch === branch);
  const openCount = (b) => all.filter((s) => s.branch === b).length;
  const pickBranch = (b) => { setBranch(b); setCategory(''); setUnit(''); };

  const cats = useMemo(() => [...new Set(all.filter((s) => branch === '전체' || s.branch === branch).map((s) => s.category).filter(Boolean))], [all, branch]);
  const units = useMemo(() => [...new Set(all.filter((s) => branch === '전체' || s.branch === branch).map((s) => s.unit).filter(Boolean))], [all, branch]);

  let rows = all.filter((s) => (branch === '전체' || s.branch === branch) && (!category || s.category === category) && (!unit || s.unit === unit));
  rows = [...rows].sort((a, b) => (sort === 'asc' ? 1 : -1) * ((a.rate ?? 99) - (b.rate ?? 99)));
  // 고른 군에 접수 중인 회차 자체가 없는 경우(필터 때문이 아닌 경우)에는 이유와 다음 일정을 보여 준다.
  const closedBranch = branch !== '전체' && (live.data || first.value) && !openCount(branch) ? statusList.find((s) => s.branch === branch) || { branch } : null;
  // 접수 없는 군을 고르면 안내 상자에 다음 회차가 이미 나오므로, 아래 목록에는 그 뒤 회차만 남긴다.
  const laterRounds = closedBranch ? upcoming.filter((r) => !closedBranch.next || r.applyStart !== closedBranch.next.applyStart || r.roundLabel !== closedBranch.next.roundLabel || r.category !== closedBranch.next.category) : upcoming;

  useRowMotion(tableRef, `${branch}|${category}|${unit}|${sort}`);

  return (
    <>
      <PageHeading title="지금 접수 중인 모집병 실시간 지원률" description="지원률 = 접수인원 ÷ 모집인원이에요. 1.0 미만은 미달, 3.0 이상은 붐빔으로 표시해요." />
      <p className="muted small">특기 이름을 눌러 조건을 확인한 뒤, 오른쪽 ‘공식 지원’에서 병무청 통합지원서를 작성해 주세요. 새 창이 열립니다.</p>
      <RulesBox title="중복접수 규칙 보기" ids={[1, 2, 3, 4]} />

      {statusList.length > 0 && <ul className="branch-status" aria-label="군별 접수 상태">
        {statusList.map((s) => {
          const n = openCount(s.branch);
          return <li key={s.branch}><button type="button" className={`${n ? 'is-open' : ''}${branch === s.branch ? ' on' : ''}`} aria-pressed={branch === s.branch} onClick={() => pickBranch(s.branch)}>
            <span className="bs-name">{s.branch}</span>
            {n ? <span className="bs-state open">접수 중 · {n}건</span>
              : s.next ? <span className="bs-state next">{startsIn(s.next.applyStart)} · {md(s.next.applyStart)}</span>
                : <span className="bs-state none">접수 없음</span>}
            <span className="bs-sub">{n ? '아래 표에서 확인' : s.next ? s.next.category : s.lastEnd ? `지난 마감 ${md(s.lastEnd)}` : '일정 공고 전'}</span>
          </button></li>;
        })}
      </ul>}

      <div className="tabs" role="group" aria-label="군별 필터">
        {BRANCHES.map((b) => (
          <button key={b} aria-pressed={branch === b} className={branch === b ? 'on' : ''} onClick={() => pickBranch(b)}>{b}</button>
        ))}
      </div>

      {closedBranch ? <section className="card closed-branch" aria-live="polite">
        <h2>{topic(closedBranch.branch)} 지금 접수 중인 회차가 없어요</h2>
        {closedBranch.lastEnd && <p>지난 접수는 <b>{md(closedBranch.lastEnd)}</b>에 마감됐어요.</p>}
        {closedBranch.next ? <div className="next-round">
          <p className="next-round-title">다음 접수 · {startsIn(closedBranch.next.applyStart)}</p>
          <p><b>{md(closedBranch.next.applyStart)} ~ {md(closedBranch.next.applyEnd)}</b> · {roundName(closedBranch.next)}</p>
          <p className="muted small">특기 {closedBranch.next.specialties}개 · 모집 {closedBranch.next.quota}명{closedBranch.next.enlistMonths.length ? ` · 입영 ${closedBranch.next.enlistMonths.map(monthLabel).join(', ')}` : ''}</p>
          <AddToCalendar event={calEvent(closedBranch.next)} />
          <p className="muted small">접수가 시작되면 이 화면에 자동으로 나타나요.</p>
        </div> : <p>다음 회차는 아직 병무청 자료에 올라오지 않았어요. 공고가 나오면 이 화면과 <Link to="/calendar">모집 일정</Link>에 표시돼요.</p>}
        <p className="note-links small"><Link to="/calendar">모집 일정 전체</Link> · <a href={MMA_PLANS_URL} target="_blank" rel="noopener noreferrer">병무청 모집계획 ↗</a> · <button type="button" className="link" onClick={() => pickBranch('전체')}>접수 중인 다른 군 보기</button></p>
      </section> : <>
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
        <Status state={first} empty={!rows.length ? (branch === '전체' ? '지금 접수 중인 회차가 없어요. 아래 「곧 시작하는 접수」를 확인하세요.' : '조건에 맞는 접수 중 특기가 없어요. 모집분야나 입영부대를 「전체」로 바꿔 보세요.') : null} />
        {rows.length > 0 && <div className="table-wrap" ref={tableRef}>
          <table className="grid stack">
            <thead><tr><th>특기</th><th>모집분야</th><th>입영</th><th>모집/접수 (명)</th><th>지원률</th><th>지원</th></tr></thead>
            <tbody>
              {rows.map((s, index) => (
                <tr data-summary={index} key={`${s.branch}-${s.mosCode}-${s.unit}-${s.enlistMonth}`}>
                  <td className="cell-name"><Link to={`/mos/${encodeURIComponent(s.mosCode)}`}>{s.mosName}</Link><div className="muted small">{s.branch}{s.unit ? ` · ${s.unit}` : ''}</div></td>
                  <td className="cell-sub">{s.category}</td>
                  <td className="cell-sub">{monthLabel(s.enlistMonth)}</td>
                  <td data-label="모집 / 접수">{s.quota} / {s.applicants}</td>
                  <td data-label="지원률"><RateBar rate={s.rate} /></td>
                  <td className="cell-end"><OfficialApplyLink compact mosName={s.mosName} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>}
        <HoverSummary targetRef={tableRef} rows={rows} />
      </>}

      {live.data && (!closedBranch || laterRounds.length > 0) && <section className="card upcoming-rounds" aria-labelledby="upcoming-title">
        <h2 id="upcoming-title">{closedBranch ? `그다음 접수 · ${branch}` : `곧 시작하는 접수${branch !== '전체' ? ` · ${branch}` : ''}`}</h2>
        {laterRounds.length ? <ul className="upcoming-list">
          {laterRounds.map((r) => <li key={`${r.branch}-${r.roundLabel}-${r.category}-${r.applyStart}`}>
            <div className="ur-when"><b>{md(r.applyStart)} ~ {md(r.applyEnd)}</b><span className="badge blue">{startsIn(r.applyStart).replace(' 시작', '')}</span></div>
            <div className="ur-what"><BranchBadge branch={r.branch} /> <b>{roundName(r)}</b><div className="muted small">특기 {r.specialties}개 · 모집 {r.quota}명{r.enlistMonths.length ? ` · 입영 ${r.enlistMonths.map(monthLabel).join(', ')}` : ''}</div></div>
            <AddToCalendar event={calEvent(r)} compact />
          </li>)}
        </ul> : <p className="muted">{branch === '전체' ? '' : `${topic(branch)} `}병무청 자료에 올라온 다음 접수 일정이 아직 없어요. 공고가 나오면 여기에 표시돼요. <Link to="/calendar">모집 일정</Link></p>}
        <p className="muted small">접수기간은 병무청 접수현황 자료 기준이에요. 지원 전에 <a href={MMA_PLANS_URL} target="_blank" rel="noopener noreferrer">병무청 모집계획 ↗</a>에서 한 번 더 확인하세요.</p>
      </section>}
    </>
  );
}
