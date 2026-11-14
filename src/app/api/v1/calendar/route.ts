import type { NextRequest } from "next/server";
import { calcService } from "@/lib/service";
import { BadInput, handle, needDate, parseBranch, CORS } from "@/lib/api";
import { getCenter, getDivision } from "@/lib/centers";
import { addDays } from "@/lib/date";
import { SITE } from "@/lib/site";

// GET /api/v1/calendar?enlist=2026-02-03&branch=army&center=nonsan
// 진급일·수료식·전역일을 휴대폰 캘린더에 한 번에 넣는 .ics 파일
export function GET(req: NextRequest) {
  return handle(() => {
    const q = req.nextUrl.searchParams;
    const enlist = needDate(q.get("enlist"), "enlist");
    const branch = parseBranch(q.get("branch"));
    const center = q.get("center") ?? undefined;
    const division = q.get("division") ?? undefined;
    if (center && !getCenter(center)) throw new BadInput("invalid_center", "center 값을 찾지 못했어요. /api/v1/centers 에서 id를 확인하세요.");
    if (division && !getDivision("division", division)) throw new BadInput("invalid_division", "division은 사단 번호예요(예: 12).");
    const r = calcService({ enlist, branch, center, division });

    const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      `PRODID:-//${SITE.name}//ipdae2//KO`,
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      `X-WR-CALNAME:군 복무 일정 (${r.input.branchName})`,
    ];
    for (const k of r.keyDates) {
      const d = k.date.replace(/-/g, "");
      const end = addDays(k.date, 1).replace(/-/g, "");
      const desc = [k.estimated ? "예상 날짜예요." : "", k.note ?? "", `${SITE.url}/service?d=${enlist}&b=${branch}`]
        .filter(Boolean)
        .join("\n");
      lines.push(
        "BEGIN:VEVENT",
        `UID:${enlist}-${branch}-${k.key}@ipdae2`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${d}`,
        `DTEND;VALUE=DATE:${end}`,
        `SUMMARY:${esc(k.label)}${k.estimated ? " (예상)" : ""}`,
        `DESCRIPTION:${esc(desc)}`,
        "BEGIN:VALARM",
        "TRIGGER:-P1D",
        "ACTION:DISPLAY",
        `DESCRIPTION:내일 ${esc(k.label)}`,
        "END:VALARM",
        "END:VEVENT",
      );
    }
    lines.push("END:VCALENDAR");
    return new Response(lines.map(fold).join("\r\n"), {
      headers: {
        ...CORS,
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="military-${enlist}.ics"`,
      },
    });
  });
}

// RFC 5545: 역슬래시·쉼표·세미콜론·줄바꿈 이스케이프
function esc(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/[,;]/g, (m) => `\\${m}`).replace(/\r?\n/g, "\\n");
}

// RFC 5545: 한 줄이 75옥텟을 넘으면 접는다(이어지는 줄은 공백으로 시작)
function fold(line: string): string {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const out: string[] = [];
  let cur = "";
  for (const ch of line) {
    const limit = out.length === 0 ? 75 : 74;
    if (enc.encode(cur + ch).length > limit) {
      out.push(cur);
      cur = ch;
    } else cur += ch;
  }
  out.push(cur);
  return out.join("\r\n ");
}
