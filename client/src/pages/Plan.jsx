import { PageHeading } from '../design.jsx';
import { useRef } from 'react';
import { useReveal } from '../motion.jsx';
// 입영월 플래너
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { RulesBox, addMonths, fmtRate, useApi } from '../components.jsx';

const NEED = '병무청 공지 확인 필요';
const STATUS = { open: ['접수 중', 'green'], upcoming: ['접수 예정', 'blue'], closed: ['마감', 'gray'], unknown: ['접수기간 확인 필요', 'gray'] };
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
  const [goal, setGoal] = useState({ month: '', branch: '육군', slack: 1 });
  const terms = useApi('/api/service-terms');
  const plan = useApi(months.length ? `/api/plan?months=${months.join(',')}` : null);
  const rules = useApi(tab === 'katusa' ? '/api/rules' : null);
  const cal = useApi(tab === 'katusa' ? '/api/calendar' : null);

  const root = useRef(null);
  useReveal(root, plan.data);
  // 역산: 복귀 희망 월 − 복무개월 − 여유 → 입영 가능한 달. 그 달들을 바로 골라 준다(최대 3개).
  const termOf = (branch) => (terms.data?.items || []).find((t) => t.branch === branch && /현역/.test(t.type || ''))?.months || null;
  const suggested = (() => {
    if (!goal.month || !termOf(goal.branch)) return [];
    const latest = addMonths(goal.month, -termOf(goal.branch) - Number(goal.slack || 0));
    return [addMonths(latest, -2), addMonths(latest, -1), latest].filter((m) => nextMonths(18).includes(m));
  })();
  const applySuggested = () => setMonths(suggested.slice(-3).sort());
  const toggle = (m) => setMonths(months.includes(m) ? months.filter((x) => x !== m) : months.length < 3 ? [...months, m].sort() : months);

  // 월별 특기 비교표: 특기명 × 월 → 지원률
  const table = new Map();
  // 비교표에는 아직 지원할 수 있는(접수 중·예정) 특기만 넣는다. 마감된 회차의 지원률은 참고가 안 된다.
  let closedSpecialties = 0;
  for (const it of plan.data?.items || []) {
    for (const s of it.specialties) {
      if (s.status === 'closed') { closedSpecialties++; continue; }
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
          <section className="card goal-box">
            <h2>돌아올 시점부터 거꾸로 계산하기</h2>
            <div className="row">
              <label>복귀 희망 월 (복학·복직)<input type="month" value={goal.month} onChange={(e) => setGoal({ ...goal, month: e.target.value })} /></label>
              <label>군<select value={goal.branch} onChange={(e) => setGoal({ ...goal, branch: e.target.value })}>{['육군', '해군', '공군', '해병대'].map((b) => <option key={b}>{b}</option>)}</select></label>
              <label>전역 뒤 여유<select value={goal.slack} onChange={(e) => setGoal({ ...goal, slack: Number(e.target.value) })}>{[0, 1, 2, 3].map((n) => <option key={n} value={n}>{n}개월</option>)}</select></label>
            </div>
            {goal.month && termOf(goal.branch) && (suggested.length
              ? <p>{goal.branch} 복무 {termOf(goal.branch)}개월 + 여유 {goal.slack}개월 → <b>{suggested.map((m) => m.replace('-', '.')).join(', ')}</b> 입영이 맞아요. <button type="button" className="link" onClick={applySuggested}>이 달들로 비교하기</button></p>
              : <p className="muted">그 시점에 맞추려면 이미 입영했어야 하거나 18개월보다 먼 미래예요. 복귀 월이나 군을 바꿔 보세요.</p>)}
            {!goal.month && <p className="muted small">예: 2028년 3월 복학이면 육군(18개월)은 2026년 7~8월 입영이 맞아요. 전역 뒤 한 달은 비워 두는 편이 좋아요.</p>}
          </section>
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
              {it.rounds.length > 0 && !it.rounds.some((r) => r.status === 'open' || r.status === 'upcoming') && <p className="warn">이 입영월의 회차는 모두 접수가 끝났어요. 다른 달을 고르거나 <Link to="/now">지금 접수 중인 회차</Link>를 확인하세요.</p>}
              {it.rounds.slice(0, 8).map((r) => (
                <div key={`${r.branch}-${r.round}`} className={`tl tl-${r.status}`}>
                  <b>{r.branch} {r.category ? `${r.category} ` : ''}{r.round}회차 <span className={`badge ${STATUS[r.status][1]}`}>{STATUS[r.status][0]}</span></b>
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
              <p className="muted small">접수 중이거나 예정인 회차만 비교해요.{closedSpecialties ? ` 마감된 회차 ${closedSpecialties}건은 뺐어요.` : ''}</p>
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
    </div>
  );
}
