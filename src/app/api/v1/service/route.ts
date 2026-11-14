import type { NextRequest } from "next/server";
import { calcService } from "@/lib/service";
import { handle, needDate, ok, optDate, optInt, options, parseBranch } from "@/lib/api";
import { getCenter, getDivision } from "@/lib/centers";
import { BadInput } from "@/lib/api";

// GET /api/v1/service?enlist=2026-02-03&branch=army&saving=550000&center=nonsan&today=2026-11-14
export function GET(req: NextRequest) {
  return handle(() => {
    const q = req.nextUrl.searchParams;
    return run({
      enlist: q.get("enlist"),
      branch: q.get("branch"),
      saving: q.get("saving"),
      savingStart: q.get("savingStart"),
      center: q.get("center"),
      division: q.get("division"),
      today: q.get("today"),
    });
  });
}

// POST /api/v1/service  {"enlist":"2026-02-03","branch":"army","saving":550000}
export function POST(req: NextRequest) {
  return handle(async () => {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) throw new BadInput("invalid_json", "JSON 본문을 읽지 못했어요.");
    const s = (v: unknown) => (v == null ? null : String(v));
    return run({
      enlist: s(body.enlist),
      branch: s(body.branch),
      saving: s(body.saving),
      savingStart: s(body.savingStart),
      center: s(body.center),
      division: s(body.division),
      today: s(body.today),
    });
  });
}

export const OPTIONS = options;

function run(p: Record<string, string | null>) {
  const enlist = needDate(p.enlist, "enlist");
  const branch = parseBranch(p.branch);
  const monthlySaving = optInt(p.saving, "saving", 0, 10_000_000) ?? 0;
  const savingStartOffset = optInt(p.savingStart, "savingStart", 0, 24);
  const today = optDate(p.today, "today");
  if (p.center && !getCenter(p.center))
    throw new BadInput("invalid_center", `center 값을 찾지 못했어요. /api/v1/centers 에서 id를 확인하세요.`);
  if (p.division && !getDivision("division", p.division))
    throw new BadInput("invalid_division", "division은 사단 번호예요(예: 12). /api/v1/checklist?center=division 에서 확인하세요.");
  const result = calcService({
    enlist,
    branch,
    monthlySaving,
    savingStartOffset,
    center: p.center ?? undefined,
    division: p.division ?? undefined,
    today,
  });
  return ok(result, { cacheSeconds: today ? 600 : 86400 });
}
