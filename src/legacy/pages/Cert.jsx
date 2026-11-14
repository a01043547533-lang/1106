'use client';
// 자격증 준비 도우미 — 1탄 홈·특기 찾기에 있던 자격증 구역을 한 페이지로 모았다.
import { Link } from '@/legacy/router.jsx';
import { PageHeading } from '../design.jsx';
import { CertificateSection } from '../exam-timeline.jsx';

export default function Cert() {
  return (
    <>
      <PageHeading title="자격증 준비 도우미" description="모집병 배점에 들어가는 자격증을 언제 따야 하는지, 시험 접수는 어디서 하는지, 올해 국가기술자격 시험 일정까지 한곳에서 확인하세요." />
      <section className="card goal-box">
        <h2>내 자격증은 몇 점일까?</h2>
        <p>가진 자격증이나 딸 예정인 자격증을 고르면 특기별 인정 등급과 예상 배점을 계산해 드려요. 모집병 배점은 보통 접수 마감일까지 취득한 자격만 인정돼요.</p>
        <p className="intro-actions">
          <Link className="button primary" to="/calc">예상 배점 계산기 →</Link>{' '}
          <Link className="button" to="/find">자격증으로 갈 수 있는 특기 찾기 →</Link>
        </p>
      </section>
      <CertificateSection intro="자격증·면허를 새로 따면 지원할 수 있는 특기와 배점이 늘어나요. 공식 접수 사이트와 올해 시험 일정을 확인해 보세요." />
      <p className="muted small">시험 일정은 한국산업인력공단 공공데이터로 하루 한 번 갱신해요. 접수와 합격 확인은 큐넷 등 공식 사이트에서 해요.</p>
    </>
  );
}
