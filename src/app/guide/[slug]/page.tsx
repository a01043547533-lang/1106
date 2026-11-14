import type { Metadata } from "next";
import { GuideArticle as GuideArticle } from "@/legacy/pages/Guide.jsx";
import { GUIDES } from "@/legacy/lib/guide-list.js";

type G = { slug: string; title: string; summary: string };

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const g = (GUIDES as G[]).find((x) => x.slug === slug);
  if (!g) return { title: "글을 찾을 수 없어요 | 입대타이밍", robots: { index: false, follow: true } };
  return { title: `${g.title} | 입대타이밍`, description: g.summary, alternates: { canonical: `/guide/${g.slug}` } };
}

export default function Page() {
  return <GuideArticle />;
}
