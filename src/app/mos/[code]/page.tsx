import type { Metadata } from "next";
import { cache } from "react";
import { MosDetail as MosDetail } from "@/legacy/pages/Mos.jsx";
import ClientOnly from "@/legacy/ClientOnly.jsx";
import { describeMos } from "@/legacy/lib/describe.js";
import { mosDetail } from "../../../../server/queries.js";

// 특기 상세 화면은 브라우저에서 그리지만, 제목·설명·canonical과 본문 요약은 서버에서 특기별로 만든다.
// 서버 HTML에 본문이 없으면 검색엔진이 수백 개 특기 페이지를 "같은 페이지(중복)"로 본다.
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ code: string }>; searchParams: Promise<{ branch?: string | string[] }> };

type Detail = {
  ambiguous?: boolean;
  mosCode: string;
  mosName?: string;
  branch?: string;
  branches?: string[];
  category?: string | null;
  choices?: { branch: string; mosName: string; category?: string | null }[];
  snapshot?: { rate?: number | string | null; applyEnd?: string | null; roundLabel?: string | null } | null;
  finalRates?: { roundLabel?: string; rate?: number | null }[];
  eligibilityTotal?: number;
  eligibilityKinds?: Record<string, number>;
  serviceTerm?: { months?: number; type?: string } | null;
};

const pickBranch = (b?: string | string[]) => (Array.isArray(b) ? b[0] : b) || null;
// server/queries.js는 JS라서 기본값 null만 보고 타입을 좁게 잡는다. 실제로는 군 이름 문자열도 받는다.
const detailOf = mosDetail as unknown as (code: string, branch: string | null) => Detail | null;
const describe = describeMos as unknown as (d: Detail) => string[];

// 제목 만들기와 본문 그리기가 같은 요청에서 한 번만 계산하게 한다.
const load = cache((code: string, branch: string | null): Detail | null => {
  try {
    return detailOf(code, branch);
  } catch {
    return null;
  }
});

async function resolve({ params, searchParams }: Props) {
  const { code: raw } = await params;
  const code = decodeURIComponent(raw);
  const branch = pickBranch((await searchParams).branch);
  return load(code, branch);
}

const href = (code: string, branch?: string | null) =>
  `/mos/${encodeURIComponent(code)}${branch ? `?branch=${encodeURIComponent(branch)}` : ""}`;

export async function generateMetadata(props: Props): Promise<Metadata> {
  const d = await resolve(props);

  if (!d) {
    return { title: "특기를 찾을 수 없어요 | 입대타이밍", robots: { index: false, follow: true } };
  }

  const path = `/mos/${encodeURIComponent(d.mosCode)}`;

  // 같은 코드를 여러 군이 쓰는데 군을 고르지 않은 주소: 선택 페이지. 표준 주소는 코드만.
  if (d.ambiguous) {
    const names = (d.choices || []).map((c) => `${c.branch} ${c.mosName}`).join(", ");
    return {
      title: `특기코드 ${d.mosCode} 모집병 (${names}) | 입대타이밍`,
      description: `특기코드 ${d.mosCode}은 ${names}에 있어요. 군을 고르면 지원률·접수 일정·지원 자격을 볼 수 있어요.`,
      alternates: { canonical: path },
    };
  }

  const shared = (d.branches || []).length > 1;
  // 여러 군이 함께 쓰는 코드는 군까지 들어간 주소가 표준이고, 아니면 ?branch= 없는 주소가 표준이다.
  const canonical = shared && d.branch ? `${path}?branch=${encodeURIComponent(d.branch)}` : path;
  const name = `${d.branch || ""} ${d.mosName || d.mosCode}`.trim();
  const bits = [
    d.category ? `${d.category}` : null,
    d.snapshot?.rate != null && d.snapshot.rate !== "" ? `현재 지원률 ${d.snapshot.rate}` : null,
    d.snapshot?.applyEnd ? `접수 마감 ${String(d.snapshot.applyEnd).slice(0, 10)}` : null,
    d.eligibilityTotal ? `지원 자격 ${d.eligibilityTotal}건` : null,
  ].filter(Boolean);
  const description = `${name}(특기코드 ${d.mosCode}) 모집병의 지원률, 회차별 경쟁률, 접수 일정, 신체조건과 자격·면허·전공 조건을 병무청 공공데이터로 확인하세요.${bits.length ? ` ${bits.join(" · ")}.` : ""}`;

  return {
    title: `${name}(${d.mosCode}) 모집병 지원률·일정·지원자격 | 입대타이밍`,
    description,
    alternates: { canonical },
    openGraph: { title: `${name} 모집병 지원률·일정 | 입대타이밍`, description, url: canonical, type: "website" },
  };
}

// 서버 HTML에 들어가는 특기 요약. 브라우저가 붙으면 전체 화면(MosDetail)으로 바뀐다.
function Summary({ d }: { d: Detail }) {
  if (d.ambiguous) {
    return (
      <article>
        <nav className="crumb" aria-label="위치"><a href="/">입대타이밍</a> › <a href="/mos">특기 목록</a> › 특기코드 {d.mosCode}</nav>
        <h1>특기코드 {d.mosCode}은 여러 군에 있어요</h1>
        <p>특기 코드는 군마다 따로 매겨져서 같은 코드가 다른 군의 다른 특기를 가리켜요. 보려는 특기를 골라 주세요.</p>
        <ul>
          {(d.choices || []).map((c) => (
            <li key={c.branch}><a href={href(d.mosCode, c.branch)}>{c.branch} {c.mosName}</a>{c.category ? ` · ${c.category}` : ""}</li>
          ))}
        </ul>
      </article>
    );
  }

  const name = d.mosName || d.mosCode;
  const shared = (d.branches || []).length > 1;
  const kinds = Object.entries(d.eligibilityKinds || {}).filter(([, v]) => v > 0);
  const rates = [...(d.finalRates || [])]
    .filter((r) => r.rate != null)
    .sort((a, b) => String(b.roundLabel).localeCompare(String(a.roundLabel), "ko", { numeric: true }))
    .slice(0, 6);

  return (
    <article>
      <nav className="crumb" aria-label="위치"><a href="/">입대타이밍</a> › <a href="/mos">특기 목록</a> › {name}</nav>
      <h1>{name} 경쟁률·지원자격</h1>
      <p className="muted">{[d.branch, d.category].filter(Boolean).join(" · ")} 모집병 · 특기코드 {d.mosCode}</p>
      {describe(d).map((p) => <p key={p} className="lead">{p}</p>)}
      {d.serviceTerm?.months ? <p>{d.branch} {d.serviceTerm.type || "현역병"} 복무기간은 {d.serviceTerm.months}개월이에요.</p> : null}
      {kinds.length > 0 && (
        <section>
          <h2>{name} 지원 자격</h2>
          <ul>{kinds.map(([k, v]) => <li key={k}>{k} {v.toLocaleString()}종</li>)}</ul>
        </section>
      )}
      {rates.length > 0 && (
        <section>
          <h2>{name} 회차별 지원률</h2>
          <ul>{rates.map((r) => <li key={r.roundLabel}>{r.roundLabel}회차 · {Number(r.rate).toFixed(2)}:1</li>)}</ul>
        </section>
      )}
      {shared && (
        <p>특기코드 {d.mosCode}은 {(d.branches || []).filter((b) => b !== d.branch).map((b) => `${b}`).join(", ")}에도 있어요. 이 페이지는 {d.branch} 특기만 보여 줘요.</p>
      )}
      <p><a href={`/calc?mos=${encodeURIComponent(d.mosCode)}${shared && d.branch ? `&branch=${encodeURIComponent(d.branch)}` : ""}`}>{name} 예상 배점 계산하기</a> · <a href="/mos">다른 특기 보기</a></p>
    </article>
  );
}

export default async function Page(props: Props) {
  const d = await resolve(props);
  return (
    <ClientOnly fallback={d ? <Summary d={d} /> : null}>
      <MosDetail />
    </ClientOnly>
  );
}
