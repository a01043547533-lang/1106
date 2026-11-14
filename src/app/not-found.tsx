import type { Metadata } from "next";
import { NotFound } from "@/legacy/Shell.jsx";

export const metadata: Metadata = {
  title: "페이지를 찾을 수 없어요 | 입대타이밍",
  robots: { index: false, follow: true },
};

export default function NotFoundPage() {
  return <NotFound />;
}
