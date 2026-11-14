// 캘린더 내보내기. 서버 없이 브라우저에서 .ics 파일과 Google 캘린더 링크를 만든다.
// 날짜는 'YYYY-MM-DD'(종일) 또는 'YYYY-MM-DDTHH:mm'(KST) 두 형식을 받는다. 개인정보는 넣지 않는다.
const pad = (n) => String(n).padStart(2, '0');
const isDateOnly = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v));
const kst = (value, endOfDay = false) => {
  const text = String(value);
  return new Date(Date.parse(text.length === 10 ? `${text}T${endOfDay ? '23:59:59' : '00:00:00'}+09:00` : /(?:Z|[+-]\d\d:\d\d)$/.test(text) ? text : `${text}+09:00`));
};
const utcStamp = (d) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
const dateStamp = (v) => String(v).slice(0, 10).replace(/-/g, '');
const nextDay = (v) => { const d = new Date(`${String(v).slice(0, 10)}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10); };
const esc = (s) => String(s ?? '').replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/[,;]/g, (c) => `\\${c}`);
// RFC 5545: 한 줄 75옥텟 이하. 한글은 3바이트라 글자 수가 아니라 바이트로 센다.
const bytes = (ch) => { const c = ch.codePointAt(0); return c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4; };
const fold = (line) => {
  const out = []; let cur = '', len = 0;
  for (const ch of line) { const b = bytes(ch); if (len + b > 73) { out.push(cur); cur = ' '; len = 1; } cur += ch; len += b; }
  out.push(cur); return out.join('\r\n');
};

// event: { uid, title, start, end?, description?, url?, alarm? } · end 없으면 start와 같은 날
export function buildIcs(events) {
  const now = utcStamp(new Date());
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//입대타이밍//KO', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:입대타이밍 일정', 'X-WR-TIMEZONE:Asia/Seoul'];
  for (const e of events) {
    const start = e.start, end = e.end || e.start;
    const allDay = isDateOnly(start) && isDateOnly(end);
    lines.push('BEGIN:VEVENT', `UID:${esc(e.uid || `${start}-${e.title}`)}@ipdaetiming`, `DTSTAMP:${now}`);
    if (allDay) lines.push(`DTSTART;VALUE=DATE:${dateStamp(start)}`, `DTEND;VALUE=DATE:${dateStamp(nextDay(end))}`);
    else lines.push(`DTSTART:${utcStamp(kst(start))}`, `DTEND:${utcStamp(kst(end, isDateOnly(end)))}`);
    lines.push(`SUMMARY:${esc(e.title)}`);
    if (e.description) lines.push(`DESCRIPTION:${esc(e.description)}`);
    if (e.url) lines.push(`URL:${esc(e.url)}`);
    lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(e.title)}`, `TRIGGER:${e.alarm || (allDay ? '-P1D' : '-PT3H')}`, 'END:VALARM', 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}

export function downloadIcs(filename, events) {
  const blob = new Blob([buildIcs(events)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename.endsWith('.ics') ? filename : `${filename}.ics`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function googleCalendarUrl(e) {
  const start = e.start, end = e.end || e.start;
  const allDay = isDateOnly(start) && isDateOnly(end);
  const dates = allDay ? `${dateStamp(start)}/${dateStamp(nextDay(end))}` : `${utcStamp(kst(start))}/${utcStamp(kst(end, isDateOnly(end)))}`;
  const q = new URLSearchParams({ action: 'TEMPLATE', text: e.title, dates, details: [e.description, e.url].filter(Boolean).join('\n'), ctz: 'Asia/Seoul' });
  return `https://calendar.google.com/calendar/render?${q}`;
}
