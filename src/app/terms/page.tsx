import type { Metadata } from "next";
import { Terms as Terms } from "@/legacy/pages/Misc.jsx";

export const metadata: Metadata = {
  title: "이용약관 | 입대타이밍",
  description: "입대타이밍 이용 조건, 정보의 성격(민간 정보 사이트), 책임 범위를 안내하는 이용약관이에요.",
  alternates: { canonical: "/terms" },
};

export default function Page() {
  return <Terms />;
}
