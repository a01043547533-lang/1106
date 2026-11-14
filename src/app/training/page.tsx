import type { Metadata } from "next";
import Training from "@/components/Training";

export const metadata: Metadata = {
  title: "훈련소 준비물 2026 · 육군훈련소·신교대·해군·공군·해병대 | 입대타이밍",
  alternates: { canonical: "/training" },
  description: "훈련소별 입영 준비물, 사 갈 필요 없는 지급품, 반입 금지 물품을 공지 기준으로 정리한 체크리스트예요. 사단 신교대 16곳 수료식 정보도 있어요.",
};

export default function Page() {
  return <Training />;
}
