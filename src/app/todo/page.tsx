import type { Metadata } from "next";
import Todo from "@/components/Todo";

export const metadata: Metadata = {
  title: "입대 전 할 일 체크리스트 · D-30부터 D-1까지 | 입대타이밍",
  alternates: { canonical: "/todo" },
  description: "군휴학, 휴대폰 요금제, 적금 은행, 서류, 머리까지 입영일 기준으로 할 일을 날짜와 함께 보여 줘요.",
};

export default function Page() {
  return <Todo />;
}
