import { CountNumber, useClientData, useScrollReveal } from '../motion.jsx';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useRouteData } from '../data.jsx';
import { AdSlot, CertificateResources, BranchBadge, OfficialApplyLink, RateBar, Status, monthLabel, useApi } from '../components.jsx';

function Countdown({ to }) {
  const [now, setNow] = useState(null);
  useEffect(() => { setNow(Date.now()); const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  const end = new Date(to.length === 10 ? `${to}T23:59:59+09:00` : to).getTime();
  if (now === null) return <span>{to.slice(0, 10)} 마감</span>; // 서버 렌더에서는 날짜만
  const left = Math.max(0, end - now);
  const d = Math.floor(left / 86400000); const h = Math.floor((left % 86400000) / 3600000);
  const m = Math.floor((left % 3600000) / 60000); const s = Math.floor((left % 60000) / 1000);
  return <span className={left > 0 && left < 86400000 ? 'urgent countdown' : 'countdown'}>{d}일 {h}시간 {m}분 {s}초</span>;
}

export default function Home() {
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

  const top = rounds.data?.items.slice(0, 5) || now.value;
  const root = useRef(null);
  useScrollReveal(root);

  return (
    <div className="home-page" ref={root}>
      <section className="band band-yellow hero" aria-labelledby="home-title">
        <div className="hero-stickers" aria-hidden="true">
          <span className="sticker s1">접수 중</span>
          <span className="sticker s2">지원률 확인</span>
          <span className="sticker s3">입영월 고르기</span>
          <span className="sticker s4">특기 찾기</span>
        </div>
        <div className="band-inner">
          <h1 id="home-title" tabIndex={-1}>입대 계획의 시작,<br />나에게 맞는 타이밍</h1>
          <p className="hero-lead">모집 일정과 지원 조건을 확인하고, 나에게 맞는 입대 시기를 찾아보세요.</p>
          <p className="intro-actions">
            <Link className="button primary" to="/find">내 조건으로 특기 찾기</Link>
            <Link className="button outline" to="/now">지금 접수 보기</Link>
          </p>
          <div className="window" aria-labelledby="rounds">
            <div className="window-bar" aria-hidden="true"><i /><i /><i /></div>
            <div className="window-body">
              <div className="section-heading"><h2 id="rounds"><span className="live-dot" aria-hidden="true" />지금 접수 중인 회차</h2><Link to="/now">접수 전체 보기 →</Link></div>
              <Status state={rounds} />
              {rounds.data && !open.length && <p className="muted">지금 접수 중인 회차가 없어요</p>}
              {open.length > 0 && <div className="table-wrap"><table className="doc-table">
                <thead><tr><th>군</th><th>모집분야</th><th>회차</th><th className="num">마감까지</th></tr></thead>
                <tbody>
                  {open.slice(0, 6).map((s) => (
                    <tr key={`${s.branch}-${s.category}-${s.roundLabel}`}>
                      <td><BranchBadge branch={s.branch} /></td>
                      <td><b>{s.category}</b></td>
                      <td>{s.roundLabel}회차</td>
                      <td className="num">{s.applyEnd ? <Countdown to={s.applyEnd} /> : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table></div>}
              <dl className="meta-table" aria-label="데이터 출처와 현황">
                <div><dt>데이터 출처</dt><dd>병무청 공공데이터</dd></div>
                {stats.value && <div><dt>추적 중인 특기</dt><dd><CountNumber value={stats.value.specialtiesTracked} animate={countStats} />개</dd></div>}
                {stats.value && <div><dt>접수현황 기록</dt><dd><CountNumber value={stats.value.snapshotsCount} animate={countStats} />건</dd></div>}
                <div><dt>갱신 주기</dt><dd>30초마다 접수현황 갱신</dd></div>
              </dl>
            </div>
          </div>
        </div>
      </section>

      <section className="band band-cream" aria-labelledby="low-rate">
        <div className="band-inner">
          <div className="band-heading" data-reveal><h2 id="low-rate">지원률 낮은 특기 5개</h2><p>현재 접수 중인 특기를 지원률이 낮은 순서로 모았어요.</p></div>
          <Status state={now} empty={now.value && !now.value.length ? '접수 중인 특기가 아직 없어요' : null} />
          {top?.length > 0 && <div className="table-wrap" data-reveal><table className="doc-table rank-table">
            <thead><tr><th className="num">순위</th><th>특기</th><th className="num">뽑는 인원</th><th className="num">지원한 인원</th><th>지원률</th></tr></thead>
            <tbody>
              {top.map((s, i) => (
                <tr key={`${s.branch}-${s.mosCode}-${s.unit}-${s.enlistMonth}`}>
                  <td className="num">{i + 1}</td>
                  <td><Link className="topcard" to={`/mos/${encodeURIComponent(s.mosCode)}`}>{s.mosName}</Link><div className="muted small">{[s.branch, s.unit, monthLabel(s.enlistMonth)].filter(Boolean).join(' · ')}</div></td>
                  <td className="num">{s.quota}명</td>
                  <td className="num">{s.applicants}명</td>
                  <td><RateBar rate={s.rate} countUp={countTop} /></td>
                </tr>
              ))}
            </tbody>
          </table></div>}
          <aside className="note" data-reveal aria-labelledby="rate-help-title">
            <p className="note-title" id="rate-help-title">지원률 읽는 법</p>
            <p>지원률은 접수 인원 ÷ 모집 인원이에요. <strong>1.0 미만</strong>(미달)이면 뽑는 인원보다 지원한 사람이 적다는 뜻이에요. 접수 중에는 달라질 수 있고, 최종 합격을 뜻하거나 보장하지는 않아요.</p>
            <p className="note-links"><Link to="/now">특기 비교하기</Link> · <Link to="/find">내가 지원할 수 있는지 확인</Link> · <Link to="/plan">입영월이 맞는지 확인</Link></p>
          </aside>
        </div>
      </section>

      <section className="band band-coral" aria-labelledby="events">
        <div className="band-inner">
          <div className="band-heading" data-reveal><h2 id="events">다가오는 일정</h2><p>접수 시작과 소집신청 일정을 날짜순으로 보여 드려요.</p></div>
          <div className="panel" data-reveal>
            <Status state={cal} empty={cal.value && !cal.value.length ? '다가오는 일정이 없어요' : null} />
            <ul className="home-events">
              {cal.value?.map((e) => (
                <li key={e.id}><time dateTime={e.start}>{e.start?.slice(5, 10).replace('-', '.')}</time><span>{e.title}</span><span className={`badge ${e.verified ? 'green' : 'gray'}`}>{e.verified ? '확인된 일정' : '공고 확인 필요'}</span></li>
              ))}
            </ul>
            <p className="panel-link"><Link to="/calendar">일정 전체 보기 →</Link></p>
          </div>
        </div>
      </section>

      <div className="band band-maroon"><div className="band-inner" data-reveal><CertificateResources /></div></div>

      <section className="band band-peach closing" aria-labelledby="apply-title">
        <svg className="sparkles" viewBox="0 0 600 240" aria-hidden="true" focusable="false">
          <path className="spark k1" d="M60 120q4 22 26 26q-22 4-26 26q-4-22-26-26q22-4 26-26Z" />
          <path className="spark k2" d="M520 40q3 16 19 19q-16 3-19 19q-3-16-19-19q16-3 19-19Z" />
          <path className="spark k3" d="M548 74q2 10 12 12q-10 2-12 12q-2-10-12-12q10-2 12-12Z" />
          <path className="spark k4" d="M500 176q4 18 22 22q-18 4-22 22q-4-18-22-22q18-4 22-22Z" />
        </svg>
        <div className="band-inner" data-reveal>
          <h2 id="apply-title">지원은 병무청에서</h2>
          <p>본인인증과 최종 지원은 병무청 누리집에서 진행해요.</p>
          <OfficialApplyLink>병무청 지원하기 ↗</OfficialApplyLink>
        </div>
      </section>

      <div className="band band-cream"><div className="band-inner"><AdSlot size="320x100" /></div></div>
    </div>
  );
}
