import { MosDetail as MosDetail } from "@/legacy/pages/Mos.jsx";
import ClientOnly from "@/legacy/ClientOnly.jsx";

export default function Page() {
  return (
    <ClientOnly>
      <MosDetail />
    </ClientOnly>
  );
}
