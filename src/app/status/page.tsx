import type { Metadata } from "next";
import OperationStatus from "@/legacy/pages/Status.jsx";
import ClientOnly from "@/legacy/ClientOnly.jsx";

export const metadata: Metadata = {
  title: "서비스 운영 상태 | 입대타이밍",
  description: "현재 서버 함수의 API 조회 상태를 표시해요. 함수가 재시작되면 임시 기록이 초기화됩니다. 이 화면은 1분마다 갱신됩니다.",
  robots: { index: false, follow: true },
  alternates: { canonical: "/status" },
};

export default function Page() {
  return (
    <ClientOnly>
      <OperationStatus />
    </ClientOnly>
  );
}
