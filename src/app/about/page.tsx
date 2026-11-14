import type { Metadata } from "next";
import { About as About } from "@/legacy/pages/Misc.jsx";

export const metadata: Metadata = {
  title: "입대타이밍 소개 | 입대타이밍",
  description: "모집병 지원을 준비하는 사람이 공개 데이터를 한곳에서 읽을 수 있도록 만든 민간 정보 사이트예요.",
  alternates: { canonical: "/about" },
};

export default function Page() {
  return <About />;
}
