import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
process.env.VERCEL = '1';
process.env.MMA_API_KEY = 'test-server-only-key';
const nativeFetch = globalThis.fetch;
let upstream = 0;
globalThis.fetch = async (url, options) => {
  if (String(url).includes('/MachumTG/')) {
    return new Response('<response><header><resultCode>00</resultCode></header><body><totalCount>1</totalCount><items><item><gtcdNm1>육군</gtcdNm1><gtcdNm2>육군훈련소</gtcdNm2><gsteukgiCd>S999.101</gsteukgiCd><gsteukgiNm>(맞춤)검증정비</gsteukgiNm><mojipYy>2027</mojipYy><mojipTms>1</mojipTms><ipyeongDt>20991231</ipyeongDt><mojipPcnt>5</mojipPcnt><cjsbinweon>2</cjsbinweon><jygs>3</jygs></item></items></body></response>');
  }
  if (String(url).startsWith('https://apis.data.go.kr/')) {
    upstream++;
    return new Response('<response><header><resultCode>00</resultCode></header><body><totalCount>1</totalCount><items><item><gunGbnm>육군</gunGbnm><gsteukgiCd>161.103</gsteukgiCd><gsteukgiNm>검증 특기</gsteukgiNm><mojipYy>2026</mojipYy><mojipTms>11</mojipTms><jeopsuSjdtm>20200101</jeopsuSjdtm><jeopsuJrdtm>20991231</jeopsuJrdtm><seonbalPcnt>10</seonbalPcnt><jeopsuPcnt>3</jeopsuPcnt><ipyeongDe>202701</ipyeongDe></item></items></body></response>');
  }
  return nativeFetch(url, options);
};
const { app } = await import('../server/app.js');
const { clientIp, requestLimit } = await import('../server/rate-limit.js');

test('요청 제한: Vercel에서는 방문자 IP 헤더로 구분한다', () => {
  const req = { headers: { 'x-real-ip': '203.0.113.7', 'x-vercel-forwarded-for': '203.0.113.7' }, ip: '10.0.0.1', socket: { remoteAddress: '10.0.0.1' } };
  assert.equal(clientIp(req, true), '203.0.113.7');
  assert.equal(clientIp({ headers: { 'x-vercel-forwarded-for': '198.51.100.2, 10.0.0.1' }, ip: '10.0.0.1', socket: {} }, true), '198.51.100.2');
  assert.equal(clientIp(req, false), '10.0.0.1', 'Vercel 밖에서는 위조 가능한 헤더를 믿지 않는다');
  // 서로 다른 방문자는 각자 한도를 가진다
  const mw = requestLimit({ limit: 2 }); let passed = 0; const res = { set() { return res; }, status() { return res; }, json() { return res; } };
  for (const ip of ['1.1.1.1', '1.1.1.1', '2.2.2.2', '2.2.2.2']) mw({ headers: { 'x-real-ip': ip }, socket: {} }, res, () => passed++);
  assert.equal(passed, 4);
});
test('Vercel: 읽기 전용 파일시스템, 비공개 키, 실제 API 경로', async () => {
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const methods = ['writeFileSync', 'appendFileSync', 'mkdirSync', 'renameSync'];
  const original = Object.fromEntries(methods.map((key) => [key, fs[key]]));
  for (const key of methods) fs[key] = () => { throw new Error(`파일 쓰기 금지: ${key}`); };
  try {
    // 첫 응답은 병무청을 기다리지 않고 저장본으로 바로 온다. 실시간 연결이 끝나면(liveAvailable) 그 값이 나온다.
    const first = await fetch(`${base}/api/now`); assert.equal(first.status, 200);
    for (let i = 0; i < 50 && !(await (await fetch(`${base}/api/health`)).json()).liveAvailable; i++) await new Promise((r) => setTimeout(r, 50));
    const responses = await Promise.all([fetch(`${base}/api/now`), fetch(`${base}/api/now`)]);
    for (const response of responses) {
      assert.equal(response.status, 200); const body = await response.json();
      assert.equal(body.items[0].rate, .3); assert.equal(body.items[0].enlistMonth, '2027-01');
      assert.deepEqual(body.branchStatus.map((b) => b.branch), ['육군', '해군', '공군', '해병대']);
      assert.equal(body.branchStatus[0].openRounds, 1); assert.equal(body.branchStatus[1].openRounds, 0);
      assert(Array.isArray(body.upcoming));
      assert(!JSON.stringify(body).includes(process.env.MMA_API_KEY));
    }
    assert.equal(upstream, 1);
    for (const route of ['/api/mos', '/api/service-terms', '/api/score-rules?mosCode=161.103', '/api/health', '/api/public-config']) {
      const response = await fetch(base + route); assert.equal(response.status, 200, route);
      const body = await response.json(); assert(!JSON.stringify(body).includes(process.env.MMA_API_KEY));
      if (route.includes('score-rules')) assert(body.items.some((item) => item._norm.directScore != null));
      if (route === '/api/public-config') assert.equal(body.subscriptionsEnabled, false);
    }
    // 맞춤특기병도 첫 응답은 저장본, 실시간 조회가 끝나면 api로 바뀐다
    let jobfit = await (await fetch(`${base}/api/jobfit`)).json();
    for (let i = 0; i < 50 && jobfit.jobfitSource !== 'api'; i++) { await new Promise((r) => setTimeout(r, 50)); jobfit = await (await fetch(`${base}/api/jobfit`)).json(); }
    assert.equal(jobfit.jobfitSource, 'api');
    assert.deepEqual([jobfit.items[0].mosCode, jobfit.items[0].enlistDate, jobfit.items[0].quota, jobfit.items[0].selected, jobfit.items[0].vacancy, jobfit.items[0].past], ['S999.101', '2099-12-31', 5, 2, 3, false]);
    assert(!JSON.stringify(jobfit).includes(process.env.MMA_API_KEY));
    const health = await (await fetch(`${base}/api/health`)).json();
    assert.equal(health.connectionFailed, false, '다른 API 기록이 접수현황 배너에 섞이면 안 된다');
    const detail = await fetch(`${base}/api/mos/S999.101`);
    assert.equal(detail.status, 200);
    const detailBody = await detail.json();
    assert.equal(detailBody.category, '취업맞춤특기병'); assert.equal(detailBody.jobfit[0].vacancy, 3);
    // 실시간 자료(검증용 1건)에 없는 저장본 특기도 목록에 있으면 상세가 열려야 한다(사이트맵 404 방지)
    const listed = (await (await fetch(`${base}/api/mos`)).json()).items.map((m) => m.mosCode);
    assert(listed.includes('S222.105') && listed.includes('S999.101'));
    const fallback = await (await fetch(`${base}/api/mos/S222.105`)).json();
    assert.equal(fallback.jobfitSource, 'prepared'); assert(fallback.jobfit.length > 0);
    assert.equal((await fetch(`${base}/api/subscribe`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ contact: 'test@example.test' }) })).status, 503);
    assert.equal((await fetch(`${base}/api/unknown`)).status, 404);
    // 예측·시험일정·감시 API
    const fc = await (await fetch(`${base}/api/forecast`)).json();
    assert(Array.isArray(fc.items) && 'ready' in fc.summary); assert(['ok', 'collecting', 'too-early', 'none'].includes(fc.items[0].forecast.status));
    const ex = await (await fetch(`${base}/api/exam-schedule?deadline=2026-12-31`)).json();
    assert(ex.rounds.length >= 7 && ex.rounds.every((r) => typeof r.canApply === 'boolean' && typeof r.inTime === 'boolean'));
    const ping = await fetch(`${base}/api/ping`); assert.equal(ping.status, 200); assert.equal((await ping.json()).ok, true);
  } finally { Object.assign(fs, original); globalThis.fetch = nativeFetch; await new Promise((resolve) => server.close(resolve)); }
});
