// 수집기가 저장하는 공개 접수현황만 내보낸다. 인증키·요청 URL·응답 원문은 포함하지 않는다.
import { scheduleTime } from './time.js';

export const MAX_SNAPSHOT_AGE_MS = 120000;
export function freshSnapshotTime(at, now = Date.now()) {
  const t = typeof at === 'string' ? Date.parse(at) : NaN;
  return Number.isFinite(t) && t >= now - MAX_SNAPSHOT_AGE_MS && t <= now + 30000;
}
export function snapshotRows(snapshots, now = Date.now()) {
  return snapshots
    .filter((s) => s.applyEnd && scheduleTime(s.applyEnd, true) >= now - 86400000)
    .map((s) => ({ t: s.collectedAt, b: s.branch, r: s.roundLabel, c: s.category, m: s.mosCode, n: s.mosName, u: s.unit, e: s.enlistMonth, as: s.applyStart, ae: s.applyEnd, q: s.quota, a: s.applicants }));
}
export function validateSnapshotExport(data, now = Date.now()) {
  if (data?.source !== 'api' || !freshSnapshotTime(data.collectedAt, now) ||
      !Array.isArray(data.items) || data.count !== data.items.length || data.items.length > 29997) {
    throw new Error('invalid_snapshot_export');
  }
  const keys = ['t','b','r','c','m','n','u','e','as','ae','q','a'];
  for (const row of data.items) {
    if (!row || row.t !== data.collectedAt ||
        !Object.keys(row).every((k) => keys.includes(k)) ||
        !Number.isFinite(scheduleTime(row.ae, true)) ||
        (row.q != null && (!Number.isInteger(row.q) || row.q < 0)) ||
        (row.a != null && (!Number.isInteger(row.a) || row.a < 0))) {
      throw new Error('invalid_snapshot_row');
    }
  }
  return data.items;
}
