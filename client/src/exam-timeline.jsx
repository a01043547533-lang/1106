// 자격 시험 일정 — 접수 마감 전에 최종 합격 발표가 나는 정기 시험을 보여 준다. 자료가 없거나 올해 접수가 다 지나면 그 사실을 말한다.
import { Link } from 'react-router-dom';
import { useApi } from './components.jsx';

const md = (v) => { const d = String(v || '').split('~'); const f = (x) => (x ? `${Number(x.slice(5, 7))}.${Number(x.slice(8, 10))}` : ''); return d[1] ? `${f(d[0])}~${f(d[1])}` : f(d[0]); };

export function ExamTimeline({ deadline, compact = false }) {
  const st = useApi(`/api/exam-schedule?${new URLSearchParams(deadline ? { deadline: String(deadline).slice(0, 10) } : {})}`);
  const d = st.data;
  if (!d || !d.year) return null;
  const ok = d.rounds.filter((r) => r.canApply && r.inTime);
  const applyLeft = d.rounds.filter((r) => r.canApply);
  return <div className={`exam-timeline${compact ? ' compact' : ''}`}>
    <p className="exam-title">{deadline ? '이 접수 마감 전에 합격 발표가 나는 자격 시험' : `${d.year}년 국가기술자격 정기 시험`}</p>
    {ok.length ? <ul>{ok.map((r) => <li key={r.name}><b>{r.name}</b> <span className="muted small">필기 접수 {md(r.writtenApply)} · 필기 {md(r.writtenExam)} · 실기 {md(r.practicalExam)} · 최종 발표 {md(r.finalResult)}</span></li>)}</ul>
      : <p className="muted small">{applyLeft.length ? '남은 시험은 최종 발표가 이 접수 마감보다 늦어요. 다음 회차 접수에 맞출 수 있어요.' : `${d.year}년 정기 시험의 원서접수가 모두 지났어요. 다음 해 시행계획은 보통 12월에 큐넷에 공고돼요.`}</p>}
    <p className="muted small">출처: {d.source} · <a href={d.sourceUrl} target="_blank" rel="noopener noreferrer">큐넷 일정 ↗</a> · 접수일 기준으로 취득한 자격만 인정되는 게 보통이에요. <Link to="/guide/score-basics">배점 안내</Link></p>
  </div>;
}
