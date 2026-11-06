// 화면 라우트. SSR로 첫 화면 본문이 HTML에 그대로 들어가 검색 엔진이 읽을 수 있다.
import { Routes, Route, NavLink, Link, useLocation } from 'react-router-dom';
import { useMeta } from './data.jsx';
import { formatKst, useApi } from './components.jsx';
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

const MENU = [
  ['/now', '지금 접수'], ['/find', '특기 찾기'], ['/calendar', '일정'],
  ['/score', '내 점수'], ['/alerts', '알림'], ['/prepare', '입대 준비'],
];

const NotFound = () => <><h1>페이지를 찾을 수 없어요</h1><p><Link to="/">처음으로</Link></p></>;

export default function App() {
  const { pathname } = useLocation();
  const meta = useMeta();
  const health = useApi('/api/health', { interval: 60000 });
  const current = health.data || meta;
  const sample = current.isSample ?? current.source === 'sample';
  return (
    <div className={`wrap${pathname === '/' ? ' home-wrap' : ''}`}>
      {(sample || current.consecutiveFailures >= 3) && <div className="sample-badge" role="status">{sample ? '샘플 데이터예요. 실제 접수현황과 다를 수 있어요.' : '접수현황 수집이 연속 3회 이상 실패했어요.'} <Link to="/status">운영 상태 확인</Link></div>}
      {current.stale && <div className="sample-badge" role="status">데이터가 오래됐어요 · 마지막 성공 수집이 6시간 이상 지났거나 수집 이력이 없어요. <Link to="/status">수집 상태 확인</Link></div>}
      <header>
        <NavLink to="/" className="logo"><img src="/favicon.svg" width="30" height="30" alt="" />입대타이밍<span className="logo-dot" aria-hidden="true">.</span></NavLink>
        <nav aria-label="메뉴">{MENU.map(([to, label]) => <NavLink key={to} to={to}>{label}</NavLink>)}</nav>
      </header>
      <main>
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
        <p>민간 정보 사이트예요. 정보는 병무청 공공데이터를 가지고 와요. 지원은 병무청 누리집에서 하세요.</p>
        <p><a href="https://www.mma.go.kr" target="_blank" rel="noreferrer">병무청 누리집</a> · 마지막 수집: {formatKst(current.lastCollectedAt ?? current.collectedAt)}</p>
        <p>
          <Link to="/mos">특기 목록</Link> · <Link to="/plan">입영월 플래너</Link> · <Link to="/social">사회복무</Link> ·{' '}
          <Link to="/privacy">개인정보처리방침</Link> · <Link to="/terms">이용약관</Link> · <Link to="/ads">광고 안내</Link> · <Link to="/status">운영 상태</Link>
          {' · '}<a href={MMA_APPLY_URL} target="_blank" rel="noopener noreferrer">병무청 공식 지원 ↗</a>
        </p>
      </footer>
    </div>
  );
}
