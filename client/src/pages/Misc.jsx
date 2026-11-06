// 입대 준비 · 사회복무 · 알림 · 광고 안내 · 개인정보처리방침 · 이용약관
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMeta } from '../data.jsx';
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
      <p className="lead">접수는 1주일 남짓으로 짧고, 미달 특기는 마감 직전에 드러나요. 놓치지 않게 이메일로 알려 드려요.</p>
      <section className="card">
        <h2>관심 특기 알림</h2>
        <p className="muted small">특기 상세 페이지에서 "이 특기 알림 받기"로 신청할 수 있어요. <Link to="/mos">특기 목록</Link></p>
      </section>
      <div className="cards">
        <section className="card"><h2>카투사 접수 시작</h2><p className="muted small">연 1회, 7월</p><SubscribeForm kinds={['katusa']} label="신청" /></section>
        <section className="card"><h2>사회복무 소집신청</h2><SubscribeForm kinds={['social']} label="신청" /></section>
        <section className="card"><h2>모집병 접수 시작</h2><SubscribeForm kinds={['start']} label="신청" /></section>
      </div>
      <p className="muted small">확인 메일의 링크를 누른 뒤 알림을 보내 드려요. <Link to="/privacy">개인정보처리방침</Link></p>
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
  const meta = useMeta();
  const live = useApi('/api/public-config');
  const config = live.data || meta.publicConfig || {};
  return (
    <>
      <h1>개인정보처리방침</h1>
      <section className="card">
        <ul>
          <li>수집 항목: 이메일 주소, 관심 특기·알림 종류, 신청·확인 시각, 확인·해지용 토큰을 저장해요.</li>
          <li>목적: 신청한 일정 알림을 보내기 위해서예요.</li>
          <li>보유 기간: 구독 정보는 해지할 때까지 보관하고 해지하면 삭제해요. 확인하지 않은 신청은 7일 뒤 다음 알림 작업에서 삭제해요.</li>
          <li>발송 중복 방지값(이메일·일정을 조합한 해시), 알림 종류와 발송 시각은 중복 발송 방지를 위해 90일 보관해요. 메일 본문·이메일 원문은 발송 이력 파일에 저장하지 않아요.</li>
          <li>메일 발송 수탁 업체: <b>{config.mailProvider || '설정 확인 중'}</b>. 이메일 주소와 신청한 알림 내용을 전달해 발송을 맡겨요.{config.mailMode === 'console' && ' 현재 발송 키가 없어 외부 발송 없이 개발 콘솔에 보낼 내용을 출력하는 점검 모드예요.'}</li>
          <li>신장·체중·시력·신체등급·자격 검색 입력은 조회에만 쓰고 저장하지 않아요. /api/mos/search와 /api/eligible의 쿼리 문자열을 애플리케이션 로그에 남기지 않아요.</li>
          <li>요청 제한을 위해 IP와 요청 시각을 서버 메모리에 최대 약 2분 보관해요. 디스크에는 저장하지 않아요.</li>
          <li>모든 메일 아래 해지 링크로 구독을 취소할 수 있어요. 열람·정정·삭제 문의도 아래 연락처로 받습니다.</li>
          <li>광고를 붙이면 광고 서비스가 쿠키를 쓸 수 있어요. 브라우저 설정에서 거부할 수 있어요.</li>
        </ul>
        <p>개인정보 문의: {config.contactEmail ? <a href={`mailto:${config.contactEmail}`}>{config.contactEmail}</a> : '운영자 문의 이메일이 아직 설정되지 않았어요.'}</p>
        <p className="muted small">최신 갱신일: {config.privacyUpdatedAt || '2026-11-06'}</p>
      </section>
    </>
  );
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
