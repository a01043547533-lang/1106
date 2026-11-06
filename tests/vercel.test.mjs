import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
process.env.VERCEL = '1';
process.env.MMA_API_KEY = 'test-server-only-key';
const nativeFetch = globalThis.fetch;
let upstream = 0;
globalThis.fetch = async (url, options) => {
  if (String(url).startsWith('https://apis.data.go.kr/')) {
    upstream++;
    return new Response('<response><header><resultCode>00</resultCode></header><body><totalCount>1</totalCount><items><item><gunGbnm>육군</gunGbnm><gsteukgiCd>161.103</gsteukgiCd><gsteukgiNm>검증 특기</gsteukgiNm><mojipYy>2026</mojipYy><mojipTms>11</mojipTms><jeopsuSjdtm>20200101</jeopsuSjdtm><jeopsuJrdtm>20991231</jeopsuJrdtm><seonbalPcnt>10</seonbalPcnt><jeopsuPcnt>3</jeopsuPcnt><ipyeongDe>202701</ipyeongDe></item></items></body></response>');
  }
  return nativeFetch(url, options);
};
const { app } = await import('../server/app.js');
test('Vercel: 읽기 전용 파일시스템, 비공개 키, 실제 API 경로', async () => {
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const methods = ['writeFileSync', 'appendFileSync', 'mkdirSync', 'renameSync'];
  const original = Object.fromEntries(methods.map((key) => [key, fs[key]]));
  for (const key of methods) fs[key] = () => { throw new Error(`파일 쓰기 금지: ${key}`); };
  try {
    const responses = await Promise.all([fetch(`${base}/api/now`), fetch(`${base}/api/now`)]);
    for (const response of responses) {
      assert.equal(response.status, 200); const body = await response.json();
      assert.equal(body.items[0].rate, .3); assert.equal(body.items[0].enlistMonth, '2027-01');
      assert(!JSON.stringify(body).includes(process.env.MMA_API_KEY));
    }
    assert.equal(upstream, 1);
    for (const route of ['/api/mos', '/api/service-terms', '/api/score-rules?mosCode=161.103', '/api/health', '/api/public-config']) {
      const response = await fetch(base + route); assert.equal(response.status, 200, route);
      const body = await response.json(); assert(!JSON.stringify(body).includes(process.env.MMA_API_KEY));
      if (route.includes('score-rules')) assert(body.items.some((item) => item._norm.directScore != null));
      if (route === '/api/public-config') assert.equal(body.subscriptionsEnabled, false);
    }
    assert.equal((await fetch(`${base}/api/subscribe`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ contact: 'test@example.test' }) })).status, 503);
    assert.equal((await fetch(`${base}/api/unknown`)).status, 404);
  } finally { Object.assign(fs, original); globalThis.fetch = nativeFetch; await new Promise((resolve) => server.close(resolve)); }
});
