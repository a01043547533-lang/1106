import { PageHeading } from '../design.jsx';
import { useRef } from 'react';
import { useReveal } from '../motion.jsx';
// 특기 목록 + 특기 상세 — 검색 유입의 주력
import { Link, useParams } from 'react-router-dom';
import { useRouteData } from '../data.jsx';
import { describeMos } from '../lib/describe.js';
import { AdSlot, OfficialApplyGuide, RateBar, Status, SubscribeForm, addMonths, fmtRate, monthLabel, n } from '../components.jsx';

export function MosIndex() {
  const idx = useRouteData('mosIndex', '/api/mos', (r) => r.items);
  const groups = {};
  for (const m of idx.value || []) (groups[m.branch || '기타'] ||= []).push(m);
  return (
    <>
      <PageHeading title="모집병 특기 전체 목록" description="특기를 누르면 신체조건, 지원 자격·면허·전공, 회차별 경쟁률을 볼 수 있어요." />
      <Status state={idx} empty={idx.value && !idx.value.length ? '특기 정보를 모으는 중이에요' : null} />
      {Object.entries(groups).map(([branch, list]) => (
        <section key={branch} className="card">
          <h2>{branch} 모집병 특기 <span className="muted">({list.length})</span></h2>
          <ul className="cols">
            {list.map((m) => <li key={`${m.mosCode}-${m.category}`}><Link to={`/mos/${encodeURIComponent(m.mosCode)}`}>{m.mosName}</Link>{m.category && <span className="muted small"> · {m.category}</span>}</li>)}
          </ul>
        </section>
      ))}
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
  const st = useRouteData('mos', `/api/mos/${encodeURIComponent(code)}`);
  const d = st.value;
  if (!d) return <><PageHeading title="특기 정보" /><Status state={st} empty={!st.loading && !st.error ? '특기를 찾을 수 없어요' : null} /></>;
  const m = n(d.mos);
  const s = d.snapshot;
  const paragraphs = describeMos(d);
  const rates = [...d.finalRates].sort((a, b) => String(a.roundLabel).localeCompare(String(b.roundLabel), 'ko', { numeric: true })).slice(-12);
  const months = d.serviceTerm?.months;
  const discharge = months && s?.enlistMonth && s.enlistMonth !== '*' ? addMonths(s.enlistMonth, months) : null;
  const interview = m.interview === 'Y' ? '이 특기는 면접을 봐요' : m.interview === 'N' ? '면접은 없어요(2025년 12월 30일 접수부터 폐지)' : '-';

  return (
    <article>
      <nav className="crumb" aria-label="위치"><Link to="/">입대타이밍</Link> › <Link to="/mos">특기 목록</Link> › {d.mosName}</nav>
      <PageHeading title={`${d.mosName} 경쟁률·지원자격`} eyebrow="특기 자세히 보기" />
      <p className="muted">{[d.branch, d.category].filter(Boolean).join(' · ')} 모집병</p>
      {paragraphs.map((p) => <p key={p} className="lead">{p}</p>)}

      <OfficialApplyGuide specialty={d} snapshot={s} />

      <section className="card">
        <h2>최근 수집된 모집 현황</h2>
        {s ? (
          <table><tbody>
            <tr><th>회차</th><td>{s.roundLabel ?? '-'}</td></tr>
            <tr><th>입영</th><td>{monthLabel(s.enlistMonth)}{s.unit ? ` · ${s.unit}` : ''}</td></tr>
            <tr><th>모집 / 접수</th><td>{s.quota ?? '-'}명 / {s.applicants ?? '-'}명</td></tr>
            <tr><th>지원률</th><td><RateBar rate={s.rate} /></td></tr>
            <tr><th>접수기간</th><td>{s.applyStart ?? '-'} ~ {s.applyEnd ?? '-'}</td></tr>
          </tbody></table>
        ) : <p className="muted">지금 접수 중인 회차가 없어요</p>}
        {months && <p>복무기간 <b>{months}개월</b> ({d.serviceTerm.type})</p>}
        {discharge && <p>입영월에 복무기간을 더하면 <b>{monthLabel(s.enlistMonth)} 입영 → {monthLabel(discharge)} 종료 예상</b>이에요. 정확한 전역일은 공식 안내를 확인하세요.</p>}
        {d.serviceTerm?.note && <p className="muted small">{d.serviceTerm.note}</p>}
      </section>

      <section className="card">
        <h2>지원 자격 · 신체조건</h2>
        <table><tbody>
          <tr><th>신장</th><td>{m.height ?? '-'}</td></tr>
          <tr><th>체중</th><td>{m.weight ?? '-'}</td></tr>
          <tr><th>시력</th><td>{m.vision ?? '-'}</td></tr>
          <tr><th>신체등급</th><td>{m.minGrade ? `${m.minGrade}급 이내` : '-'}</td></tr>
          <tr><th>색각</th><td>{m.colorVision ?? '-'}</td></tr>
          <tr><th>학력</th><td>{m.education ?? '-'}</td></tr>
          <tr><th>면접</th><td>{interview}</td></tr>
        </tbody></table>
        <h3>자격·면허·전공</h3>
        {d.eligibility.length ? (
          <ul className="cols">{d.eligibility.slice(0, 80).map((e, i) => { const x = n(e); return <li key={`${x.item}-${i}`}>{x.item} <span className="muted small">{[x.kind, x.level?.trim(), x.relation].filter(Boolean).join('·')}</span></li>; })}</ul>
        ) : <p className="muted">자격 정보를 모으는 중이에요</p>}
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
        <h2>이 특기 알림 받기</h2>
        <p className="muted small">접수 시작·마감, 마감 직전 미달 소식을 이메일로 알려 줘요.</p>
        <SubscribeForm mosCode={d.mosCode} />
      </section>

      {d.links.length > 0 && (
        <section className="card">
          <h2>관련 글</h2>
          <ul>{d.links.slice(0, 2).map((l) => <li key={l.url}><a href={l.url}>{l.title}</a></li>)}</ul>
        </section>
      )}
      <AdSlot size="300x250" />
    </article>
  );
}
