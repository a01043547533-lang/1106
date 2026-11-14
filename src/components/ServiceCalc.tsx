"use client";
// 복무 계산기 (2탄). 1탄 화면 부품(card, goal-box, steps, table-wrap, rules)만 써서 같은 모양을 유지한다.
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { calcService } from "@/lib/service";
import { isYMD, todayKST, formatKo, formatShort, type YMD } from "@/lib/date";
import { listCenters, defaultCenterFor, getCenter } from "@/lib/centers";
import { type Branch, BRANCHES } from "@/rules/types";
import { rulesFor } from "@/rules";
import { won, manwon, aboutMan, dday } from "@/lib/format";
import { PageHeading } from "@/components/PageHeading";
import { AddToCalendar as AddToCalendarJs } from "@/legacy/components.jsx";

const AddToCalendar = AddToCalendarJs as unknown as React.ComponentType<{
  events: { uid: string; title: string; start: string; end: string; description: string; url: string }[];
  filename: string;
  label: string;
}>;

const BRANCH_KO: Record<Branch, string> = {
  army: "육군",
  marine: "해병대",
  navy: "해군",
  airforce: "공군",
  social: "사회복무요원",
};
const SAVING = [0, 100_000, 200_000, 300_000, 400_000, 500_000, 550_000];

export default function ServiceCalc() {
  const [enlist, setEnlist] = useState("");
  const [branch, setBranch] = useState<Branch>("army");
  const [center, setCenter] = useState("nonsan");
  const [division, setDivision] = useState("");
  const [saving, setSaving] = useState(550_000);
  const [today, setToday] = useState<YMD | null>(null);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const d = q.get("d");
    const b = q.get("b") as Branch | null;
    /* eslint-disable react-hooks/set-state-in-effect */
    if (d && isYMD(d)) setEnlist(d);
    if (b && BRANCHES.includes(b)) {
      setBranch(b);
      // 군과 맞지 않는 훈련소 값(예: 해군 + 육군훈련소)은 그 군 기본값으로
      const c = q.get("c");
      setCenter(c && getCenter(c)?.branch === b ? c : defaultCenterFor(b));
    }
    const v = q.get("v");
    if (v && getCenter("division")?.divisions?.some((x) => x.id === v)) setDivision(v);
    const sv = q.get("s");
    if (sv && /^\d+$/.test(sv)) {
      // 고를 수 있는 금액 가운데 넘지 않는 가장 큰 값으로
      const n = Number(sv);
      setSaving([...SAVING].reverse().find((x) => x <= n) ?? 0);
    }
    setToday(todayKST());
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const valid = isYMD(enlist) && enlist >= "2020-01-01" && enlist <= "2035-12-31";

  useEffect(() => {
    if (!valid) return;
    const q = new URLSearchParams({ d: enlist, b: branch, c: center, s: String(saving) });
    if (center === "division" && division) q.set("v", division);
    window.history.replaceState(null, "", `?${q}`);
  }, [valid, enlist, branch, center, division, saving]);

  const r = useMemo(
    () =>
      valid
        ? calcService({
            enlist,
            branch,
            center,
            division: center === "division" ? division : undefined,
            monthlySaving: saving,
            today: today ?? undefined,
          })
        : null,
    [valid, enlist, branch, center, division, saving, today],
  );

  const centers = listCenters().filter((c) => c.branch === branch);
  const divisions = getCenter("division")?.divisions ?? [];
  const cap = rulesFor(valid ? Number(enlist.slice(0, 4)) : 2026).rules.savings.monthlyCapPerPerson;
  const p = r?.progress;
  const t = r?.training;

  return (
    <>
      <PageHeading
        title="전역일 계산기 · 진급일과 군인 월급까지"
        description="입대일만 넣으면 전역일과 D-day, 일병·상병·병장 진급일, 달마다 받는 월급, 군적금 만기액, 휴가, 수료식 날짜, 복학 학기까지 한 번에 계산해요. 육군·해군·공군·해병대·사회복무요원."
      />

      <section className="card goal-box">
        <h2>입대일과 복무 형태 고르기</h2>
        <div className="row">
          <label>
            입대일
            <input type="date" value={enlist} min="2020-01-01" max="2035-12-31" onChange={(e) => setEnlist(e.target.value)} />
          </label>
          <label>
            군
            <select
              value={branch}
              onChange={(e) => {
                const b = e.target.value as Branch;
                setBranch(b);
                setCenter(defaultCenterFor(b));
              }}
            >
              {BRANCHES.map((b) => (
                <option key={b} value={b}>
                  {BRANCH_KO[b]}
                </option>
              ))}
            </select>
          </label>
          {centers.length > 1 && (
            <label>
              훈련받는 곳
              <select value={center} onChange={(e) => setCenter(e.target.value)}>
                {centers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.short}
                  </option>
                ))}
              </select>
            </label>
          )}
          {center === "division" && (
            <label>
              사단
              <select value={division} onChange={(e) => setDivision(e.target.value)}>
                <option value="">선택</option>
                {divisions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                    {d.nick ? ` (${d.nick})` : ""}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            적금 한 달에
            <select value={saving} onChange={(e) => setSaving(Number(e.target.value))}>
              {SAVING.filter((v) => v <= cap).map((v) => (
                <option key={v} value={v}>
                  {v === 0 ? "안 넣어요" : `${v / 10_000}만 원${v === cap ? " (최대)" : ""}`}
                </option>
              ))}
            </select>
          </label>
        </div>

        {r ? (
          <div className="goal-result" role="status">
            <p className="goal-result-title">
              결과 · {r.input.branchName} {r.service.months}개월 · 전역일
            </p>
            <p className="goal-result-main">
              <b>{formatKo(r.service.discharge)}</b>
            </p>
            {p && (
              <p className="goal-timeline">
                {p.phase === "before" && (
                  <>
                    입대까지 <b>{dday(p.dDayEnlist)}</b> · 전역까지 {dday(p.dDayDischarge)}
                  </>
                )}
                {p.phase === "serving" && (
                  <>
                    오늘 <b>{p.rankKo}</b> · {p.served}일째({p.percent}%) · 전역까지 <b>{dday(p.dDayDischarge)}</b>
                    {p.next && (
                      <>
                        {" "}
                        · {p.next.rankKo}까지 {dday(p.next.dDay)}
                      </>
                    )}
                  </>
                )}
                {p.phase === "done" && <>전역했어요. 고생 많았어요.</>}
              </p>
            )}
            {r.service.dischargeNote && <p className="small">{r.service.dischargeNote}</p>}
            <p>
              <AddToCalendar
                filename="군복무-일정"
                label="진급·수료·전역일 캘린더에 추가"
                events={r.keyDates.map((k) => ({
                  uid: `svc-${r.input.enlist}-${k.key}`,
                  title: `${k.label}${k.estimated ? " (예상)" : ""}`,
                  start: k.date,
                  end: k.date,
                  description: k.note ?? "",
                  url: typeof window !== "undefined" ? window.location.href : "",
                }))}
              />
            </p>
          </div>
        ) : (
          <p className="muted small">입대일을 고르는 순간 결과가 아래에 나와요. 예: 2026년 2월 3일 육군 입대 → 2027년 8월 2일 전역.</p>
        )}
      </section>

      {!r && (
        <p className="feedback empty" role="status">
          아직 입대일이 없어요. 위에서 입대일을 골라 주세요.{" "}
          <button type="button" className="link" onClick={() => setEnlist("2026-02-03")}>
            예시로 보기
          </button>
        </p>
      )}

      {r && (
        <>
          <section className="card">
            <h2>{r.input.branch === "social" ? "보수 구간 (계급 상당)" : "진급일"}</h2>
            <ol className="steps">
              {r.promotions.map((x) => (
                <li key={x.rank} className={today && x.date > today ? "unknown" : ""}>
                  <span>
                    <b>{x.rankKo}</b>
                    {p?.phase === "serving" && p.rank === x.rank && <span className="badge green">지금</span>}
                  </span>
                  <small>{formatKo(x.date)}</small>
                </li>
              ))}
            </ol>
            <p className="muted small">
              {r.input.branch === "social"
                ? "사회복무요원은 계급이 없어요. 소집된 달을 1개월로 세어 이 날부터 해당 계급 봉급을 받아요."
                : "입대한 달을 1개월로 세요. 진급 심사에서 떨어지면 다음 달로 밀릴 수 있어요."}
            </p>
          </section>

          {t && (
            <section className="card">
              <h2>{t.centerName} 수료식</h2>
              <p>
                <b className="sv-big">
                  {t.graduationExact ? formatKo(t.graduation) : `${formatShort(t.graduation)} ~ ${formatShort(t.graduationWeekEnd)} 사이`}
                </b>
                <span className="badge gray">예상</span>
              </p>
              <p className="muted small">{t.durationLabel}</p>
              {t.division?.warning && <p className="warn">{t.division.warning}</p>}
              {t.holidayWarning && <p className="warn">{t.holidayWarning}</p>}
              <p>
                <b>가족 참석</b> · {t.family}
              </p>
              <details className="rules">
                <summary>수료식·편지·소포 자세히</summary>
                <p>{t.graduationNote}</p>
                {t.division && (
                  <>
                    {t.division.note && <p>{t.division.note}</p>}
                    <p>
                      {t.division.place} · {t.division.command} ·{" "}
                      <a href={t.division.mmaUrl} target="_blank" rel="noopener noreferrer">
                        병무청 입영부대 가는 길 ↗
                      </a>
                    </p>
                    {t.division.cases.length > 0 && (
                      <p>
                        확인된 최근 수료식:{" "}
                        {t.division.cases.map((c, i) => (
                          <span key={c.date + i}>
                            <a href={c.url} target="_blank" rel="noopener noreferrer">
                              {formatShort(c.date)}
                            </a>
                            {i < t.division!.cases.length - 1 ? ", " : ""}
                          </span>
                        ))}
                      </p>
                    )}
                  </>
                )}
                <p>{t.letterNote}</p>
                <p>{t.parcel}</p>
              </details>
              <p>
                <Link className="button" href={`/training?c=${t.centerId}${t.division ? `&v=${t.division.id}` : ""}`}>
                  이 훈련소 준비물 보기 →
                </Link>
              </p>
            </section>
          )}

          <section className="card">
            <h2>적금 만기 때 받는 돈</h2>
            {r.savings ? (
              <>
                <p>
                  <b className="sv-big">{aboutMan(r.savings.total)}</b> <span className="muted small">장병내일준비적금</span>
                </p>
                <table>
                  <tbody>
                    <tr>
                      <th>넣은 돈</th>
                      <td className="num">
                        {manwon(r.savings.monthlyInput)} × {r.savings.months}개월 = {won(r.savings.principal)}
                      </td>
                    </tr>
                    <tr>
                      <th>정부 매칭</th>
                      <td className="num">{won(r.savings.matching)} (넣은 돈의 100%)</td>
                    </tr>
                    <tr>
                      <th>이자</th>
                      <td className="num">{won(r.savings.interest)} (연 5% 가정, 비과세)</td>
                    </tr>
                  </tbody>
                </table>
                <p className="muted small">{r.savings.note}</p>
              </>
            ) : (
              <p className="muted">위에서 한 달에 넣을 금액을 고르면 만기 금액이 나와요.</p>
            )}
          </section>

          <section className="card">
            <h2>휴가</h2>
            <p>
              연가 <b className="sv-big">{r.leave.annualLeaveDays}일</b> + 포상·위로휴가
            </p>
            <table>
              <tbody>
                {r.leave.split.map((s) => (
                  <tr key={s.rank}>
                    <th>
                      {s.rankKo} ({formatShort(s.from)}~)
                    </th>
                    <td className="num">{s.suggestDays}일쯤</td>
                  </tr>
                ))}
                <tr>
                  <th>
                    첫 휴가 <span className="badge gray">예상</span>
                  </th>
                  <td>
                    {r.leave.firstLeave.notBefore
                      ? `빨라도 수료식(${formatShort(r.leave.firstLeave.notBefore)}) 뒤, 자대에서 정해요.`
                      : "수료하고 자대에 간 뒤 부대에서 정해요."}
                  </td>
                </tr>
              </tbody>
            </table>
            <p className="muted small">
              계급에 머무는 기간 비율로 나눈 예시예요. {r.leave.note} {r.leave.firstLeave.note}
            </p>
          </section>

          <section className="card">
            <h2>달마다 받는 돈</h2>
            <p>
              복무 기간 합계 <b className="sv-big">{aboutMan(r.pay.totalPay + r.pay.totalAllowance)}</b>
            </p>
            <div className="table-wrap">
              <table className="grid sv-grid">
                <thead>
                  <tr>
                    <th>달</th>
                    <th>계급</th>
                    <th>봉급</th>
                    {r.input.branch === "social" && <th>식비(예상)</th>}
                    {r.savings && <th>적금 매칭</th>}
                  </tr>
                </thead>
                <tbody>
                  {r.pay.months.map((m) => (
                    <tr key={m.month}>
                      <td>
                        {m.month.replace("-", ".")}
                        {!m.fullMonth && <span className="muted small"> ({m.days}일)</span>}
                      </td>
                      <td>{m.rankKo}</td>
                      <td className="num">
                        {won(m.pay)}
                        {m.estimated ? "*" : ""}
                      </td>
                      {r.input.branch === "social" && <td className="num">{won(m.allowance)}</td>}
                      {r.savings && <td className="num">{m.matching ? `+${won(m.matching)}` : "-"}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="muted small">
              {r.pay.note} 적금 매칭지원금은 매달 들어오지 않고 전역할 때 한꺼번에 받아요.
              {r.meta.estimated && " * 표시한 달은 그해 봉급표가 아직 없어 가장 최근 표로 계산했어요."}
            </p>
          </section>

          <section className="card">
            <h2>전역 뒤</h2>
            <table>
              <tbody>
                <tr>
                  <th>복학하기 좋은 학기</th>
                  <td>
                    <b>{r.afterDischarge.returnSemester}</b> · 개강 {formatShort(r.afterDischarge.semesterStart)} (전역하고{" "}
                    {r.afterDischarge.daysUntilSemester}일 뒤)
                  </td>
                </tr>
                <tr>
                  <th>예비군</th>
                  <td>
                    {r.afterDischarge.reserve[0].year}년(1년차) ~ {r.afterDischarge.reserve.at(-1)!.year}년(
                    {r.afterDischarge.reserve.length}년차)
                  </td>
                </tr>
              </tbody>
            </table>
            <p className="muted small">
              {r.afterDischarge.semesterNote} {r.afterDischarge.reserveNote}
            </p>
          </section>

          <details className="rules">
            <summary>계산 기준과 출처</summary>
            <p>{r.meta.basis}</p>
            <ul>
              {r.meta.sources.map((s) => (
                <li key={s.url}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer">
                    {s.label} ↗
                  </a>
                </li>
              ))}
            </ul>
            <p className="small">
              병무청·국방부와 관계없는 민간 정보예요. 실제는 부대 사정·진급 심사·규정 개정에 따라 달라질 수 있어요.{" "}
              <Link href="/developers">무료 API</Link>
            </p>
          </details>
        </>
      )}
    </>
  );
}
