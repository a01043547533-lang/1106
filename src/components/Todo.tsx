"use client";
// 입대 전 할 일 (2탄). 입영일을 넣으면 D-30·14·7·3·1에 날짜가 붙는다.
import { useEffect, useState } from "react";
import Link from "next/link";
import { todoFor, TODO_SOURCES, TODO_UPDATED } from "@/lib/todo";
import { isYMD, todayKST, formatKo, diffDays, type YMD } from "@/lib/date";
import { dday } from "@/lib/format";
import { PageHeading } from "@/components/PageHeading";

export default function Todo() {
  const [enlist, setEnlist] = useState("");
  const [today, setToday] = useState<YMD | null>(null);
  const [done, setDone] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const d = new URLSearchParams(window.location.search).get("d");
    /* eslint-disable react-hooks/set-state-in-effect */
    if (d && isYMD(d)) setEnlist(d);
    setToday(todayKST());
    try {
      setDone(JSON.parse(localStorage.getItem("todo") ?? "{}"));
    } catch {
      /* 무시 */
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const valid = isYMD(enlist);
  useEffect(() => {
    if (valid) window.history.replaceState(null, "", `?d=${enlist}`);
  }, [valid, enlist]);

  function toggle(id: string) {
    setDone((p) => {
      const n = { ...p, [id]: !p[id] };
      try {
        localStorage.setItem("todo", JSON.stringify(n));
      } catch {
        /* 무시 */
      }
      return n;
    });
  }

  return (
    <>
      <PageHeading
        title="입대 전 할 일"
        description="물건 말고 학교·통신·적금·서류 정리를 입영일 기준으로 순서대로 보여 줘요. 입영일을 넣으면 날짜가 붙어요."
      />
      <section className="card goal-box">
        <h2>입영일</h2>
        <div className="row">
          <label>
            입영일
            <input type="date" value={enlist} onChange={(e) => setEnlist(e.target.value)} />
          </label>
        </div>
        {!valid && <p className="muted small">입영통지서에 적힌 날짜를 넣어 주세요.</p>}
      </section>

      {todoFor(valid ? enlist : undefined).map((g) => {
        const left = g.date && today ? diffDays(today, g.date) : null;
        return (
          <section key={g.label} className="card">
            <h2>
              {g.label} · {g.title}{" "}
              {g.date && (
                <span className="muted small">
                  {formatKo(g.date)}
                  {left !== null && ` · ${left < 0 ? "지났어요" : dday(left)}`}
                </span>
              )}
            </h2>
            <ul className="checklist">
              {g.items.map((i) => (
                <li key={i.id}>
                  <label>
                    <input type="checkbox" checked={!!done[i.id]} onChange={() => toggle(i.id)} /> <b>{i.title}</b>
                    <span className="muted small">{i.tip}</span>
                    {i.link && (
                      <a href={i.link.url} target="_blank" rel="noopener noreferrer">
                        {i.link.label} ↗
                      </a>
                    )}
                  </label>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <p className="muted small">
        마지막 확인 {TODO_UPDATED} · 출처{" "}
        {TODO_SOURCES.map((s, i) => (
          <span key={s.url}>
            <a href={s.url} target="_blank" rel="noopener noreferrer">
              {s.label}
            </a>
            {i < TODO_SOURCES.length - 1 ? ", " : ""}
          </span>
        ))}
      </p>
      <p>
        <Link className="button" href="/training">
          훈련소별 준비물 →
        </Link>{" "}
        <Link className="button" href="/prepare">
          지원 전·합격 후 체크리스트 →
        </Link>
      </p>
    </>
  );
}
