export function won(n: number): string {
  return `${Math.round(n).toLocaleString("ko-KR")}원`;
}

/** 1,234,567 → "123만 4,567원", 2,050,000 → "205만 원" */
export function manwon(n: number): string {
  const v = Math.round(n);
  const man = Math.floor(v / 10_000);
  const rest = v % 10_000;
  if (man === 0) return `${rest.toLocaleString("ko-KR")}원`;
  if (rest === 0) return `${man.toLocaleString("ko-KR")}만 원`;
  return `${man.toLocaleString("ko-KR")}만 ${rest.toLocaleString("ko-KR")}원`;
}

/** 대략 금액: 12,345,678 → "약 1,235만 원" */
export function aboutMan(n: number): string {
  return `약 ${Math.round(n / 10_000).toLocaleString("ko-KR")}만 원`;
}

export function dday(n: number): string {
  if (n === 0) return "D-DAY";
  return n > 0 ? `D-${n}` : `D+${-n}`;
}
