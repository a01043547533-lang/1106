// 주요 화면의 서버 HTML 본문 요약.
// 실제 화면은 브라우저에서 그려지므로(ClientOnly), 검색엔진·광고 심사 로봇이 처음 받는 HTML에는 메뉴만 남는다.
// 그래서 같은 공개 데이터로 만든 요약을 fallback으로 넣고, 브라우저가 붙으면 원래 화면으로 바뀐다.
import { GUIDES } from "@/legacy/lib/guide-list.js";
import * as q from "../../../server/queries.js";

type Snap = { branch?: string; category?: string; mosCode?: string; mosName?: string; roundLabel?: string; applyStart?: string; applyEnd?: string; quota?: number; applicants?: number; rate?: number | null };
type Group = { branch: string; roundLabel?: string; category?: string; applyStart?: string; applyEnd?: string; specialties: number; quota: number; enlistMonths: string[] };
type BranchStatus = { branch: string; openRounds: number; openSpecialties: number; next: Group | null; lastEnd: string | null; lastRound: string | null };
type NowData = { count: number; items: Snap[]; upcoming: Group[]; branchStatus: BranchStatus[] };
type Event = { id: string; kind?: string; title: string; start?: string; end?: string; target?: string; note?: string };
type MosItem = { mosCode: string; mosName: string; branch: string; category?: string; shared?: boolean };
type Guide = { slug: string; title: string; summary: string };

// 자료를 못 읽어도 화면은 떠야 하므로, 실패하면 빈 값으로 둔다.
function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

const nowData = () => safe(() => (q.nowList as unknown as () => NowData)(), { count: 0, items: [], upcoming: [], branchStatus: [] });
const events = () => safe(() => (q.calendarList as unknown as () => { items: Event[] })().items, [] as Event[]);
const mosList = () => safe(() => (q.mosIndex as unknown as () => MosItem[])(), [] as MosItem[]);
const stats = () => safe(() => (q.stats as unknown as () => { specialtiesTracked: number; snapshotsCount: number })(), { specialtiesTracked: 0, snapshotsCount: 0 });
const guides = GUIDES as Guide[];

const mosHref = (m: MosItem) => `/mos/${encodeURIComponent(m.mosCode)}${m.shared ? `?branch=${encodeURIComponent(m.branch)}` : ""}`;
const day = (s?: string | null) => (s ? String(s).slice(0, 10) : "");
const rate = (r?: number | null) => (r == null || !Number.isFinite(Number(r)) ? "-" : `${Number(r).toFixed(2)}:1`);
const BRANCHES = ["육군", "해군", "공군", "해병대"];

function byBranch(list: MosItem[]) {
  const groups: Record<string, MosItem[]> = {};
  for (const m of list) (groups[m.branch || "기타"] ||= []).push(m);
  return Object.entries(groups).sort(([a], [b]) => {
    const ia = BRANCHES.indexOf(a), ib = BRANCHES.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
}

function BranchStatusList({ data }: { data: NowData }) {
  return (
    <ul>
      {data.branchStatus.map((b) => (
        <li key={b.branch}>
          <b>{b.branch}</b>:{" "}
          {b.openRounds > 0
            ? `지금 ${b.openRounds}개 회차, ${b.openSpecialties}개 특기를 접수 중이에요.`
            : `지금 접수 중인 회차가 없어요.${b.lastEnd ? ` 지난 접수는 ${b.lastRound ? `${b.lastRound}회차로 ` : ""}${day(b.lastEnd)}에 마감됐어요.` : ""}`}
          {b.next ? ` 다음 접수는 ${day(b.next.applyStart)}부터 ${day(b.next.applyEnd)}까지예요.` : ""}
        </li>
      ))}
    </ul>
  );
}

function GuideLinks({ limit = guides.length }: { limit?: number }) {
  return (
    <ul>
      {guides.slice(0, limit).map((g) => (
        <li key={g.slug}><a href={`/guide/${g.slug}`}>{g.title}</a> · {g.summary}</li>
      ))}
    </ul>
  );
}

export function HomeSummary() {
  const now = nowData();
  const ev = events().slice(0, 6);
  const st = stats();
  const mos = mosList();
  return (
    <article>
      <h1>입대 계획부터 전역까지, 입대타이밍</h1>
      <p className="lead">입대타이밍은 병무청 공공데이터로 육군·해군·공군·해병대 모집병의 접수 현황과 지원률, 특기별 지원 자격, 모집 일정을 한곳에 모아 보여 주는 사이트예요. 입대 후에는 전역일 계산기로 진급일, 군인 월급, 적금, 수료식 날짜까지 확인할 수 있어요.</p>
      <p>지금까지 {st.specialtiesTracked.toLocaleString()}개 특기의 접수 기록 {st.snapshotsCount.toLocaleString()}건을 모았고, 특기 {mos.length.toLocaleString()}개의 신체조건·자격·면허·전공 기준을 정리했어요. 지원은 병무청 누리집에서 하고, 이 사이트는 지원 전에 비교하고 계획하는 데 써요.</p>

      <section>
        <h2>군별 접수 상황</h2>
        <BranchStatusList data={now} />
        <p><a href="/now">지금 접수 중인 특기와 실시간 지원률 보기</a></p>
      </section>

      {ev.length > 0 && (
        <section>
          <h2>다가오는 일정</h2>
          <ul>{ev.map((e) => <li key={e.id}>{e.title} · {day(e.start)}{e.end && e.end !== e.start ? ` ~ ${day(e.end)}` : ""}</li>)}</ul>
          <p><a href="/calendar">전체 접수 일정 보기</a></p>
        </section>
      )}

      <section>
        <h2>무엇을 할 수 있나요</h2>
        <ul>
          <li><a href="/find">내 조건으로 특기 찾기</a>: 키·몸무게·시력·신체등급과 가진 자격을 넣으면 지원할 수 있는 특기와 안 되는 이유를 알려 줘요.</li>
          <li><a href="/calc">예상 배점 계산기</a>: 특기와 자격·면허·전공을 고르면 병무청 선발배점기준으로 예상 점수를 계산해요.</li>
          <li><a href="/mos">특기 전체 목록</a>: 군별 모집병 특기의 경쟁률과 지원 자격을 볼 수 있어요.</li>
          <li><a href="/plan">입영월 플래너</a>: 학업·취업 일정에 맞춰 입영월과 전역 시점을 계획해요.</li>
          <li><a href="/service">전역일 계산기</a>, <a href="/pay">군인 월급표</a>, <a href="/training">훈련소 준비물</a>: 입대 후에 필요한 정보예요.</li>
        </ul>
      </section>

      <section>
        <h2>처음이라면 가이드부터</h2>
        <GuideLinks limit={8} />
        <p><a href="/guide">가이드 전체 보기</a></p>
      </section>
    </article>
  );
}

export function NowSummary() {
  const now = nowData();
  const top = now.items.slice(0, 30);
  return (
    <article>
      <h1>지금 접수 중인 모집병 실시간 지원률</h1>
      <p className="lead">지원률은 접수인원을 모집인원으로 나눈 값이에요. 1.0 미만이면 모집인원보다 지원자가 적은 미달이고, 3.0 이상이면 붐비는 특기로 표시해요. 접수 마감 직전에는 지원자가 몰려 숫자가 크게 바뀌니 마감일까지 함께 보세요.</p>
      <section>
        <h2>군별 접수 상황</h2>
        <BranchStatusList data={now} />
      </section>
      {top.length > 0 ? (
        <section>
          <h2>접수 중인 특기 {now.count.toLocaleString()}개 · 지원률 낮은 순</h2>
          <ul>{top.map((s, i) => <li key={`${s.branch}-${s.mosCode}-${s.roundLabel}-${i}`}>{s.branch} {s.mosName} · 모집 {s.quota ?? "-"}명 · 접수 {s.applicants ?? "-"}명 · 지원률 {rate(s.rate)} · 마감 {day(s.applyEnd)}</li>)}</ul>
        </section>
      ) : (
        <p>지금은 모든 군이 접수 기간이 아니에요. 다음 회차 접수가 시작되면 이 페이지에 특기별 지원률이 실시간으로 표시돼요.</p>
      )}
      {now.upcoming.length > 0 && (
        <section>
          <h2>곧 시작하는 접수</h2>
          <ul>{now.upcoming.slice(0, 10).map((g, i) => <li key={i}>{g.branch} {g.category || ""} {g.roundLabel ? `${g.roundLabel}회차` : ""} · {day(g.applyStart)} ~ {day(g.applyEnd)} · 특기 {g.specialties}개</li>)}</ul>
        </section>
      )}
      <p><a href="/guide/rate-reading">지원률 읽는 법 · 미달이면 합격인가요?</a> · <a href="/closing">마감 임박 특기</a> · <a href="/calendar">접수 일정</a></p>
    </article>
  );
}

export function FindSummary() {
  const mos = mosList();
  return (
    <article>
      <h1>내 조건으로 갈 수 있는 군 특기 찾기</h1>
      <p className="lead">키·몸무게·시력·신체등급과 가지고 있는 자격·면허·전공을 넣으면, 지원할 수 있는 모집병 특기와 지원할 수 없는 이유를 함께 알려 줘요. 조건을 전부 비워도 검색할 수 있어요.</p>
      <section>
        <h2>이렇게 찾아요</h2>
        <ol>
          <li>1단계 내 조건: 신장, 체중, 시력, 병역판정 신체등급을 입력해요. 모르는 항목은 비워 둬도 돼요.</li>
          <li>2단계 내 자격·면허·전공: 국가기술자격증, 운전면허, 전공 학과를 고르면 그 자격을 인정하는 특기를 찾아요.</li>
          <li>3단계 지원 희망 군: 육군·해군·공군·해병대 중 원하는 군만 골라 볼 수 있어요.</li>
        </ol>
        <p>결과는 병무청이 공개한 특기별 신체 기준과 자격·면허·전공 인정 목록으로 판단해요. 최종 지원 자격은 해당 회차 모집 공고에서 꼭 확인하세요.</p>
      </section>
      <section>
        <h2>군별 모집병 특기 수</h2>
        <ul>{byBranch(mos).map(([b, list]) => <li key={b}>{b} {list.length}개 특기</li>)}</ul>
      </section>
      <p><a href="/mos">특기 전체 목록</a> · <a href="/guide/physical-check">신체조건과 입영판정검사 안내</a> · <a href="/guide/score-basics">자격·면허·전공 배점 안내</a></p>
    </article>
  );
}

export function CalcSummary() {
  const mos = mosList().filter((m) => m.category && m.category !== "취업맞춤특기병");
  const sample = byBranch(mos).map(([b, list]) => [b, list.slice(0, 8)] as const);
  return (
    <article>
      <h1>예상 배점 계산기</h1>
      <p className="lead">지원할 특기를 고르고 가지고 있는 자격·면허·전공을 선택하면 병무청 선발배점기준으로 예상 합계 점수를 계산해요. 보유 자격을 고르면 그 특기에서 인정하는 등급을 자동으로 맞춰 줘요.</p>
      <section>
        <h2>계산 순서</h2>
        <ol>
          <li>어느 특기의 배점을 볼지 고릅니다. 특기 이름이나 특기 코드로 찾을 수 있어요.</li>
          <li>가지고 있는 자격·면허·전공을 고릅니다. 같은 종류는 가장 높은 점수 하나만 반영돼요.</li>
          <li>항목별 배점과 합계를 확인합니다. 2025년 12월 30일 접수부터 출결·면접 배점이 없어진 새 기준을 써요.</li>
        </ol>
        <p>계산 결과는 공개된 배점표로 낸 예상치예요. 가산점과 동점자 처리 기준은 회차 공고마다 다를 수 있어요.</p>
      </section>
      <section>
        <h2>특기별 배점 바로 계산하기</h2>
        {sample.map(([b, list]) => (
          <p key={b}><b>{b}</b>: {list.map((m, i) => <span key={`${m.branch}-${m.mosCode}`}>{i ? " · " : ""}<a href={`/calc?${new URLSearchParams({ mos: m.mosCode, ...(m.shared ? { branch: m.branch } : {}) })}`}>{m.mosName}</a></span>)}</p>
        ))}
      </section>
      <p><a href="/guide/score-basics">자격·면허·전공 배점은 어떻게 반영되나요?</a> · <a href="/find">내 조건으로 특기 찾기</a></p>
    </article>
  );
}

export function CalendarSummary() {
  const ev = events();
  return (
    <article>
      <h1>모집병·사회복무요원·카투사 접수 일정</h1>
      <p className="lead">다가오는 모집병, 사회복무요원, 카투사 접수 일정을 시간순으로 모았어요. 날짜는 병무청 공고 원문과 공공데이터에서 옮긴 값만 쓰고, 아직 공고가 나오지 않은 일정은 나오는 대로 추가해요.</p>
      {ev.length > 0 ? (
        <section>
          <h2>다가오는 일정 {ev.length}건</h2>
          <ul>{ev.slice(0, 40).map((e) => <li key={e.id}>{e.kind ? `[${e.kind}] ` : ""}{e.title} · {day(e.start)}{e.end && e.end !== e.start ? ` ~ ${day(e.end)}` : ""}{e.target ? ` · ${e.target}` : ""}</li>)}</ul>
        </section>
      ) : (
        <p>지금 등록된 다가오는 일정이 없어요. 병무청 공고가 나오면 바로 추가돼요.</p>
      )}
      <p><a href="/now">지금 접수 중인 특기</a> · <a href="/guide/recruit-flow">모집병 지원 절차 한눈에 보기</a> · <a href="/guide/katusa">카투사 지원 조건</a></p>
    </article>
  );
}

export function MosIndexSummary() {
  const mos = mosList();
  return (
    <article>
      <h1>모집병 특기 전체 목록</h1>
      <p className="lead">육군·해군·공군·해병대 모집병 특기 {mos.length.toLocaleString()}개를 군별로 모았어요. 특기를 누르면 신체조건, 지원 자격·면허·전공, 회차별 경쟁률을 볼 수 있어요.</p>
      {byBranch(mos).map(([b, list]) => (
        <section key={b}>
          <h2>{b} 모집병 특기 ({list.length})</h2>
          <ul>{list.map((m) => <li key={`${m.branch}-${m.mosCode}-${m.category}`}><a href={mosHref(m)}>{m.mosName}</a>{m.category ? ` · ${m.category}` : ""}</li>)}</ul>
        </section>
      ))}
    </article>
  );
}
