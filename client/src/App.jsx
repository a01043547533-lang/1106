// React 화면 라우트. Vercel의 SPA rewrite로 직접 접속과 새로고침을 지원한다.
import { useEffect, useState } from 'react';
import { Routes, Route, NavLink, Link, useLocation } from 'react-router-dom';
import { useMeta } from './data.jsx';
import { formatKst, useApi } from './components.jsx';
import { RouteExperience } from './design.jsx';
import { MMA_APPLY_URL } from './lib/official.js';
import OperationStatus from './pages/Status.jsx';
import Home from './pages/Home.jsx';
import Now from './pages/Now.jsx';
import Find from './pages/Find.jsx';
import Calendar from './pages/Calendar.jsx';
import Plan from './pages/Plan.jsx';
import Score from './pages/Score.jsx';
import { MosIndex, MosDetail } from './pages/Mos.jsx';
import { Prepare, Social, Alerts, Ads, Privacy, Terms } from './pages/Misc.jsx';

// 사이드바 메뉴: 현재 모집 확인 → 특기·자격 탐색 → 계획 → 준비
const MENU = [
  ['접수 현황', [['/now', '지금 접수'], ['/calendar', '모집 일정']]],
  ['특기 탐색', [['/find', '내 조건으로 찾기'], ['/mos', '특기 전체 목록'], ['/score', '자격별 배점']]],
  ['복무 계획', [['/plan', '입영월 플래너'], ['/social', '사회복무요원']]],
  ['입대 준비', [['/prepare', '준비 체크리스트'], ['/alerts', '알림']]],
];

const PRIMARY = [['/now', '지금 접수'], ['/find', '특기 찾기'], ['/mos', '특기 목록'], ['/calendar', '모집 일정']];

const NotFound = () => <><h1>페이지를 찾을 수 없어요</h1><p><Link to="/">처음으로</Link></p></>;

export default function App() {
  const { pathname } = useLocation();
  const meta = useMeta();
  const health = useApi('/api/health', { interval: 60000 });
  const current = health.data || meta;
  const sample = current.isSample ?? current.source === 'sample';
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => { setMenuOpen(false); }, [pathname]);
  return (
    <div className={`wrap${pathname === '/' ? ' home-wrap' : ''}`} data-page={pathname.split('/')[1] || 'home'}>
      {(sample || current.consecutiveFailures >= 3) && <div className="sample-badge" role="status">{sample ? '샘플 데이터예요. 실제 접수현황과 다를 수 있어요.' : '접수현황 수집이 연속 3회 이상 실패했어요.'} <Link to="/status">운영 상태 확인</Link></div>}
      {current.stale && <div className="sample-badge" role="status">데이터가 오래됐어요 · 마지막 성공 수집이 6시간 이상 지났거나 수집 이력이 없어요. <Link to="/status">수집 상태 확인</Link></div>}
      {current.apiConfigured === false && <div className="sample-badge" role="status">실시간 API 연결을 준비 중이에요. 현재는 저장된 공개 자료를 표시합니다.</div>}
      {current.apiConfigured && current.connectionFailed && <div className="sample-badge" role="status">병무청 실시간 조회가 실패해 저장된 공개 자료를 표시합니다. <Link to="/status">연결 상태 확인</Link></div>}
      <a className="skip-link" href="#main-content">본문 바로가기</a>
      <RouteExperience />
      <header className="topbar">
        <NavLink to="/" className="logo"><img src="/favicon.svg" width="26" height="26" alt="" />입대타이밍</NavLink>
        <nav className="top-links" aria-label="주요 메뉴">
          {PRIMARY.map(([to, name]) => <NavLink key={to} to={to}>{name}</NavLink>)}
        </nav>
        <button type="button" className="menu-toggle" aria-expanded={menuOpen} aria-controls="site-nav" onClick={() => setMenuOpen(o => !o)}>{menuOpen ? '닫기' : '전체 메뉴'}</button>
        <a className="topbar-cta" href={MMA_APPLY_URL} target="_blank" rel="noopener noreferrer">병무청 공식 지원 ↗</a>
      </header>
      <div className={`menu-panel${menuOpen ? ' open' : ''}`}>
        <nav id="site-nav" aria-label="전체 메뉴">
          {MENU.map(([label, links]) => <div className="nav-group" key={label}>
            <p className="nav-label">{label}</p>
            {links.map(([to, name]) => <NavLink key={to} to={to}>{name}</NavLink>)}
          </div>)}
          <div className="nav-group">
            <p className="nav-label">데이터</p>
            <NavLink to="/status">운영 상태</NavLink>
            <span className="nav-note">마지막 수집 {formatKst(current.lastCollectedAt ?? current.collectedAt)}</span>
          </div>
        </nav>
      </div>
      <main id="main-content" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/now" element={<Now />} />
          <Route path="/find" element={<Find />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/plan" element={<Plan />} />
          <Route path="/score" element={<Score />} />
          <Route path="/mos" element={<MosIndex />} />
          <Route path="/mos/:code" element={<MosDetail />} />
          <Route path="/prepare" element={<Prepare />} />
          <Route path="/social" element={<Social />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/ads" element={<Ads />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/status" element={<OperationStatus />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <footer>
        <p><b>입대타이밍</b> · 민간 정보 사이트예요. 정보는 병무청 공공데이터를 가지고 와요. 지원은 병무청 누리집에서 하세요.</p>
        <p><a href="https://www.mma.go.kr" target="_blank" rel="noreferrer">병무청 누리집</a> · 마지막 수집: {formatKst(current.lastCollectedAt ?? current.collectedAt)}</p>
        <p>
          <Link to="/privacy">개인정보처리방침</Link> · <Link to="/terms">이용약관</Link> · <Link to="/ads">광고 안내</Link> · <Link to="/status">운영 상태</Link>
          {' · '}<a href={MMA_APPLY_URL} target="_blank" rel="noopener noreferrer">병무청 공식 지원 ↗</a>
        </p>
      </footer>
    </div>
  );
}
