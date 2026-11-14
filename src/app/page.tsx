import Home from "@/legacy/pages/Home.jsx";
import ClientOnly from "@/legacy/ClientOnly.jsx";
import type { Metadata } from "next";

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default function Page() {
  return (
    <ClientOnly>
      <Home />
    </ClientOnly>
  );
}
