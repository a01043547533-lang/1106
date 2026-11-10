// 자격 시험 일정 — 접수 마감 전에 최종 합격 발표가 나는 정기 시험을 보여 준다. 자료가 없거나 올해 접수가 다 지나면 그 사실을 말한다.
import { Link } from 'react-router-dom';
import { CertificateResources, useApi } from './components.jsx';

export const md = (v) => { const d = String(v || '').split('~'); const f = (x) => (x ? `${Number(x.slice(5, 7))}.${Number(x.slice(8, 10))}` : ''); return d[1] ? `${f(d[0])}~${f(d[1])}` : f(d[0]); };

const kstToday = () => new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
const first = (v) => String(v || '').split('~')[0];
const last = (v) => { const p = String(v || '').split('~'); return p[1] || p[0]; };
// 회차 상태: 필기 접수 전 = 접수 예정 / 최종 발표 전 = 진행 중 / 그 뒤 = 끝남
function stateOf(r, day) {
  if (first(r.writtenApply) > day) return ['upcoming', '접수 예정'];
  if (day <= last(r.writtenApply)) return ['open', '필기 접수 중'];
  if (r.finalResult >= day) return ['running', '진행 중'];
  return ['done', '끝남'];
}

// 올해 정기 시험 전체 일정표(특기 찾기·특기 목록용). 접수 예정 회차를 위로, 끝난 회차는 흐리게.
export function ExamYearTable() {
  const st = useApi('/api/exam-schedule');
  const d = st.data;
  if (!d || !d.year) return null;
  const day = kstToday();
  const rows = d.rounds.map((r) => ({ ...r, state: stateOf(r, day) }));
  const nextApply = rows.filter((r) => r.state[0] === 'upcoming' || r.state[0] === 'open').sort((a, b) => first(a.writtenApply).localeCompare(first(b.writtenApply)))[0];
  return <div className="exam-year">
    <p className="exam-title">{d.year}년 국가기술자격 정기 시험 일정</p>
    <p className="small">{nextApply ? <>다음 필기 원서접수는 <b>{nextApply.name} · {md(nextApply.writtenApply)}</b>이에요.</> : <>{d.year}년 정기 시험의 원서접수는 모두 끝났어요. 다음 해 시행계획은 보통 12월에 큐넷에 공고돼요.</>} 접수부터 최종 합격 발표까지 기능사는 약 3개월, 기사·산업기사는 약 5개월 걸려요.</p>
    <div className="table-wrap"><table className="grid stack exam-table">
      <thead><tr><th>회차</th><th>필기 접수</th><th>필기 시험(시작)</th><th>실기 시험</th><th>최종 발표</th><th>상태</th></tr></thead>
      <tbody>{rows.map((r) => <tr key={r.name} className={`exam-${r.state[0]}`}>
        <td className="cell-name"><b>{r.name}</b><div className="muted small">{r.level}{r.writtenApplyExtra?.length ? ` · 필기 빈자리 접수 ${r.writtenApplyExtra.map(md).join(', ')}` : ''}</div></td>
        <td data-label="필기 접수">{md(r.writtenApply)}</td>
        <td data-label="필기 시험">{md(r.writtenExam)}</td>
        <td data-label="실기 시험">{md(r.practicalExam)}</td>
        <td data-label="최종 발표">{md(r.finalResult)}</td>
        <td data-label="상태"><span className={`badge ${r.state[0] === 'done' ? 'gray' : r.state[0] === 'running' ? 'blue' : 'green'}`}>{r.state[1]}</span></td>
      </tr>)}</tbody>
    </table></div>
    <p className="muted small">출처: {d.source}{d.live ? '' : ' (저장본)'} · <a href={d.sourceUrl} target="_blank" rel="noopener noreferrer">자료 안내 ↗</a> · <a href="https://www.q-net.or.kr/crf021.do?id=crf02103" target="_blank" rel="noopener noreferrer">큐넷 일정 ↗</a> · 모집병 배점은 보통 접수 마감일까지 취득한 자격만 인정돼요. 특기별로 어느 시험이 접수 마감 전에 끝나는지는 <Link to="/calc">예상 배점 계산기</Link>에서 볼 수 있어요.</p>
  </div>;
}

// 특기 찾기·특기 목록 아래에 두는 「자격증 준비」 구역: 공식 사이트 바로가기 + 올해 시험 일정
export function CertificateSection({ intro }) {
  return <section className="card cert-section" aria-labelledby="cert-section-title">
    <h2 id="cert-section-title">자격증 준비</h2>
    {intro && <p>{intro}</p>}
    <div className="cert-light"><CertificateResources /></div>
    <ExamYearTable />
  </section>;
}

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
    <p className="muted small">출처: {d.source}{d.live ? '' : ' (저장본)'} · <a href="https://www.q-net.or.kr/crf021.do?id=crf02103" target="_blank" rel="noopener noreferrer">큐넷 일정 ↗</a> · 접수일 기준으로 취득한 자격만 인정되는 게 보통이에요. <Link to="/guide/score-basics">배점 안내</Link></p>
  </div>;
}
