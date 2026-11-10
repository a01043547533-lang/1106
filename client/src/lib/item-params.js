// 이름 자체에 쉼표가 있는 자격도 원문 그대로 전송한다.
export function itemParams(items, values = {}) {
  const params = new URLSearchParams(Object.entries(values).filter(([, value]) => value));
  for (const item of items) params.append('item', item);
  return params;
}
