import type { Metadata } from "next";
import { MosDetail as MosDetail } from "@/legacy/pages/Mos.jsx";
import ClientOnly from "@/legacy/ClientOnly.jsx";
import { mosDetail } from "../../../../server/queries.js";

// 특기 상세는 브라우저에서 그리지만, 제목·설명·canonical은 서버에서 특기별로 만들어 준다.
// 그래야 검색엔진이 수백 개 특기 페이지를 "같은 페이지(중복)"로 보지 않는다.
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ code: string }>; searchParams: Promise<{ branch?: string | string[] }> };

type Detail = {
  ambiguous?: boolean;
  mosCode: string;
  mosName?: string;
  branch?: string;
  branches?: string[];
  category?: string | null;
  choices?: { branch: string; mosName: string }[];
  snapshot?: { rate?: number | string | null; applyEnd?: string | null; roundLabel?: string | null } | null;
  eligibilityTotal?: number;
};

const pickBranch = (b?: string | string[]) => (Array.isArray(b) ? b[0] : b) || null;
// server/queries.js는 JS라서 기본값 null만 보고 타입을 좁게 잡는다. 실제로는 군 이름 문자열도 받는다.
const detailOf = mosDetail as unknown as (code: string, branch: string | null) => Detail | null;

function load(code: string, branch: string | null): Detail | null {
  try {
    return detailOf(code, branch);
  } catch {
    return null;
  }
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { code: raw } = await params;
  const code = decodeURIComponent(raw);
  const branch = pickBranch((await searchParams).branch);
  const d = load(code, branch);

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

export default function Page() {
  return (
    <ClientOnly>
      <MosDetail />
    </ClientOnly>
  );
}
