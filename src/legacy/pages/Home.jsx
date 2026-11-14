'use client';
import { CountNumber, useClientData, useScrollReveal } from '../motion.jsx';
import { useEffect, useRef, useState } from 'react';
import { Link } from '@/legacy/router.jsx';
import { useRouteData } from '../data.jsx';
import { CertificateResources, BranchBadge, Countdown, OfficialApplyLink, RateBar, Status, monthLabel, useApi, mosHref } from '../components.jsx';
import { closingItems } from './Closing.jsx';
import { GUIDES } from '../lib/guide-list.js';

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

  const openRows = rounds.data?.items || now.value || [];
  // 지금 접수 중인 특기를 지원률 낮은 순으로 한 표에. 많으면 12개까지만 보여 주고 전체 보기로 잇는다.
  const LIMIT = 12;
  const top = openRows.slice(0, LIMIT);
  const RankTable = ({ rows, label }) => <div className="table-wrap" data-reveal><table className="doc-table rank-table" aria-label={label}>
    <thead><tr><th className="num">순위</th><th>특기</th><th className="num">뽑는 인원</th><th className="num">지원한 인원</th><th>지원률</th></tr></thead>
    <tbody>
      {rows.map((s, i) => (
        <tr key={`${s.branch}-${s.mosCode}-${s.unit}-${s.enlistMonth}`}>
          <td className="num">{i + 1}</td>
          <td><Link className="topcard" to={mosHref(s.mosCode, s.branch)}>{s.mosName}</Link><div className="muted small">{[s.branch, s.unit, monthLabel(s.enlistMonth)].filter(Boolean).join(' · ')}</div></td>
          <td className="num">{s.quota}명</td>
          <td className="num">{s.applicants}명</td>
          <td><RateBar rate={s.rate} countUp={countTop} /></td>
        </tr>
      ))}
    </tbody>
  </table></div>;
  const closing = closingItems(rounds.data?.items, 48, true);
  const root = useRef(null);
  useScrollReveal(root);

  return (
    <div className="home-page" ref={root}>
      <section className="band band-yellow hero" aria-labelledby="home-title">
        <div className="hero-stickers" aria-hidden="true">
          <span className="sticker s1">접수 중</span>
          <span className="sticker s2">자격증 시험 일정</span>
          <span className="sticker s3">입영월 고르기</span>
          <span className="sticker s4">전역일 D-day</span>
        </div>
        <div className="band-inner">
          <h1 id="home-title" tabIndex={-1}>입대 계획부터 전역까지,<br />나에게 맞는 타이밍</h1>
          <p className="hero-lead">모집 일정과 지원 조건으로 나에게 맞는 입대 시기를 찾고, 배점에 들어가는 자격증 준비부터 입대 후 진급일·월급·전역일까지 챙겨 보세요.</p>
          <p className="intro-actions">
            <Link className="button primary" to="/find">내 조건으로 특기 찾기</Link>
            <Link className="button outline" to="/now">지금 접수 보기</Link>
            <Link className="button after" to="/service">입대 후 · 전역일 계산하기</Link>
            <Link className="button cert" to="/cert">자격증 도우미</Link>
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
              {rounds.data && <p className="closing-callout">{closing.length ? <Link to="/closing">마감 48시간 이내 미달 특기 {closing.length}개 보기 →</Link> : <Link to="/closing">마감 임박 미달 특기 보드 →</Link>}</p>}
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
          <div className="band-heading" data-reveal><h2 id="low-rate">지금 접수 중인 특기{openRows.length ? ` ${openRows.length}개` : ''}</h2><p>지원률이 낮은 순서예요. 1.0 미만(미달)은 지금 지원자가 모집인원보다 적다는 뜻이에요.</p></div>
          <Status state={now} empty={now.value && !now.value.length ? '지금 접수 중인 특기가 없어요. 곧 시작하는 접수는 「지금 접수」 화면에서 볼 수 있어요.' : null} />
          {top.length > 0 && <RankTable rows={top} label="지금 접수 중인 특기" />}
          {openRows.length > LIMIT && <p className="panel-link" data-reveal><Link to="/now">나머지 {openRows.length - LIMIT}개 포함 전체 보기 →</Link></p>}
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

      <section className="band band-cream" aria-labelledby="guide-title">
        <div className="band-inner">
          <div className="band-heading" data-reveal><h2 id="guide-title">처음이라면 가이드부터</h2><p>지원 절차, 지원률 읽는 법, 배점 구조처럼 헷갈리기 쉬운 제도를 글로 풀었어요.</p></div>
          <ul className="guide-grid" data-reveal>
            {GUIDES.slice(0, 4).map((g) => <li key={g.slug}><Link to={`/guide/${g.slug}`}><strong>{g.title}</strong><span>{g.summary}</span></Link></li>)}
          </ul>
          <p className="panel-link" data-reveal><Link to="/guide">가이드 전체 보기 →</Link> · <Link to="/compare">특기 비교함</Link> · <Link to="/calc">예상 배점 계산기</Link></p>
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

    </div>
  );
}
