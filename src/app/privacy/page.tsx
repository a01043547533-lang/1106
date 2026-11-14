import type { Metadata } from "next";
import { Privacy as Privacy } from "@/legacy/pages/Misc.jsx";

export const metadata: Metadata = {
  title: "개인정보처리방침 | 입대타이밍",
  description: "입대타이밍이 어떤 정보를 수집하지 않고, 문의 메일은 어떻게 처리하는지 안내하는 개인정보처리방침이에요.",
  alternates: { canonical: "/privacy" },
};

export default function Page() {
  return <Privacy />;
}
