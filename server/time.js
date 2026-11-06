// 호스트 TZ와 관계없이 병무청 날짜는 한국 시간으로 해석한다.
export const koreaDay = (now = new Date()) => new Date(Number(now) + 9 * 3600000).toISOString().slice(0, 10);
export const koreaHour = (now = new Date()) => new Date(Number(now) + 9 * 3600000).getUTCHours();
export function scheduleTime(value, endOfDay = false) {
  if (!value) return NaN;
  const text = String(value);
  return Date.parse(text.length === 10 ? `${text}T${endOfDay ? '23:59:59' : '00:00:00'}+09:00`
    : /(?:Z|[+-]\d\d:\d\d)$/.test(text) ? text : `${text}+09:00`);
}
export const daysBefore = (date, days) => {
  const at = scheduleTime(String(date).slice(0, 10));
  return Number.isFinite(at) ? koreaDay(new Date(at - days * 86400000)) : null;
};
