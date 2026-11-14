import type { NextRequest } from "next/server";
import { getCenter, COMMON, listCenters } from "@/lib/centers";
import { BadInput, handle, ok, optDate, options } from "@/lib/api";
import { calcService } from "@/lib/service";

// GET /api/v1/checklist?center=nonsan&enlist=2026-12-07
export function GET(req: NextRequest) {
  return handle(() => {
    const q = req.nextUrl.searchParams;
    const id = q.get("center") ?? "nonsan";
    const c = getCenter(id);
    if (!c)
      throw new BadInput(
        "invalid_center",
        `center는 ${listCenters()
          .map((x) => x.id)
          .join(", ")} 중 하나예요.`,
      );
    const enlist = optDate(q.get("enlist"), "enlist");
    const schedule =
      enlist && c.branch !== "all"
        ? calcService({ enlist, branch: c.branch, center: c.id }).training
        : null;
    const { id: _id, docs, banned, required, recommended, skip, ...rest } = c;
    void _id;
    return ok({
      center: { id: c.id, ...rest },
      docs: [...COMMON.docs, ...docs.filter((d) => !COMMON.docs.some((x) => x.name === d.name))],
      required,
      recommended,
      skip,
      banned: [...COMMON.banned, ...banned.filter((d) => !COMMON.banned.some((x) => x.name === d.name))],
      schedule,
      note: COMMON.note,
    });
  });
}

export const OPTIONS = options;
