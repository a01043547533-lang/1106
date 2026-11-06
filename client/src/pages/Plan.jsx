import { PageHeading } from '../design.jsx';
import { useRef } from 'react';
import { useReveal } from '../motion.jsx';
// 입영월 플래너
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AdSlot, RulesBox, addMonths, fmtRate, useApi } from '../components.jsx';

const NEED = '병무청 공지 확인 필요';
const STEPS = [['applyStart', '접수 시작'], ['applyEnd', '접수 마감'], ['firstResult', '1차 발표'], ['finalResult', '최종 발표'], ['enlist', '입영']];

function nextMonths(count) {
  const now = new Date();
  const base = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return Array.from({ length: count }, (_, i) => addMonths(base, i + 1));
}

export default function Plan() {
  const [tab, setTab] = useState('plan');
  const [months, setMonths] = useState([]);
  const [fixed, setFixed] = useState('');
  const plan = useApi(months.length ? `/api/plan?months=${months.join(',')}` : null);
  const rules = useApi(tab === 'katusa' ? '/api/rules' : null);
  const cal = useApi(tab === 'katusa' ? '/api/calendar' : null);

  const root = useRef(null);
  useReveal(root, plan.data);
  const toggle = (m) => setMonths(months.includes(m) ? months.filter((x) => x !== m) : months.length < 3 ? [...months, m].sort() : months);

  // 월별 특기 비교표: 특기명 × 월 → 지원률
  const table = new Map();
  for (const it of plan.data?.items || []) {
    for (const s of it.specialties) {
      const k = `${s.branch}|${s.mosName}`;
      if (!table.has(k)) table.set(k, { ...s, byMonth: {} });
      const cur = table.get(k).byMonth[it.month];
      if (cur === undefined || (s.rate ?? 99) < cur) table.get(k).byMonth[it.month] = s.rate;
    }
  }
  const rows = [...table.values()].slice(0, 40);

  let warn = null;
  if (fixed) {
    const d = new Date(fixed); d.setDate(d.getDate() - 30);
    warn = d.toISOString().slice(0, 10);
  }
  const katusa = (rules.data?.lottery || []).find((l) => l.category === '카투사');
  const katusaCal = (cal.data?.items || []).filter((e) => e.kind === '카투사');

  return (
    <div ref={root}>
      <PageHeading title="입영월별 모집병 플래너" />
      <div className="tabs">
        <button aria-pressed={tab === 'plan'} className={tab === 'plan' ? 'on' : ''} onClick={() => setTab('plan')}>입영월 플래너</button>
        <button aria-pressed={tab === 'katusa'} className={tab === 'katusa' ? 'on' : ''} onClick={() => setTab('katusa')}>카투사</button>
      </div>

      {tab === 'plan' && (
        <>
          <p className="lead">원하는 입영월을 최대 3개 고르면 접수부터 입영까지 일정과 특기별 지원률을 비교해 줘요.</p>
          <div className="chips">
            {nextMonths(12).map((m) => (
              <button key={m} aria-pressed={months.includes(m)} className={`chip ${months.includes(m) ? 'on' : ''}`} onClick={() => toggle(m)}>{m.replace('-', '.')}</button>
            ))}
          </div>
          {plan.loading && <p className="muted">불러오는 중이에요…</p>}
          {(plan.data?.items || []).map((it) => (
            <section key={it.month} className="card">
              <h2>{it.month.replace('-', '년 ')}월 입영</h2>
              {!it.rounds.length && <p className="muted">이 입영월로 잡힌 모집 회차가 아직 없어요</p>}
              {it.rounds.slice(0, 6).map((r) => (
                <div key={`${r.branch}-${r.round}`} className="tl">
                  <b>{r.branch} {r.round}회차</b>
                  <ol className="steps reveal">
                    {STEPS.map(([k, label]) => (
                      <li key={k} className={r.schedule[k] === NEED ? 'unknown' : ''}><span>{label}</span><small>{r.schedule[k]}</small></li>
                    ))}
                  </ol>
                </div>
              ))}
            </section>
          ))}
          {rows.length > 0 && (
            <section className="card">
              <h2>월별 특기 비교 (지원률)</h2>
              <div className="table-wrap">
                <table className="grid">
                  <thead><tr><th>특기</th>{months.map((m) => <th key={m}>{m.slice(2).replace('-', '.')}</th>)}</tr></thead>
                  <tbody>
                    {rows.map((r) => {
                      const vals = months.map((m) => r.byMonth[m]).filter((v) => v !== undefined && v !== null);
                      const min = vals.length ? Math.min(...vals) : null;
                      return (
                        <tr key={`${r.branch}-${r.mosName}`}>
                          <td><Link to={`/mos/${encodeURIComponent(r.mosCode)}`}>{r.mosName}</Link><div className="muted small">{r.branch}</div></td>
                          {months.map((m) => <td key={m} className={r.byMonth[m] === min && min !== null ? 'best' : ''}>{r.byMonth[m] === undefined ? '-' : fmtRate(r.byMonth[m])}</td>)}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}
          <section className="card">
            <h2>일반병 입영일이 이미 정해졌나요?</h2>
            <label>입영일<input type="date" value={fixed} onChange={(e) => setFixed(e.target.value)} /></label>
            {warn && <p className="warn">모집병에는 <b>{warn}</b>까지만 지원할 수 있어요(입영일 30일 전까지).</p>}
            <RulesBox title="관련 규정 보기" ids={[3]} />
          </section>
        </>
      )}

      {tab === 'katusa' && (
        <section className="card">
          <h2>카투사</h2>
          {katusa && <p>{katusa.note}</p>}
          <ul className="list">
            {katusaCal.map((e) => (
              <li key={e.id}>{e.title} · {e.start} ~ {e.end} {!e.verified && <span className="badge gray">공고 확인 필요</span>}</li>
            ))}
          </ul>
          <h3>어학 기준 체크리스트</h3>
          <p className="muted">어학 기준 점수는 병무청 카투사 모집공고 원문을 보고 확인하세요. 이 사이트는 어학 점수를 계산하지 않아요.</p>
          <p className="muted">월별 지원자 수는 7월 접수 때 수집돼요.</p>
        </section>
      )}
      <AdSlot size="320x100" />
    </div>
  );
}
