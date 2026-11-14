"use client";
// 훈련소별 준비물 (2탄). 1탄 준비 체크리스트와 같은 card·checklist 모양.
import { useEffect, useState } from "react";
import Link from "next/link";
import { listCenters, getCenter, COMMON, type Item, type Center } from "@/lib/centers";
import { formatShort } from "@/lib/date";
import { PageHeading } from "@/components/PageHeading";

const GROUPS: { key: "docs" | "required" | "recommended" | "skip" | "banned"; title: string; note?: string }[] = [
  { key: "docs", title: "입영 날 들고 갈 서류" },
  { key: "required", title: "챙겨 갈 물건" },
  { key: "recommended", title: "있으면 편한 것", note: "공식 목록이 아니라 많이 꼽히는 품목이에요. 반입 기준은 부대 안내가 우선이에요." },
  { key: "skip", title: "사 갈 필요 없어요 (부대에서 줘요)" },
  { key: "banned", title: "가져가면 안 되는 것" },
];

export default function Training() {
  const centers = listCenters();
  const [id, setId] = useState("nonsan");
  const [division, setDivision] = useState("");
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    /* eslint-disable react-hooks/set-state-in-effect */
    if (q.get("c") && getCenter(q.get("c")!)) setId(q.get("c")!);
    if (q.get("v")) setDivision(q.get("v")!);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setChecked(JSON.parse(localStorage.getItem(`ck:${id}`) ?? "{}"));
    } catch {
      setChecked({});
    }
    const q = new URLSearchParams({ c: id });
    if (id === "division" && division) q.set("v", division);
    window.history.replaceState(null, "", `?${q}`);
  }, [id, division]);

  function toggle(name: string) {
    setChecked((prev) => {
      const next = { ...prev, [name]: !prev[name] };
      try {
        localStorage.setItem(`ck:${id}`, JSON.stringify(next));
      } catch {
        /* 저장 못 해도 동작 */
      }
      return next;
    });
  }

  const c = centers.find((x) => x.id === id) as Center;
  const dv = id === "division" ? c.divisions?.find((d) => d.id === division) : undefined;
  const lists: Record<string, Item[]> = {
    docs: dedupe([...COMMON.docs, ...c.docs]),
    required: c.required,
    recommended: c.recommended,
    skip: c.skip,
    banned: dedupe([...COMMON.banned, ...c.banned]),
  };
  const all = [...lists.docs, ...lists.required];
  const done = all.filter((i) => checked[i.name]).length;

  return (
    <>
      <PageHeading
        title="훈련소 준비물 2026 · 훈련소별 체크리스트"
        description="입영하는 훈련소를 고르면 그곳 공지 기준으로 챙길 것, 사 갈 필요 없는 것, 가져가면 안 되는 것을 보여 줘요. 체크한 항목은 이 브라우저에만 저장돼요."
      />

      <div className="tabs mode-tabs" role="group" aria-label="훈련소">
        {centers.map((x) => (
          <button key={x.id} type="button" aria-pressed={x.id === id} className={x.id === id ? "on" : ""} onClick={() => setId(x.id)}>
            {x.short}
          </button>
        ))}
      </div>

      {id === "division" && (
        <section className="card goal-box">
          <h2>어느 사단 신병교육대인가요?</h2>
          <div className="row">
            <label>
              사단
              <select value={division} onChange={(e) => setDivision(e.target.value)}>
                <option value="">선택</option>
                {c.divisions?.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                    {d.nick ? ` (${d.nick})` : ""} · {d.place}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {dv ? (
            <div className="goal-result">
              <p className="goal-result-title">
                {dv.name} · {dv.place} · {dv.command}
              </p>
              {dv.warning && <p className="warn">{dv.warning}</p>}
              <p>{dv.family || "가족 참석·외출 정보는 아직 확인하지 못했어요. 입영 뒤 부대 안내를 확인하세요."}</p>
              {dv.note && <p className="small">{dv.note}</p>}
              {dv.cases.length > 0 && (
                <p className="small">
                  확인된 최근 수료식:{" "}
                  {dv.cases.map((x, i) => (
                    <span key={x.date + i}>
                      <a href={x.url} target="_blank" rel="noopener noreferrer">
                        {formatShort(x.date)}
                      </a>
                      {i < dv.cases.length - 1 ? ", " : ""}
                    </span>
                  ))}
                </p>
              )}
              <p className="small">
                <a href={dv.mmaUrl} target="_blank" rel="noopener noreferrer">
                  병무청 입영부대 가는 길 ↗
                </a>
              </p>
            </div>
          ) : (
            <p className="muted small">입영통지서에 적힌 사단을 고르세요. 준비물은 사단 공통이에요(사단별 준비물 공지는 따로 없어요).</p>
          )}
        </section>
      )}

      <p className="feedback loading" role="status">
        서류·물건 {all.length}개 가운데 <b>{done}개</b> 챙겼어요.
      </p>

      {GROUPS.filter((g) => lists[g.key].length > 0).map((g) => (
        <section key={g.key} className="card">
          <h2>{g.title}</h2>
          {g.note && <p className="muted small">{g.note}</p>}
          <ul className="checklist">
            {lists[g.key].map((i) => (
              <li key={i.name}>
                {g.key === "skip" || g.key === "banned" ? (
                  <label>
                    <span className={`badge ${g.key === "banned" ? "red" : "green"}`}>{g.key === "banned" ? "금지" : "지급"}</span> {i.name}
                    {i.tip && <span className="muted small"> · {i.tip}</span>}
                  </label>
                ) : (
                  <label>
                    <input type="checkbox" checked={!!checked[i.name]} onChange={() => toggle(i.name)} /> {i.name}
                    {i.tip && <span className="muted small"> · {i.tip}</span>}
                    {i.link && (
                      <a href={i.link} target="_blank" rel="noopener noreferrer sponsored">
                        보러 가기 ↗
                      </a>
                    )}
                  </label>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section className="card">
        <h2>수료식·편지·소포</h2>
        <p>
          <b>수료식</b> · {c.durationLabel}. {c.graduationNote}
        </p>
        <p>
          <b>가족 참석</b> · {dv?.family || c.family}
        </p>
        <p>
          <b>휴대폰·편지</b> · {c.letterNote}
        </p>
        <p>
          <b>소포</b> · {c.parcelNote}
        </p>
        {c.phone && (
          <p>
            <b>문의</b> · {c.phone}
          </p>
        )}
        <p className="muted small">
          {COMMON.note} 마지막 확인 {c.lastVerified} · 출처{" "}
          {c.sources.map((s, i) => (
            <span key={s.url}>
              <a href={s.url} target="_blank" rel="noopener noreferrer">
                {s.label}
              </a>
              {i < c.sources.length - 1 ? ", " : ""}
            </span>
          ))}
        </p>
        <p>
          <Link className="button" href="/service">
            수료식 날짜 계산하기 →
          </Link>{" "}
          <Link className="button" href="/todo">
            입대 전 할 일 →
          </Link>
        </p>
      </section>
    </>
  );
}

function dedupe(items: Item[]): Item[] {
  const seen = new Set<string>();
  return items.filter((i) => (seen.has(i.name) ? false : (seen.add(i.name), true)));
}
