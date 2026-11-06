import { CountNumber, useClientData, useHomeMotion } from '../motion.jsx';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useRouteData } from '../data.jsx';
import { AdSlot, BranchBadge, OfficialApplyLink, RateBar, Status, monthLabel, useApi } from '../components.jsx';

function Countdown({ to }) {
  const [now, setNow] = useState(null);
  useEffect(() => { setNow(Date.now()); const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  const end = new Date(to.length === 10 ? `${to}T23:59:59+09:00` : to).getTime();
  if (now === null) return <span>{to.slice(0, 10)} 마감</span>; // 서버 렌더에서는 날짜만
  const left = Math.max(0, end - now);
  const d = Math.floor(left / 86400000); const h = Math.floor((left % 86400000) / 3600000);
  const m = Math.floor((left % 3600000) / 60000); const s = Math.floor((left % 60000) / 1000);
  return <span className={left > 0 && left < 86400000 ? 'urgent countdown-card' : 'countdown-card'}>마감까지 <span key={Math.floor(left / 1000)} className="countdown-tick">{d}일 {h}시간 {m}분 {s}초</span></span>;
}

export default function Home() {
  const root = useRef(null);
  useHomeMotion(root);
  const countStats = useClientData('stats');
  const countTop = useClientData('now');
  const now = useRouteData('now', '/api/now?sort=rate_asc', (r) => r.items.slice(0, 5));
  const cal = useRouteData('calendar', '/api/calendar', (r) => r.items.slice(0, 3));
  const stats = useRouteData('stats', '/api/stats');
  const rounds = useApi('/api/now?sort=rate_asc', { interval: 30000 });

  // 지금 접수 중인 회차 (군·모집구분별로 묶음)
  const open = [];
  const seen = new Set();
  for (const s of rounds.data?.items || []) {
    const k = `${s.branch}|${s.category}|${s.roundLabel}`;
    if (seen.has(k)) continue;
    seen.add(k);
    open.push(s);
  }

  return (
    <div ref={root} className="home-page">
      <section className="home-hero" aria-labelledby="home-title">
        <div className="hero-copy">
          <p className="eyebrow"><span aria-hidden="true">✳</span> 나의 다음 계획, 입대타이밍</p>
          <h1 id="home-title" className="kinetic"><span><span>나에게 맞는 입대 시기,</span></span><span><span>한눈에 찾으세요.</span></span></h1>
          <p className="hero-description">모집 일정부터 경쟁률, 지원 조건까지.<br />입대 준비에 필요한 정보를 한곳에서 확인하세요.</p>
          <nav className="hero-actions" aria-label="주요 바로가기">
            <Link className="hero-button primary" to="/find">내 조건으로 특기 찾기 <span aria-hidden="true">↗</span></Link>
            <Link className="hero-button secondary" to="/now">지금 접수 확인 <span aria-hidden="true">→</span></Link>
          </nav>
          <p className="hero-source">병무청 공공데이터로 살펴보는 나의 입대 계획</p>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="paper-decoration paper-calendar"><span className="paper-label">MY NEXT CHAPTER</span><b>나의 입대 계획</b><div className="drawn-calendar"><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><i /><i /><i className="marked">✓</i><i /><i /><i /><i /><i /><i /><i /></div></div>
          <figure className="paper-decoration soldier-paper"><span className="paper-tape" /><div className="soldier-photo"><img src="/preparation-mate.png" width="196" height="201" alt="" /></div><figcaption>준비는 차근차근, 함께!</figcaption><svg className="paper-scribble" viewBox="0 0 120 18"><path d="M3 12 Q48 1 115 9 M20 16 Q67 6 105 13" /></svg></figure>
          <div className="paper-decoration paper-note"><span className="drawn-check">✓</span><div>일정 확인하고<br /><b>나답게 준비하기</b></div></div>
          <svg className="doodle-star" viewBox="0 0 60 60"><path d="m30 3 3 19 17-12-12 18 19 4-20 3 13 16-18-11-3 18-4-20-17 12 12-18-18-4 20-2L10 10l17 12Z" /></svg>
        </div>
      </section>

      <div className="home-content">
      <section className="home-section rounds-section">
        <div className="section-heading"><div><p className="eyebrow">01 / 지금의 기회</p><h2>지금 접수 중인 회차</h2></div><Link to="/now">접수 전체 보기 ↗</Link></div>
        <Status state={rounds} />
        {rounds.data && !open.length && <p className="muted">지금 접수 중인 회차가 없어요</p>}
        <ul className="round-cards">
          {open.slice(0, 6).map((s) => (
            <li key={`${s.branch}-${s.category}-${s.roundLabel}`}>
              <div className="round-top"><BranchBadge branch={s.branch} /><span className="open-label">● 접수 중</span></div><b>{s.category}</b><span className="muted small">{s.roundLabel}회차</span>{s.applyEnd && <Countdown to={s.applyEnd} />}
            </li>
          ))}
        </ul>
      </section>

      <section className="home-section">
        <div className="section-heading"><div><p className="eyebrow">02 / 숫자로 살펴보기</p><h2>지원률 낮은 특기 <span className="heading-tag">TOP 5</span></h2></div><Link to="/now">특기 비교하기 ↗</Link></div>
        <p className="section-description">현재 접수 중인 특기를 지원률이 낮은 순서로 모았어요.</p>
        <Status state={now} empty={now.value && !now.value.length ? '접수 중인 특기가 아직 없어요' : null} />
        <div className="top5">
          {(rounds.data?.items.slice(0, 5) || now.value)?.map((s, i) => (
            <Link key={`${s.branch}-${s.mosCode}-${s.unit}-${s.enlistMonth}`} to={`/mos/${encodeURIComponent(s.mosCode)}`} className="topcard">
              <div className="topcard-heading"><BranchBadge branch={s.branch} /><span className="rank">{i + 1}위</span></div>
              <div className="specialty-name"><b>{s.mosName}</b><span className="specialty-context">{[s.unit, monthLabel(s.enlistMonth)].filter(Boolean).join(' · ')}</span></div>
              <dl className="card-numbers"><div><dt>모집 인원</dt><dd>{s.quota}<small>명</small></dd></div><div><dt>접수 인원</dt><dd>{s.applicants}<small>명</small></dd></div></dl>
              <div className="card-rate"><span className="small muted">지원률</span><RateBar rate={s.rate} countUp={countTop} /></div>
              <span className="card-detail">특기 자세히 <span aria-hidden="true">↗</span></span>
            </Link>
          ))}
        </div>
        <p className="muted small">지원률은 접수 인원 ÷ 모집 인원이에요. ‘미달’은 현재 지원률 1.0 미만이며, 최종 합격을 뜻하지 않아요.</p>
        <details className="home-reading-guide">
          <summary>지원률이 낮으면 어떻게 살펴보면 좋을까요?</summary>
          <div><p>현재 지원률과 함께 지원 자격, 입영월, 접수 마감일을 확인해 보세요. 접수가 끝날 때까지 지원률은 바뀔 수 있어요.</p>
          <ol><li><Link to="/find">내 조건으로 지원 가능한 특기 확인하기</Link></li><li><Link to="/now">모집 인원과 접수 인원 비교하기</Link></li><li><Link to="/plan">희망 입영월로 일정 살펴보기</Link></li></ol></div>
        </details>
      </section>

      <section className="home-section calendar-section">
        <div className="section-heading"><div><p className="eyebrow">03 / 잊지 말고 체크</p><h2>다가오는 일정</h2></div><Link to="/calendar">일정 전체 보기 ↗</Link></div>
        <Status state={cal} empty={cal.value && !cal.value.length ? '다가오는 일정이 없어요' : null} />
        <ul className="home-events">
          {cal.value?.map((e) => (
            <li key={e.id}><time dateTime={e.start}>{e.start?.slice(5, 10).replace('-', '.')}</time><b>{e.title}</b><span className={`badge ${e.verified ? 'green' : 'gray'}`}>{e.verified ? '확인된 일정' : '공고 확인 필요'}</span></li>
          ))}
        </ul>
      </section>

      <section className="home-section explore-section">
        <div className="section-heading"><div><p className="eyebrow">04 / 한 걸음씩 준비해요</p><h2>궁금한 것부터, 차근차근.</h2></div></div>
        <div className="explore-grid"><Link to="/mos"><span className="explore-icon" aria-hidden="true">⌕</span><h3>나에게 맞는 특기는?</h3><p>군별 지원 자격과 경쟁률을 살펴보세요.</p><b>특기 둘러보기 ↗</b></Link><Link to="/prepare"><span className="explore-icon" aria-hidden="true">✓</span><h3>입대 준비, 어디서부터?</h3><p>필요한 준비물과 체크리스트를 확인하세요.</p><b>입대 준비 안내 ↗</b></Link><Link to="/plan"><span className="explore-icon" aria-hidden="true">▦</span><h3>언제 입대하면 좋을까요?</h3><p>희망 입영월에 맞춰 일정을 계획하세요.</p><b>입영월 플래너 ↗</b></Link></div>
      </section>

      <aside className="official-strip"><div><b>마음에 드는 특기를 찾았나요?</b><p>본인인증과 최종 지원은 병무청 누리집에서 진행해요.</p></div><OfficialApplyLink>병무청 지원하기 ↗</OfficialApplyLink></aside>

      {stats.value && (
        <p className="muted">조회한 특기 <CountNumber value={stats.value.specialtiesTracked} animate={countStats} />개 · 접수현황 <CountNumber value={stats.value.snapshotsCount} animate={countStats} />건</p>
      )}
      <AdSlot size="320x100" />
      </div>
    </div>
  );
}
