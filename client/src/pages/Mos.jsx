import { PageHeading } from '../design.jsx';
import { useEffect, useRef } from 'react';
import { useReveal } from '../motion.jsx';
// 특기 목록 + 특기 상세 — 검색 유입의 주력
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { MosSearch } from '../mos-search.jsx';
import { useRouteData } from '../data.jsx';
import { describeMos } from '../lib/describe.js';
import { CompareToggle } from './Compare.jsx';
import { enlistLabel, sourceLabel, sumJobfit } from './Jobfit.jsx';
import { AddToCalendar, Forecast, OfficialApplyGuide, RateBar, Status, addMonths, fmtRate, monthLabel, n, mosHref, calcHref, compareKey, BranchBadge } from '../components.jsx';
import { CertificateSection, ExamTimeline } from '../exam-timeline.jsx';

export function MosIndex() {
  const idx = useRouteData('mosIndex', '/api/mos', (r) => r.items);
  const navigate = useNavigate();
  const groups = {};
  for (const m of idx.value || []) (groups[m.branch || '기타'] ||= []).push(m);
  const names = Object.keys(groups);
  return (
    <>
      <PageHeading title="모집병 특기 전체 목록" description="특기를 누르면 신체조건, 지원 자격·면허·전공, 회차별 경쟁률을 볼 수 있어요." />
      <section className="card mos-index-tools">
        <MosSearch onPick={(m) => navigate(mosHref(m.mosCode, m.shared ? m.branch : null))} label="특기 이름·코드로 바로 찾기" />
        {names.length > 1 && <p className="jump small">바로가기: {names.map((b) => <a key={b} href={`#branch-${b}`}>{b} ({groups[b].length})</a>)}</p>}
        <p className="muted small">내 신체조건·자격으로 거르려면 <Link to="/find">특기 찾기</Link>, 후보를 나란히 보려면 <Link to="/compare">비교함</Link>을 쓰세요.</p>
      </section>
      <Status state={idx} empty={idx.value && !idx.value.length ? '특기 정보를 모으는 중이에요' : null} />
      {Object.entries(groups).map(([branch, list]) => (
        <section key={branch} className="card" id={`branch-${branch}`}>
          <h2>{branch} 모집병 특기 <span className="muted">({list.length})</span></h2>
          <ul className="cols">
            {list.map((m) => <li key={`${m.branch}-${m.mosCode}-${m.category}`}><Link to={mosHref(m.mosCode, m.shared ? m.branch : null)}>{m.mosName}</Link>{m.category && <span className="muted small"> · {m.category}</span>}</li>)}
          </ul>
        </section>
      ))}
      <CertificateSection intro="기술행정병 등 많은 특기가 관련 자격·면허·전공 중 하나를 요구하고, 자격 등급에 따라 배점이 달라져요. 특기 상세에서 인정 자격을 확인하고 시험 일정을 맞춰 보세요." />
    </>
  );
}

// 회차별 마감 지원률 꺾은선 (라이브러리 없이 SVG)
function RateChart({ rates }) {
  const root = useRef(null);
  useReveal(root, rates.map((r) => `${r.roundLabel}:${r.rate}`).join('|'));
  // Reserve a readable slot for every round instead of squeezing labels into 320px.
  const W = Math.max(320, rates.length * 80); const H = 220; const P = 40;
  const bottom = H - 58;
  const vals = rates.map((r) => r.rate ?? 0);
  const max = Math.max(1, ...vals);
  const x = (i) => P + (i * (W - P * 2)) / Math.max(1, rates.length - 1);
  const y = (v) => bottom - (v / max) * (bottom - P);
  const d = rates.map((r, i) => `${i ? 'L' : 'M'}${x(i)},${y(r.rate ?? 0)}`).join(' ');
  return (
    <div className="chart-scroll" tabIndex={0} role="region" aria-label="회차별 마감 지원률 그래프, 가로 스크롤 가능">
    <svg ref={root} viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ width: W }} className="chart" role="img" aria-label="회차별 마감 지원률">
      <line x1={P} y1={y(1)} x2={W - P} y2={y(1)} className="ref" />
      <text x={W - P} y={y(1) - 4} textAnchor="end" className="axis">1.0</text>
      <path pathLength="1" d={d} className="line draw" />
      {rates.map((r, i) => {
        const parts = /^(\d{4})-(.+)$/.exec(String(r.roundLabel));
        return <g key={r.roundLabel}>
          <title>{r.roundLabel}회차 · 지원률 {fmtRate(r.rate)}</title>
          <circle cx={x(i)} cy={y(r.rate ?? 0)} r="3" />
          <text x={x(i)} y={bottom + 25} textAnchor="middle" className="axis round-axis">
            {parts ? <><tspan x={x(i)}>{parts[1]}</tspan><tspan x={x(i)} dy="20">{parts[2]}회차</tspan></> : r.roundLabel}
          </text>
        </g>;
      })}
    </svg>
    </div>
  );
}

export function MosDetail() {
  const { code } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const branchParam = params.get('branch') || '';
  const st = useRouteData('mos', `/api/mos/${encodeURIComponent(code)}${branchParam ? `?branch=${encodeURIComponent(branchParam)}` : ''}`);
  const d = st.value;
  // 군이 하나뿐인 코드인데 주소에 군이 붙어 있으면 대표 주소로 바꾼다(같은 페이지가 여러 주소로 잡히지 않게)
  useEffect(() => { if (d && d.mosCode === code && !st.loading && !d.ambiguous && branchParam && (d.branches || []).length <= 1) navigate(`/mos/${encodeURIComponent(code)}`, { replace: true }); }, [d, st.loading, branchParam, code, navigate]);
  if (!d) return <><PageHeading title="특기 정보" /><Status state={st} empty={!st.loading && !st.error ? '특기를 찾을 수 없어요. 주소의 특기 코드나 군을 확인해 주세요.' : null} /></>;
  if (d.ambiguous) return <>
    <nav className="crumb" aria-label="위치"><Link to="/">입대타이밍</Link> › <Link to="/mos">특기 목록</Link> › 특기코드 {d.mosCode}</nav>
    <PageHeading title={`특기코드 ${d.mosCode}은 여러 군에 있어요`} description="특기 코드는 군마다 따로 매겨져서 같은 코드가 다른 군의 다른 특기를 가리켜요. 보려는 특기를 골라 주세요." />
    <ul className="cards">{d.choices.map((c) => <li key={c.branch} className="mcard"><Link to={mosHref(d.mosCode, c.branch)}><BranchBadge branch={c.branch} /> <b>{c.mosName}</b></Link><div className="muted small">{c.category || ''}</div></li>)}</ul>
  </>;
  const m = n(d.mos);
  const s = d.snapshot;
  const paragraphs = describeMos(d);
  const rates = [...d.finalRates].sort((a, b) => String(a.roundLabel).localeCompare(String(b.roundLabel), 'ko', { numeric: true })).slice(-12);
  const months = d.serviceTerm?.months;
  const discharge = months && s?.enlistMonth && s.enlistMonth !== '*' ? addMonths(s.enlistMonth, months) : null;
  const none = <span className="muted">공개 기준 없음 · 공고 확인</span>;
  const v = (x) => (x === null || x === undefined || x === '' ? none : x);
  const interview = m.interview === 'Y' ? '이 특기는 면접을 봐요' : m.interview === 'N' ? '면접은 없어요(2025년 12월 30일 접수부터 폐지)' : none;

  return (
    <article>
      <nav className="crumb" aria-label="위치"><Link to="/">입대타이밍</Link> › <Link to="/mos">특기 목록</Link> › {d.mosName}</nav>
      <PageHeading title={`${d.mosName} 경쟁률·지원자격`} eyebrow="특기 자세히 보기" />
      <p className="muted">{[d.branch, d.category].filter(Boolean).join(' · ')} 모집병</p>
      {paragraphs.map((p) => <p key={p} className="lead">{p}</p>)}
      {d.branches?.length > 1 && <p className="warn small">특기코드 {d.mosCode}은 {d.branches.filter((b) => b !== d.branch).map((b) => <Link key={b} to={mosHref(d.mosCode, b)}>{b}</Link>).reduce((a, x, i) => (i ? [...a, ', ', x] : [x]), [])}에도 있어요. 이 페이지는 <b>{d.branch}</b> 특기만 보여 줘요.</p>}
      <p className="mos-tools"><CompareToggle code={compareKey(d.mosCode, d.branches?.length > 1 ? d.branch : null)} /> <Link className="cal-ics" to={calcHref(d.mosCode, d.branches?.length > 1 ? d.branch : null)}>예상 배점 계산하기</Link></p>

      <OfficialApplyGuide specialty={d} snapshot={s} />

      <section className="card">
        <h2>최근 수집된 모집 현황</h2>
        {s ? (
          <table><tbody>
            <tr><th>회차</th><td>{s.roundLabel ?? '-'}</td></tr>
            <tr><th>입영</th><td>{monthLabel(s.enlistMonth)}{s.unit ? ` · ${s.unit}` : ''}</td></tr>
            <tr><th>모집 / 접수</th><td>{s.quota ?? '-'}명 / {s.applicants ?? '-'}명</td></tr>
            <tr><th>지원률</th><td><RateBar rate={s.rate} /><div><Forecast f={d.forecast} /></div></td></tr>
            <tr><th>접수기간</th><td>{s.applyStart ?? '-'} ~ {s.applyEnd ?? '-'}</td></tr>
          </tbody></table>
        ) : <p className="muted">{d.jobfit?.length ? '모집병 접수현황에는 지금 이 특기의 접수 회차가 없어요. 취업맞춤특기병 입영일별 현황은 아래에서 확인하세요.' : '지금 접수 중인 회차가 없어요'}</p>}
        {s?.applyEnd && <p className="cal-row"><AddToCalendar event={{ uid: `close-${d.branch}-${d.mosCode}-${s.roundLabel}`, title: `${d.branch} ${d.mosName} 접수 마감`, start: String(s.applyEnd).slice(0, 10), description: `${s.roundLabel ? s.roundLabel + '회차 · ' : ''}접수기간 ${s.applyStart || '?'} ~ ${s.applyEnd} · 지원은 병무청에서`, url: window.location.href }} /> <span className="muted small">마감 하루 전에 알림이 울려요.</span></p>}
        {months && <p>복무기간 <b>{months}개월</b> ({d.serviceTerm.type})</p>}
        {discharge && <p>입영월에 복무기간을 더하면 <b>{monthLabel(s.enlistMonth)} 입영 → {monthLabel(discharge)} 종료 예상</b>이에요. 정확한 전역일은 공식 안내를 확인하세요.</p>}
        {d.serviceTerm?.note && <p className="muted small">{d.serviceTerm.note}</p>}
      </section>

      {d.jobfit?.length > 0 && (() => {
        const upcoming = d.jobfit.filter((r) => !r.past);
        const t = sumJobfit(upcoming);
        return <section className="card">
          <h2>입영일별 모집·선발 현황</h2>
          {upcoming.length ? <>
            <p>다가오는 입영일 {upcoming.length}개에 모집 {t.quota}명, 선발 {t.selected}명으로 {t.vacancy > 0 ? <b className="jobfit-vacancy">남은 자리 {t.vacancy}명</b> : <b>남은 자리가 없어요</b>}{t.vacancy > 0 ? '이에요' : ''}.</p>
            <div className="table-wrap"><table className="doc-table">
              <thead><tr><th>입영일</th><th>입영부대</th><th className="num">모집</th><th className="num">선발</th><th className="num">남은 자리</th></tr></thead>
              <tbody>{upcoming.map((r) => <tr key={r.enlistDate + r.unit}><td>{enlistLabel(r.enlistDate)}</td><td>{r.unit}</td><td className="num">{r.quota}명</td><td className="num">{r.selected}명</td><td className="num">{r.vacancy > 0 ? <b className="jobfit-vacancy">{r.vacancy}명</b> : <span className="badge gray">마감</span>}</td></tr>)}</tbody>
            </table></div>
          </> : <p className="muted">공개된 다가오는 입영일이 없어요.</p>}
          <p className="muted small">남은 자리 = 모집 − 선발 · 출처: 병무청 맞춤형 특기병 정보 · {sourceLabel(d.jobfitSource, d.jobfitFetchedAt)}. 지원 가능한 입영일과 기술훈련 요건은 모집 공고에서 확인하세요. <Link to="/jobfit">전체 특기 입영일 보기 →</Link> · <Link to="/guide/jobfit">제도 안내</Link></p>
        </section>;
      })()}
      <section className="card">
        <h2>지원 자격 · 신체조건</h2>
        <table><tbody>
          <tr><th>신장</th><td>{v(m.height)}</td></tr>
          <tr><th>체중</th><td>{v(m.weight)}</td></tr>
          <tr><th>시력</th><td>{v(m.vision)}</td></tr>
          <tr><th>신체등급</th><td>{m.minGrade ? `${m.minGrade}급 이내` : none}</td></tr>
          <tr><th>색각</th><td>{v(m.colorVision)}</td></tr>
          <tr><th>학력</th><td>{v(m.education)}</td></tr>
          <tr><th>면접</th><td>{interview}</td></tr>
        </tbody></table>
        <h3>자격·면허·전공</h3>
        {d.eligibilityTotal > 0 && <p className="muted small">인정 항목 {d.eligibilityTotal.toLocaleString()}종{d.eligibilityKinds ? ` (${Object.entries(d.eligibilityKinds).map(([k, v]) => `${k} ${v.toLocaleString()}`).join(' · ')})` : ''}{d.eligibilityTotal > 80 ? ' · 아래는 자격·면허부터 80개만 보여 줘요. 내 자격이 인정되는지는 예상 배점 계산기에서 확인하세요.' : ''}</p>}
        {s?.applyEnd && d.eligibility.length > 0 && <ExamTimeline deadline={s.applyEnd} compact />}
        {d.eligibility.length ? (
          <ul className="cols">{d.eligibility.slice(0, 80).map((e, i) => { const x = n(e); return <li key={`${x.item}-${i}`}>{x.item} <span className="muted small">{[x.kind, x.level?.trim(), x.relation].filter(Boolean).join('·')}</span></li>; })}</ul>
        ) : <p className="muted">이 특기에 연결된 자격·면허·전공 데이터가 없어요. 자격 제한이 없는 모집분야이거나 공고에만 적힌 경우이니 모집공고를 확인하세요.</p>}
      </section>

      {d.documents.length > 0 && (
        <section className="card">
          <h2>구비서류 체크리스트</h2>
          <ul className="checklist">{[...new Map(d.documents.map((x) => [n(x).docName, n(x)])).values()].map((x) => <li key={x.docName}><label><input type="checkbox" /> {x.docName}</label></li>)}</ul>
          <p className="muted small">2025년 7월 입영자부터 입영 전 병무청에서 입영판정검사를 받아요.</p>
        </section>
      )}

      <section className="card">
        <h2>회차별 마감 지원률</h2>
        {rates.length >= 2 ? <RateChart rates={rates} /> : <p className="muted">기록이 쌓이는 중이에요{d.firstCollectedAt ? ` · 첫 수집 ${d.firstCollectedAt.slice(0, 10)}` : ''}</p>}
        {rates.length >= 2 && <p className="muted small">최근 {rates.length}회차 · 마지막 {fmtRate(rates[rates.length - 1].rate)}</p>}
      </section>

      <section className="card">
        <h2>함께 읽으면 좋은 안내</h2>
        <ul>
          <li><Link to="/guide/rate-reading">지원률 읽는 법 · 미달이면 합격인가요?</Link></li>
          <li><Link to="/guide/score-basics">자격·면허·전공 배점은 어떻게 반영되나요?</Link></li>
          <li><Link to="/guide/recruit-flow">모집병 지원 절차 한눈에 보기</Link></li>
        </ul>
      </section>
      {d.links.length > 0 && (
        <section className="card">
          <h2>관련 글</h2>
          <ul>{d.links.slice(0, 2).map((l) => <li key={l.url}><a href={l.url}>{l.title}</a></li>)}</ul>
        </section>
      )}
    </article>
  );
}
