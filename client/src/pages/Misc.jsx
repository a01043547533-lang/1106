// 입대 준비 · 사회복무 · 알림 · 광고 안내 · 개인정보처리방침 · 이용약관
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { AdSlot, RulesBox, Status, SubscribeForm, addMonths, monthLabel, useApi } from '../components.jsx';

function DischargeCalc() {
  const terms = useApi('/api/service-terms');
  const [i, setI] = useState(0);
  const [ym, setYm] = useState('');
  const list = terms.data?.items || [];
  const t = list[i];
  return (
    <div>
      {!list.length && <Status state={terms} empty="복무기간 데이터를 준비 중이에요" />}
      {list.length > 0 && (
        <>
          <div className="row">
            <label>복무 유형<select value={i} onChange={(e) => setI(Number(e.target.value))}>{list.map((x, k) => <option key={k} value={k}>{x.branch} {x.type} ({x.months}개월)</option>)}</select></label>
            <label>입영(복무 시작) 월<input type="month" value={ym} onChange={(e) => setYm(e.target.value)} /></label>
          </div>
          {ym && t && <p>예상 전역·복무 종료 월: <b>{monthLabel(addMonths(ym, t.months))}</b> ({t.months}개월)</p>}
          <p className="muted small">{t?.note}</p>
          <p className="muted small">입력한 시작 월에 복무개월을 더한 참고용 계산이에요. 정확한 종료일은 개인별 복무 시작일과 공식 안내를 확인해 주세요.</p>
        </>
      )}
    </div>
  );
}

export function Prepare() {
  const cal = useApi('/api/calendar');
  const pick = (cal.data?.items || []).filter((e) => /입영일자|본인선택/.test(e.title)).slice(0, 3);
  return (
    <>
      <h1>입대 준비 체크리스트</h1>
      <p className="lead">지원 전, 합격 후, 입영 당일까지 순서대로 챙길 것을 모았어요.</p>
      <section className="card">
        <h2>지원 전</h2>
        <ul className="checklist">
          <li><label><input type="checkbox" /> 병무청 누리집 회원가입·본인인증</label></li>
          <li><label><input type="checkbox" /> 자격증·면허·재학(졸업)증명서 준비 (1차 합격 후 제출 요청이 와요)</label></li>
          <li><label><input type="checkbox" /> 지원할 특기의 신체조건 확인 → <Link to="/find">특기 찾기</Link></label></li>
        </ul>
        <RulesBox title="중복접수 규칙" ids={[1, 2]} />
        <RulesBox title="입영판정검사 안내" ids={[9]} />
      </section>
      <section className="card">
        <h2>합격 후</h2>
        <p>지원서 접수기간, 또는 1차 합격 발표부터 최종 발표 7일 전까지만 접수를 취소할 수 있어요.</p>
        <h3>입영일자 본인선택 일정</h3>
        {pick.length ? <ul>{pick.map((e) => <li key={e.id}>{e.title} · {e.start}</li>)}</ul> : <p className="muted">공지가 나오면 여기에 올려요(매년 12월경)</p>}
      </section>
      <section className="card">
        <h2>입영 당일 · 전역일 계산</h2>
        <DischargeCalc />
      </section>
      <section className="card">
        <h2>준비물</h2>
        <p className="muted">준비 물품 정리는 곧 올려요.</p>
      </section>
      <AdSlot size="320x100" />
    </>
  );
}

export function Social() {
  const [region, setRegion] = useState('');
  const [type, setType] = useState('');
  const [q, setQ] = useState('');
  const orgs = useApi(`/api/social-orgs?${new URLSearchParams({ region, type, q })}`);
  const cal = useApi('/api/calendar');
  const sched = (cal.data?.items || []).filter((e) => e.kind === '사회복무');
  const d = orgs.data;
  return (
    <>
      <h1>사회복무요원 복무기관 찾기·소집 일정</h1>
      <p className="lead">병역판정검사에서 4급(보충역)을 받으면 사회복무요원으로 복무해요. 소집신청 기간에 원하는 기관을 골라 신청할 수 있어요.</p>
      <section className="card">
        <h2>소집신청 일정</h2>
        {sched.length ? <ul>{sched.map((e) => <li key={e.id}>{e.title} · {e.start} ~ {e.end} · {e.target}</li>)}</ul> : <p className="muted">다가오는 일정이 없어요</p>}
      </section>
      <section className="card">
        <h2>복무기관 검색</h2>
        <div className="row">
          <label>지역<select value={region} onChange={(e) => setRegion(e.target.value)}><option value="">전체</option>{(d?.regions || []).map((r) => <option key={r}>{r}</option>)}</select></label>
          <label>기관 유형<select value={type} onChange={(e) => setType(e.target.value)}><option value="">전체</option>{(d?.types || []).map((r) => <option key={r}>{r}</option>)}</select></label>
          <label>이름<input value={q} onChange={(e) => setQ(e.target.value)} placeholder="기관명·주소" /></label>
        </div>
        <Status state={orgs} empty={d && !d.total ? '복무기관 정보를 모으는 중이거나 조건에 맞는 곳이 없어요' : null} />
        {d?.total > 0 && <p className="muted small">{d.total.toLocaleString()}곳 중 {Math.min(100, d.total)}곳</p>}
        <ul className="list">
          {(d?.items || []).map((o) => (
            <li key={o.orgCode}><b>{o.orgName}</b> <span className="muted small">{o.orgType} · {o.region}</span>
              <div className="small">{o.address} {o.phone && `· ${o.phone}`}</div>
              {o.limits && <div className="muted small">선발 제한: {o.limits}</div>}
            </li>
          ))}
        </ul>
      </section>
      <section className="card"><h2>복무기간</h2><DischargeCalc /></section>
    </>
  );
}

export function Alerts() {
  return (
    <>
      <h1>모집병 접수 알림 받기</h1>
      <p className="lead">과제 버전에서는 이메일 발송 없이 모집 일정을 조회할 수 있어요. 관심 있는 특기의 접수기간을 확인해 주세요.</p>
      <section className="card">
        <h2>관심 특기 알림</h2>
        <p className="muted small">특기 상세 페이지에서 "이 특기 알림 받기"로 신청할 수 있어요. <Link to="/mos">특기 목록</Link></p>
      </section>
      <div className="cards">
        <section className="card"><h2>카투사 접수 시작</h2><p className="muted small">연 1회, 7월</p><SubscribeForm kinds={['katusa']} label="신청" /></section>
        <section className="card"><h2>사회복무 소집신청</h2><SubscribeForm kinds={['social']} label="신청" /></section>
        <section className="card"><h2>모집병 접수 시작</h2><SubscribeForm kinds={['start']} label="신청" /></section>
      </div>
      <p className="muted small">이메일 주소를 수집하거나 발송하지 않습니다. <Link to="/privacy">개인정보처리방침</Link></p>
    </>
  );
}

export function Ads() {
  const stats = useApi('/api/stats');
  return (
    <>
      <h1>광고 안내</h1>
      <section className="card"><h2>누가 오나요</h2><p>입대 6~12개월 전 지원자와 부모님이에요.</p></section>
      <section className="card">
        <h2>얼마나 오나요</h2>
        <p>방문자 수는 오픈 후 3개월 뒤 공개해요. 지금은 수집 현황만 보여 드려요.</p>
        {stats.data && <p className="muted">특기 {stats.data.specialtiesTracked}개 추적 · 스냅샷 {stats.data.snapshotsCount}건 · 알림 {stats.data.subscribersCount}명</p>}
      </section>
      <section className="card">
        <h2>배너 위치</h2>
        <ul><li>홈 하단 320×100</li><li>지금 접수 표 아래 320×100</li><li>특기 상세 하단 300×250</li><li>특기 찾기 결과 아래 320×100</li></ul>
      </section>
      <section className="card"><h2>문의</h2><SubscribeForm kinds={['ads']} label="문의 남기기" /></section>
    </>
  );
}

export function Privacy() {
  return <><h1>개인정보처리방침</h1><section className="card"><p>이 과제용 웹앱은 회원가입과 이메일 알림 신청을 받지 않으며 이메일 주소를 수집하지 않습니다.</p><p>입력한 신체조건·자격은 특기 조회에만 사용합니다. 서버 함수는 검색 입력을 파일에 저장하거나 애플리케이션 로그에 남기지 않습니다. 호스팅 서비스의 요청 로그 정책은 별도로 적용됩니다.</p><p>병무청 인증키는 서버 환경변수에서만 사용하며 React 화면으로 전달하지 않습니다. API 호출 결과 중 공개 모집 정보만 반환합니다.</p><p>IP별 요청 횟수는 서버 함수 메모리에서 일시적으로 집계하며 함수 재시작 시 초기화됩니다. 가상 광고에는 외부 광고 스크립트나 추적 쿠키가 없습니다.</p><p className="muted small">갱신일: 2026-11-06</p></section></>;
}

export function Terms() {
  return (
    <>
      <h1>이용약관</h1>
      <section className="card">
        <p><b>이 사이트는 민간이고 병무청과 아무 관계가 없어요.</b> 정보가 틀렸을 수 있으니 지원 전엔 반드시 병무청 누리집에서 한 번 더 확인하세요.</p>
        <p>병무청 공공데이터를 이용해요(이용허락범위 제한 없음).</p>
      </section>
    </>
  );
}
