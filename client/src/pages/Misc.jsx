import { PageHeading } from '../design.jsx';
// 입대 준비 · 사회복무 · 일정 챙기기 · 소개 · 문의 · 개인정보처리방침 · 이용약관
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { RulesBox, Status, addMonths, monthLabel, useApi } from '../components.jsx';
import { MMA_PLANS_URL, MMA_PORTAL_URL } from '../lib/official.js';

const PRIVACY_UPDATED = '2026-11-09';

export function DischargeCalc() {
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

const PACKING = [
  ['꼭 챙길 것', [
    '신분증(주민등록증·운전면허증·여권 중 하나)',
    '입영통지서(종이 또는 병무청 안내에 따른 모바일 확인)',
    '나라사랑카드 또는 본인 명의 체크카드 (급여 입금용, 미리 발급 여부 확인)',
    '안경 착용자는 여분 안경 1개 (훈련 중 렌즈 사용은 제한되는 경우가 많아요)',
    '복용 중인 약과 처방전·진단서 사본 (지병이 있다면 반드시)',
  ]],
  ['있으면 편한 것', [
    '소액 현금 (입영 당일 이동·간식용, 많이 가져가지 않아요)',
    '손목시계 (단순 기능, 저가형)',
    '가족·친구 연락처 메모 (휴대전화 사용이 제한될 때를 대비)',
    '간단한 세면도구와 수건 (대부분 부대에서 지급하지만 첫날 필요할 수 있어요)',
    '편한 운동복과 운동화, 계절에 맞는 겉옷',
  ]],
  ['가져가지 않는 것', [
    '귀금속·고가 전자기기 등 분실 위험이 있는 귀중품',
    '많은 현금',
    '칼·라이터 등 반입 금지 물품 (부대 안내문의 금지 품목 확인)',
    '휴대전화 반입·보관 규정은 부대마다 달라서 입영 안내문을 따라야 해요',
  ]],
];

export function Prepare() {
  const cal = useApi('/api/calendar');
  const pick = (cal.data?.items || []).filter((e) => /입영일자|본인선택/.test(e.title)).slice(0, 3);
  return (
    <>
      <PageHeading title="입대 준비 체크리스트" description="지원 전, 합격 후, 입영 당일까지 순서대로 챙길 것을 모았어요. 체크박스는 이 화면에서만 표시되고 저장되지 않아요." />
      <section className="card">
        <h2>지원 전</h2>
        <ul className="checklist">
          <li><label><input type="checkbox" /> 병무청 누리집 회원가입·본인인증</label></li>
          <li><label><input type="checkbox" /> 자격증·면허·재학(졸업)증명서 준비 (1차 합격 후 제출 요청이 와요)</label></li>
          <li><label><input type="checkbox" /> 지원할 특기의 신체조건 확인 → <Link to="/find">특기 찾기</Link></label></li>
          <li><label><input type="checkbox" /> 입영 희망 월과 학업·취업 일정 맞추기 → <Link to="/plan">입영월 플래너</Link></label></li>
          <li><label><input type="checkbox" /> 중복접수가 가능한 조합인지 확인 → <Link to="/guide/recruit-flow">지원 절차 안내</Link></label></li>
        </ul>
        <RulesBox title="중복접수 규칙" ids={[1, 2]} />
        <RulesBox title="입영판정검사 안내" ids={[9]} />
      </section>
      <section className="card">
        <h2>합격 후</h2>
        <p>지원서 접수기간, 또는 1차 합격 발표부터 최종 발표 7일 전까지만 접수를 취소할 수 있어요. 취소 가능 기간이 지나면 입영 의무가 생기니 일정이 바뀔 가능성이 있다면 미리 판단하세요.</p>
        <ul className="checklist">
          <li><label><input type="checkbox" /> 1차 합격 후 요청받은 서류를 기한 안에 제출</label></li>
          <li><label><input type="checkbox" /> 입영판정검사 예약·수검 (2025년 7월 입영자부터 입영 전에 받아요)</label></li>
          <li><label><input type="checkbox" /> 입영통지서 확인, 입영 장소와 집결 시간 메모</label></li>
          <li><label><input type="checkbox" /> 학교 휴학, 직장 퇴직·휴직, 통신·구독 서비스 정리</label></li>
        </ul>
        <h3>입영일자 본인선택 일정</h3>
        {pick.length ? <ul>{pick.map((e) => <li key={e.id}>{e.title} · {e.start}</li>)}</ul> : <p className="muted">현재 공개된 본인선택 일정이 없어요. 보통 매년 12월경 병무청에서 다음 해 일정을 공지해요. <a href={MMA_PLANS_URL} target="_blank" rel="noopener noreferrer">병무청 모집계획 ↗</a></p>}
      </section>
      <section className="card">
        <h2>입영 당일 준비물</h2>
        <p className="muted small">부대마다 입영 안내문이 따로 나와요. 아래 목록은 일반적인 기준이고, 안내문과 다르면 안내문이 우선이에요.</p>
        {PACKING.map(([title, items]) => <div key={title}>
          <h3>{title}</h3>
          <ul className="checklist">{items.map((x) => <li key={x}><label><input type="checkbox" /> {x}</label></li>)}</ul>
        </div>)}
        <p className="muted small">자세한 설명은 <Link to="/guide/packing-list">입영 당일 준비물 안내</Link>에 정리했어요.</p>
      </section>
      <section className="card">
        <h2>전역일 계산</h2>
        <DischargeCalc />
      </section>
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
      <PageHeading title="사회복무요원 복무기관 찾기·소집 일정" description="병역판정검사에서 4급(보충역)을 받으면 사회복무요원으로 복무해요. 소집신청 기간에 원하는 기관을 골라 신청할 수 있어요." />
      <section className="card">
        <h2>소집신청 일정</h2>
        {sched.length ? <ul>{sched.map((e) => <li key={e.id}>{e.title} · {e.start} ~ {e.end} · {e.target}</li>)}</ul> : <p className="muted">현재 공개된 소집신청 일정이 없어요. 일정이 나오면 <Link to="/calendar">모집 일정</Link>에 함께 올라와요.</p>}
        <p className="muted small">소집신청 방법과 기관 고르는 기준은 <Link to="/guide/social-service">사회복무요원 소집 안내</Link>를 참고하세요.</p>
      </section>
      <section className="card">
        <h2>복무기관 검색</h2>
        <div className="row">
          <label>지역(관할 병무청)<select value={region} onChange={(e) => setRegion(e.target.value)}><option value="">전체</option>{(d?.regions || []).map((r) => <option key={r}>{r}</option>)}</select></label>
          <label>기관 유형<select value={type} onChange={(e) => setType(e.target.value)}><option value="">전체</option>{(d?.types || []).map((r) => <option key={r}>{r}</option>)}</select></label>
          <label>이름<input value={q} onChange={(e) => setQ(e.target.value)} placeholder="기관명·주소" /></label>
        </div>
        <Status state={orgs} empty={d && !d.total ? '조건에 맞는 복무기관이 없어요. 지역이나 유형을 바꿔 보세요.' : null} />
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
  const cal = useApi('/api/calendar');
  const next = (cal.data?.items || []).slice(0, 5);
  return (
    <>
      <PageHeading title="접수 일정 놓치지 않는 법" description="모집병 접수는 보통 며칠 안에 끝나고, 카투사와 사회복무요원 소집신청은 1년에 한 번뿐이에요. 일정을 챙기는 방법을 정리했어요." />
      <section className="card">
        <h2>1. 공식 모집계획을 먼저 확인해요</h2>
        <p>병무청은 매년 연간 모집계획을 공개하고, 회차별 접수기간·1차 발표·최종 발표·입영월을 함께 안내해요. 이 사이트의 일정은 공고 원문에서 옮긴 값만 쓰지만, 공고가 바뀌면 원문이 우선이에요.</p>
        <p><a href={MMA_PLANS_URL} target="_blank" rel="noopener noreferrer">병무청 모집계획 보기 ↗</a></p>
      </section>
      <section className="card">
        <h2>2. 다가오는 일정을 내 캘린더에 옮겨요</h2>
        <p>접수 시작일 아침과 마감 전날 저녁, 두 번 알림을 걸어 두면 좋아요. 마감 직전에는 지원률이 크게 움직이니 마감 전날 한 번 더 <Link to="/now">지금 접수 현황</Link>을 확인하세요.</p>
        <Status state={cal} empty={cal.data && !next.length ? '다가오는 일정이 없어요' : null} />
        {next.length > 0 && <ul>{next.map((e) => <li key={e.id}>{e.start}{e.end ? ` ~ ${e.end}` : ''} · {e.title}{!e.verified && <span className="badge gray"> 공고 확인 필요</span>}</li>)}</ul>}
        <p><Link to="/calendar">일정 전체 보기 →</Link></p>
      </section>
      <section className="card">
        <h2>3. 1년에 한 번뿐인 일정은 따로 표시해요</h2>
        <ul>
          <li><b>카투사</b>: 연 1회 접수하고 추첨으로 뽑아요. 평생 한 번만 지원할 수 있으니 어학 성적 유효기간을 미리 맞춰 두세요.</li>
          <li><b>사회복무요원 소집신청(본인선택)</b>: 다음 해 소집 일정과 기관을 고르는 기간이 짧아요. <Link to="/social">복무기관 찾기</Link></li>
          <li><b>일반병 입영일자 본인선택</b>: 보통 12월경 공지돼요. <Link to="/prepare">준비 체크리스트</Link></li>
        </ul>
      </section>
      <section className="card">
        <h2>4. 병무청 알림을 함께 써요</h2>
        <p>병무청 누리집과 병무민원포털에서 본인 일정과 통지서를 확인할 수 있어요. 이 사이트는 이메일이나 문자 알림을 보내지 않고 개인정보도 받지 않아요.</p>
        <p><a href={MMA_PORTAL_URL} target="_blank" rel="noopener noreferrer">병무민원포털 ↗</a></p>
      </section>
    </>
  );
}

export function About() {
  const stats = useApi('/api/stats');
  return (
    <>
      <PageHeading title="입대타이밍 소개" description="모집병 지원을 준비하는 사람이 공개 데이터를 한곳에서 읽을 수 있도록 만든 민간 정보 사이트예요." />
      <section className="card">
        <h2>무엇을 하는 곳인가요</h2>
        <p>입대타이밍은 병무청이 공공데이터포털에 공개한 모집병 접수현황, 군사특기 정보, 지원 자격, 선발 배점, 사회복무요원 복무기관 자료를 모아 읽기 쉽게 보여 줘요. 접수 중인 특기의 지원률을 비교하고, 내 신체조건과 자격으로 지원할 수 있는 특기를 찾고, 입영월에 따라 전역 시점을 계산할 수 있어요.</p>
        <p>제도 설명은 <Link to="/guide">입대 가이드</Link>에 정리했어요. 지원률 읽는 법, 배점 구조, 중복접수 규칙처럼 처음 지원하는 사람이 헷갈리기 쉬운 내용을 다뤄요.</p>
      </section>
      <section className="card">
        <h2>데이터는 어디서 오나요</h2>
        <ul>
          <li>접수현황: 병무청 「모집병 군지원 접수현황」 API를 서버에서 주기적으로 조회해요. 화면은 30초마다 갱신돼요.</li>
          <li>특기·자격·배점·구비서류: 병무청 공개 API를 미리 조회해 정리한 기준자료예요. 조회일은 <Link to="/status">운영 상태</Link>에 표시돼요.</li>
          <li>복무기간: 병무청 「군별 복무유형별 복무기간」 자료를 반영했어요.</li>
          <li>제도 규칙과 일정: 병무청 누리집 공고 원문을 보고 옮겼고, 출처 링크를 함께 적어요. 확인되지 않은 항목은 「공고 확인 필요」로 표시해요.</li>
        </ul>
        {stats.data && <p className="muted small">현재 특기 {stats.data.specialtiesTracked}개를 추적하고 접수현황 기록 {stats.data.snapshotsCount?.toLocaleString()}건을 보관하고 있어요.</p>}
      </section>
      <section className="card">
        <h2>운영 원칙</h2>
        <ul>
          <li><b>병무청과 무관한 민간 사이트</b>예요. 지원서 작성, 본인인증, 최종 확인은 항상 병무청 공식 화면으로 연결해요.</li>
          <li><b>개인정보를 모으지 않아요.</b> 회원가입이 없고, 특기 찾기에 넣은 신체조건과 자격은 검색에만 쓰고 저장하지 않아요.</li>
          <li><b>출처를 밝혀요.</b> 숫자와 규칙마다 어디서 가져왔는지, 언제 확인했는지 적어요.</li>
          <li><b>틀릴 수 있어요.</b> 공고가 바뀌거나 API가 늦게 갱신되면 화면과 실제가 다를 수 있어요. 지원 전에는 반드시 병무청에서 다시 확인하세요.</li>
        </ul>
      </section>
      <section className="card">
        <h2>운영자</h2>
        <p>개인 개발자가 운영해요. 오류 제보, 자료 정정 요청, 제휴·광고 문의는 <Link to="/contact">문의하기</Link>로 보내 주세요. 사이트 운영 비용은 페이지에 표시될 수 있는 광고로 충당해요. 광고 내용은 광고 사업자가 정하며 병무청이나 이 사이트가 보증하는 것이 아니에요.</p>
      </section>
    </>
  );
}

export function Contact() {
  const cfg = useApi('/api/public-config');
  const email = cfg.data?.contactEmail;
  return (
    <>
      <PageHeading title="문의하기" description="자료 오류, 정정 요청, 광고·제휴 문의를 받아요. 병역 상담은 병무청으로 해 주세요." />
      <section className="card">
        <h2>이메일</h2>
        {cfg.loading && <p className="muted">연락처를 불러오는 중이에요…</p>}
        {email ? <p><a href={`mailto:${email}`}>{email}</a></p> : !cfg.loading && <p className="muted">연락처가 아직 등록되지 않았어요. 운영자가 CONTACT_EMAIL 설정을 추가하면 여기에 표시돼요.</p>}
        <p className="muted small">보통 3일 안에 답장해요. 특기 데이터 오류를 알릴 때는 특기 이름과 화면 주소를 함께 적어 주시면 빨리 확인할 수 있어요.</p>
      </section>
      <section className="card">
        <h2>이런 문의는 병무청으로</h2>
        <p>개인별 병역 처분, 입영 연기, 신체검사 결과, 지원서 접수 오류처럼 본인 정보가 필요한 상담은 이 사이트에서 답할 수 없어요. 병무청 누리집의 민원 상담 또는 관할 지방병무청으로 문의하세요.</p>
        <p><a href="https://www.mma.go.kr" target="_blank" rel="noopener noreferrer">병무청 누리집 ↗</a> · <a href={MMA_PORTAL_URL} target="_blank" rel="noopener noreferrer">병무민원포털 ↗</a></p>
      </section>
      <section className="card">
        <h2>광고·제휴</h2>
        <p>이 사이트는 운영 비용을 위해 Google AdSense 광고를 게재할 예정이에요. 직접 광고나 제휴 제안은 이메일로 보내 주세요. 병역 제도를 오해하게 하거나 공식 기관을 사칭하는 광고는 받지 않아요.</p>
      </section>
    </>
  );
}

export function Privacy() {
  return (
    <>
      <PageHeading title="개인정보처리방침" description={`시행일 ${PRIVACY_UPDATED}`} />
      <section className="card">
        <h2>1. 수집하는 개인정보</h2>
        <p>입대타이밍은 회원가입, 로그인, 이메일 알림 신청을 제공하지 않으며 이름, 이메일, 전화번호 등 개인을 식별할 수 있는 정보를 직접 수집하지 않아요.</p>
        <p>「특기 찾기」에 입력한 신장·체중·시력·신체등급·자격 정보는 조회 요청에만 사용하고 서버 파일이나 데이터베이스에 저장하지 않아요. 요청이 끝나면 바로 버려요.</p>
      </section>
      <section className="card">
        <h2>2. 자동으로 생성되는 정보</h2>
        <p>서비스가 동작하는 과정에서 다음 정보가 자동으로 처리될 수 있어요.</p>
        <ul>
          <li>호스팅 서비스(Vercel)의 접속 로그: IP 주소, 접속 시각, 브라우저 정보. 보관 기간과 처리 방식은 호스팅 사업자의 정책을 따라요.</li>
          <li>요청 제한을 위한 IP별 요청 횟수: 서버 함수 메모리에만 잠시 집계하고 함수가 재시작되면 사라져요.</li>
          <li>방문 통계: 호스팅 사업자의 분석 기능(Vercel Analytics)으로 페이지별 방문 수를 집계해요. 쿠키를 쓰지 않고, 개인을 식별하는 정보나 입력값은 수집하지 않아요.</li>
        </ul>
      </section>
      <section className="card">
        <h2>3. 쿠키와 광고</h2>
        <p>이 사이트 자체는 로그인 쿠키나 추적 쿠키를 사용하지 않아요. 다만 페이지에 광고가 표시되는 경우 Google AdSense를 통해 제공되며, 이 과정에서 Google과 광고 파트너가 쿠키를 사용할 수 있어요.</p>
        <ul>
          <li>Google을 포함한 제3자 광고 사업자는 쿠키를 사용해 사용자가 이 사이트와 다른 사이트를 방문한 기록을 바탕으로 광고를 게재해요.</li>
          <li>Google의 광고 쿠키 사용에 대한 자세한 내용은 <a href="https://policies.google.com/technologies/ads?hl=ko" target="_blank" rel="noopener noreferrer">Google 광고 기술 안내</a>를 참고하세요.</li>
          <li>맞춤 광고를 원하지 않으면 <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer">Google 광고 설정</a>에서 해제할 수 있고, 다른 제3자 사업자의 맞춤 광고는 <a href="https://www.aboutads.info/choices/" target="_blank" rel="noopener noreferrer">aboutads.info</a>에서 해제할 수 있어요.</li>
          <li>브라우저 설정에서 쿠키를 차단할 수도 있어요. 쿠키를 차단해도 이 사이트의 모든 기능은 정상적으로 쓸 수 있어요.</li>
        </ul>
      </section>
      <section className="card">
        <h2>4. 외부 링크와 외부 서비스</h2>
        <p>병무청, 공공데이터포털, Q-Net 등 외부 사이트로 연결되는 링크가 있어요. 외부 사이트의 개인정보 처리는 각 사이트의 방침을 따르며 이 사이트가 책임지지 않아요. 병무청 공공데이터 API 호출은 서버에서만 이루어지고, 사용자의 정보는 API 요청에 포함되지 않아요.</p>
      </section>
      <section className="card">
        <h2>5. 아동의 개인정보</h2>
        <p>이 사이트는 만 14세 미만 아동을 대상으로 하지 않으며 아동의 개인정보를 의도적으로 수집하지 않아요.</p>
      </section>
      <section className="card">
        <h2>6. 이용자의 권리와 문의</h2>
        <p>개인정보를 직접 수집하지 않기 때문에 열람·정정·삭제를 요청할 개인정보가 서버에 남아 있지 않아요. 광고 쿠키에 관한 설정은 위 3항의 링크에서 직접 바꿀 수 있어요. 이 방침에 대한 질문은 <Link to="/contact">문의하기</Link>로 보내 주세요.</p>
      </section>
      <section className="card">
        <h2>7. 방침의 변경</h2>
        <p>방침이 바뀌면 이 페이지에 변경 내용과 시행일을 적어요. 광고 사업자나 분석 도구를 새로 도입하면 도입 전에 이 페이지에 먼저 반영해요.</p>
        <p className="muted small">시행일: {PRIVACY_UPDATED}</p>
      </section>
    </>
  );
}

export function Terms() {
  return (
    <>
      <PageHeading title="이용약관" description={`시행일 ${PRIVACY_UPDATED}`} />
      <section className="card">
        <h2>1. 서비스의 성격</h2>
        <p><b>입대타이밍은 민간이 운영하는 정보 사이트이며 병무청, 국방부 등 어떤 공공기관과도 관계가 없어요.</b> 이 사이트는 병역 처분, 지원서 접수, 합격 판정 등 어떤 행정 절차도 대신하지 않아요. 지원과 본인인증은 반드시 병무청 공식 화면에서 진행해야 해요.</p>
      </section>
      <section className="card">
        <h2>2. 정보의 정확성과 책임의 한계</h2>
        <p>이 사이트의 숫자와 설명은 공공데이터와 공고 원문을 바탕으로 하지만, 데이터 갱신 지연, 공고 변경, 처리 과정의 오류로 실제와 다를 수 있어요. 지원률은 접수 중 계속 바뀌며 최종 합격을 뜻하거나 보장하지 않아요.</p>
        <p>이용자는 지원 전 병무청에서 접수기간, 지원 자격, 배점을 직접 확인해야 하며, 이 사이트의 정보를 근거로 내린 판단과 그 결과에 대해 운영자는 법적 책임을 지지 않아요. 다만 명백한 오류를 알려 주시면 빠르게 고칠게요.</p>
      </section>
      <section className="card">
        <h2>3. 데이터 출처와 저작권</h2>
        <ul>
          <li>모집병 접수현황, 군사특기 정보, 지원 자격, 선발 배점, 사회복무요원 복무기관 자료는 병무청이 공공데이터포털에 개방한 자료를 이용허락 범위에 따라 사용해요. 각 화면에 출처와 조회일을 표시해요.</li>
          <li>제도 설명, 가이드 글, 화면 구성 등 이 사이트가 직접 작성한 콘텐츠의 저작권은 운영자에게 있어요. 출처를 밝히고 링크하는 인용은 환영하지만, 글 전체를 옮겨 싣거나 상업적으로 재배포하려면 먼저 문의해 주세요.</li>
          <li>병무청 등 외부 기관의 명칭과 자료는 해당 기관의 권리예요.</li>
        </ul>
      </section>
      <section className="card">
        <h2>4. 광고</h2>
        <p>이 사이트에는 Google AdSense 등 제3자 광고가 표시될 수 있어요. 광고의 내용과 광고주가 제공하는 상품·서비스는 광고주의 책임이며, 운영자나 병무청이 보증하는 것이 아니에요. 광고를 반복해서 클릭하거나 자동화된 방법으로 조회수를 늘리는 행위는 금지돼요.</p>
      </section>
      <section className="card">
        <h2>5. 금지 행위</h2>
        <ul>
          <li>자동화된 도구로 짧은 시간에 대량 요청을 보내 서비스를 방해하는 행위</li>
          <li>이 사이트의 화면이나 API를 공식 기관의 것처럼 꾸며 제3자에게 제공하는 행위</li>
          <li>법령이나 공서양속에 어긋나는 목적으로 이용하는 행위</li>
        </ul>
        <p>운영자는 서비스 보호를 위해 요청 횟수를 제한하거나 특정 접근을 차단할 수 있어요.</p>
      </section>
      <section className="card">
        <h2>6. 서비스 변경과 약관 개정</h2>
        <p>운영자는 서비스 내용을 예고 없이 바꾸거나 중단할 수 있어요. 약관을 바꾸면 이 페이지에 변경 내용과 시행일을 적어요. 이 약관은 대한민국 법률을 따라요.</p>
        <p className="muted small">시행일: {PRIVACY_UPDATED} · 문의: <Link to="/contact">문의하기</Link></p>
      </section>
    </>
  );
}
