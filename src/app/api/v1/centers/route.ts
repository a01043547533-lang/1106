import { listCenters, CENTERS_UPDATED } from "@/lib/centers";
import { ok, options } from "@/lib/api";

// GET /api/v1/centers  훈련소 목록과 id
export function GET() {
  return ok({
    updated: CENTERS_UPDATED,
    centers: listCenters().map((c) => ({
      id: c.id,
      name: c.name,
      branch: c.branch,
      weeks: c.weeks,
      lastVerified: c.lastVerified,
    })),
  });
}

export const OPTIONS = options;
