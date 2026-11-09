import { PageHeading } from '../design.jsx';
// 취업맞춤특기병 입영일별 모집·선발·남은 자리 — 병무청 「맞춤형 특기병 정보」 API. 서버가 10분마다 새로 받는다.
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BranchBadge, OfficialApplyLink, Status, formatKst, useApi } from '../components.jsx';

const BRANCHES = ['전체', '육군', '해군', '공군'];
const PAGE = 30;
const shortDate = (d) => `${Number(d.slice(5, 7))}.${Number(d.slice(8, 10))}(${DOW[new Date(`${d.slice(0, 10)}T00:00:00Z`).getUTCDay()]})`;
const DOW = ['일', '월', '화', '수', '목', '금', '토'];
// 요일은 날짜 자체(UTC 자정 기준)로 구해서 보는 사람의 시간대와 무관하게 한다.
export const enlistLabel = (d) => (d ? `${d.slice(0, 4)}.${d.slice(5, 7)}.${d.slice(8, 10)} (${DOW[new Date(`${d.slice(0, 10)}T00:00:00Z`).getUTCDay()]})` : '-');
export const sourceLabel = (source, at) => `${source === 'api' ? '병무청 실시간 조회' : '저장된 기준자료'} · ${formatKst(at)}`;

export function sumJobfit(rows) {
  return rows.reduce((t, r) => ({ quota: t.quota + (r.quota || 0), selected: t.selected + (r.selected || 0), vacancy: t.vacancy + (r.vacancy || 0) }), { quota: 0, selected: 0, vacancy: 0 });
}

export default function Jobfit() {
  const st = useApi('/api/jobfit', { interval: 300000 });
  const [branch, setBranch] = useState('전체');
  const [openOnly, setOpenOnly] = useState(true);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('date');
  const [view, setView] = useState('mos');
  const [limit, setLimit] = useState(PAGE);
  const d = st.data;
  const upcoming = useMemo(() => (d?.items || []).filter((r) => !r.past), [d]);
  const rows = useMemo(() => {
    const term = q.trim();
    const list = upcoming.filter((r) => (branch === '전체' || r.branch === branch) && (!openOnly || (r.vacancy ?? 0) > 0) && (!term || String(r.mosName).includes(term)));
    return sort === 'vacancy' ? [...list].sort((a, b) => (b.vacancy ?? 0) - (a.vacancy ?? 0) || String(a.enlistDate).localeCompare(String(b.enlistDate))) : list;
  }, [upcoming, branch, openOnly, q, sort]);
  // 특기별 묶음: 같은 군·특기의 입영일을 한 줄에 칩으로 모은다. rows가 이미 필터·정렬돼 있어 첫 등장 순서를 따른다.
  const groups = useMemo(() => {
    const map = new Map();
    for (const r of rows) {
      const k = `${r.branch}|${r.mosCode}`;
      if (!map.has(k)) map.set(k, { ...r, dates: [], quota: 0, selected: 0, vacancy: 0 });
      const g = map.get(k); g.dates.push(r); g.quota += r.quota || 0; g.selected += r.selected || 0; g.vacancy += r.vacancy || 0;
    }
    const list = [...map.values()];
    return sort === 'vacancy' ? list.sort((a, b) => b.vacancy - a.vacancy) : list;
  }, [rows, sort]);
  const reset = (fn) => (e) => { fn(e); setLimit(PAGE); };
  const scope = useMemo(() => upcoming.filter((r) => branch === '전체' || r.branch === branch), [upcoming, branch]);
  const total = sumJobfit(scope);
  const specialties = new Set(scope.map((r) => r.mosCode)).size;
  const dates = new Set(scope.map((r) => r.enlistDate)).size;
  const past = (d?.items || []).length - upcoming.length;
  return (
    <>
      <PageHeading title="취업맞춤특기병 입영일별 남은 자리" description="기술훈련을 받고 연관 특기로 입대하는 취업맞춤특기병의 입영일별 모집인원, 선발인원, 남은 자리예요. 병무청 공개 데이터를 10분마다 새로 받아요." />
      <p className="muted small">처음이라면 <Link to="/guide/jobfit">취업맞춤특기병 제도 안내</Link>를 먼저 읽어 보세요. 지원 자격은 18~24세 고졸 이하(대학 중퇴 포함)이고, 지원은 병무청에서 해요.</p>
      <div className="tabs" role="group" aria-label="군별 필터">
        {BRANCHES.map((b) => <button key={b} aria-pressed={branch === b} className={branch === b ? 'on' : ''} onClick={() => { setBranch(b); setLimit(PAGE); }}>{b}</button>)}
      </div>
      <Status state={st} empty={d && !upcoming.length ? '공개된 다가오는 입영일이 없어요. 병무청 모집 공고를 확인해 주세요.' : null} />
      {d && upcoming.length > 0 && <>
        <dl className="meta-table jobfit-summary" aria-label={`${branch} 요약`}>
          <div><dt>다가오는 입영일</dt><dd>{dates}개</dd></div>
          <div><dt>특기</dt><dd>{specialties}개</dd></div>
          <div><dt>모집 / 선발</dt><dd>{total.quota}명 / {total.selected}명</dd></div>
          <div><dt>남은 자리</dt><dd className="jobfit-vacancy">{total.vacancy}명</dd></div>
        </dl>
        <div className="filters jobfit-filters">
          <label>특기 이름<input value={q} onChange={reset((e) => setQ(e.target.value))} placeholder="예: 차량정비, 용접" /></label>
          <label>정렬<select value={sort} onChange={reset((e) => setSort(e.target.value))}><option value="date">입영일 빠른 순</option><option value="vacancy">남은 자리 많은 순</option></select></label>
          <label className="check-inline"><input type="checkbox" checked={openOnly} onChange={reset((e) => setOpenOnly(e.target.checked))} /> 남은 자리 있는 것만</label>
        </div>
        <div className="tabs jobfit-view" role="group" aria-label="보기 방식">
          {[['mos', '특기별로 묶어 보기'], ['date', '입영일별로 보기']].map(([k, name]) => <button key={k} aria-pressed={view === k} className={view === k ? 'on' : ''} onClick={() => { setView(k); setLimit(PAGE); }}>{name}</button>)}
        </div>
        <p className="muted small">{view === 'mos' ? `특기 ${groups.length}개 · 입영일 ${rows.length}건` : `${rows.length}건`} · 출처: 병무청 맞춤형 특기병 정보 · {sourceLabel(d.jobfitSource, d.fetchedAt)}{past > 0 ? ` · 지난 입영일 ${past}건 제외` : ''}</p>
        {!rows.length && <p className="feedback empty" role="status">조건에 맞는 입영일이 없어요. 「남은 자리 있는 것만」을 끄거나 다른 이름으로 검색해 보세요.</p>}
        {rows.length > 0 && view === 'mos' && <div className="table-wrap"><table className="grid stack jobfit-table jobfit-groups">
          <thead><tr><th>특기</th><th>입영일별 남은 자리</th><th className="num">모집</th><th className="num">선발</th><th className="num">남은 자리</th></tr></thead>
          <tbody>{groups.map((g) => <tr key={`${g.branch}-${g.mosCode}`}>
            <td className="cell-name"><BranchBadge branch={g.branch} /> <Link to={`/mos/${encodeURIComponent(g.mosCode)}`}><b>{g.mosName}</b></Link><div className="muted small">{g.unit}</div></td>
            <td className="cell-full"><ul className="jf-dates" aria-label={`${g.mosName} 입영일`}>{g.dates.map((r) => <li key={r.enlistDate} className={r.vacancy > 0 ? '' : 'closed'}>{shortDate(r.enlistDate)} {r.vacancy > 0 ? <b>{r.vacancy}</b> : '마감'}</li>)}</ul></td>
            <td className="num" data-label="모집">{g.quota}명</td>
            <td className="num" data-label="선발">{g.selected}명</td>
            <td className="num" data-label="남은 자리">{g.vacancy > 0 ? <b className="jobfit-vacancy">{g.vacancy}명</b> : <span className="badge gray">마감</span>}</td>
          </tr>)}</tbody>
        </table></div>}
        {rows.length > 0 && view === 'date' && <div className="table-wrap"><table className="grid stack jobfit-table">
          <thead><tr><th>특기</th><th>입영일</th><th className="num">모집</th><th className="num">선발</th><th className="num">남은 자리</th></tr></thead>
          <tbody>{rows.slice(0, limit).map((r) => <tr key={`${r.branch}-${r.mosCode}-${r.enlistDate}`}>
            <td className="cell-name"><BranchBadge branch={r.branch} /> <Link to={`/mos/${encodeURIComponent(r.mosCode)}`}><b>{r.mosName}</b></Link><div className="muted small">{[r.unit, r.roundLabel && `${r.roundLabel}회차`].filter(Boolean).join(' · ')}</div></td>
            <td data-label="입영일">{enlistLabel(r.enlistDate)}</td>
            <td className="num" data-label="모집">{r.quota}명</td>
            <td className="num" data-label="선발">{r.selected}명</td>
            <td className="num" data-label="남은 자리">{r.vacancy > 0 ? <b className="jobfit-vacancy">{r.vacancy}명</b> : <span className="badge gray">마감</span>}</td>
          </tr>)}</tbody>
        </table></div>}
        {view === 'date' && rows.length > limit && <button type="button" className="picker-more" onClick={() => setLimit((n) => n + PAGE)}>입영일 더 보기 ({limit} / {rows.length})</button>}
      </>}
      <aside className="note" aria-labelledby="jobfit-help">
        <p className="note-title" id="jobfit-help">숫자 읽는 법</p>
        <p><b>남은 자리 = 모집 − 선발</b>이에요. 선발 인원은 지원과 선발 절차가 진행되면서 계속 바뀌기 때문에, 이 화면은 조회 시각 기준의 참고값이에요.</p>
        <p>취업맞춤특기병은 지원 뒤 기술훈련을 먼저 이수해야 하고, 훈련을 마치지 못하면 선발이 취소될 수 있어요. 어느 입영일에 지원할 수 있는지와 훈련 요건은 병무청 모집 공고에서 확인하세요.</p>
        <p className="note-links"><Link to="/guide/jobfit">제도 안내</Link> · <Link to="/mos">특기 목록</Link> · <a href="https://www.mma.go.kr/contents.do?mc=mma0000433" target="_blank" rel="noopener noreferrer">병무청 취업맞춤특기병 안내 ↗</a></p>
      </aside>
      <p className="apply-actions"><OfficialApplyLink>병무청에서 지원하기 ↗</OfficialApplyLink></p>
    </>
  );
}
