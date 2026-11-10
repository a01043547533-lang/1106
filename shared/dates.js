export const koreaDay = (now = Date.now()) => new Date(now + 9 * 3600000).toISOString().slice(0, 10);
export function dday(date, now = Date.now()) {
  if (!date) return null;
  const days = Math.round((Date.parse(String(date).slice(0, 10)) - Date.parse(koreaDay(now))) / 86400000);
  return days > 0 ? `D-${days}` : days === 0 ? 'D-day' : null;
}
export const firstDay = (value) => String(value || '').split('~')[0];
export const lastDay = (value) => String(value || '').split('~').at(-1);
export function nextExamWindow(round, day) {
  return [round.writtenApply, ...(round.writtenApplyExtra || [])]
    .filter((value) => value && lastDay(value) >= day).sort((a, b) => firstDay(a).localeCompare(firstDay(b)))[0] || null;
}
