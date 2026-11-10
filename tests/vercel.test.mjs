import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
process.env.VERCEL = '1';
process.env.MMA_API_KEY = 'test-server-only-key';
const nativeFetch = globalThis.fetch;
let upstream = 0;
globalThis.fetch = async (url, options) => {
  // 국가기술자격 시험일정 API(큐넷)도 네트워크 없이 검증한다
  if (String(url).startsWith('http://openapi.q-net.or.kr/')) {
    const item = String(url).includes('getCList') ? '<item><description>2099년 정기 기능사 1회</description><docregstartdt>20990105</docregstartdt><docregenddt>20990108</docregenddt><docexamdt>20990120</docexamdt><docpassdt>20990130</docpassdt><pracregstartdt>20990202</pracregstartdt><pracregenddt>20990205</pracregenddt><pracexamstartdt>20990314</pracexamstartdt><pracexamenddt>20990405</pracexamenddt><pracpassdt>20990410</pracpassdt></item>' : '<item><description>기사,산업기사(2099년도 제1회)</description><docregstartdt>20990112</docregstartdt><docregenddt>20990115</docregenddt><docexamdt>20990130</docexamdt><docpassdt>20990311</docpassdt><pracregstartdt>20990323</pracregstartdt><pracregenddt>20990326</pracregenddt><pracexamstartdt>20990418</pracexamstartdt><pracexamenddt>20990506</pracexamenddt><pracpassdt>20990605</pracpassdt></item>';
    return new Response(`<response><header><resultCode>00</resultCode></header><body><items>${item}</items></body></response>`);
  }
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
const { describeFailure } = await import('../server/live.js');
const { normalizeExamRows } = await import('../server/exam-api.js');
const q = await import('../server/queries.js');

test('특기: 같은 코드를 여러 군이 쓰면 섞지 않고, 응답은 Vercel 한도(4.5MB)보다 훨씬 작다', () => {
  const amb = q.mosDetail('46');
  assert.equal(amb.ambiguous, true); assert.deepEqual(amb.branches, ['공군', '해군']);
  const air = q.mosDetail('46', '공군'); const navy = q.mosDetail('46', '해군');
  assert.equal(air.mosName, '비파괴검사병'); assert.equal(navy.mosName, '건축/토목');
  assert(air.eligibility.every((e) => q.normBranch(e._norm.branch) === '공군'));
  assert.equal(q.mosDetail('46', '육군'), null);
  const big = q.mosDetail('901', '해병대'); // 예전 4.81MB
  assert(JSON.stringify(big).length < 1024 * 1024 && big.eligibility.length <= 150 && big.eligibilityTotal > 20000);
  assert(q.mosMatch('46', '공군', ['방사선비파괴검사기능사']).items.length === 1);
  const idx = q.mosIndex(); assert(idx.filter((m) => m.mosCode === '46').length === 2 && idx.find((m) => m.mosCode === '46').shared);
});

test('국가기술자격 일정: 정기·빈자리 행을 한 회차로 합치고 상시는 뺀다', () => {
  const rows = [
    { description: '2026년 정기 기능사 4회', docregstartdt: '20260824', docregenddt: '20260827', docexamdt: '20260916', docpassdt: '20261007', pracregstartdt: '20261012', pracregenddt: '20261015', pracexamstartdt: '20261114', pracexamenddt: '20261202', pracpassdt: '20261211' },
    { description: '2026년 정기 기능사 4회', docregstartdt: '20260910', docregenddt: '20260911', docexamdt: '20260916', docpassdt: '20261007', pracregstartdt: '20261108', pracregenddt: '20261109', pracexamstartdt: '20261114', pracexamenddt: '20261202', pracpassdt: '20261211' },
    { description: '2026년 상시 기능사 3회', docregstartdt: '20260301', docregenddt: '20260302' },
  ];
  const [r, ...rest] = normalizeExamRows(rows, '기능사');
  assert.equal(rest.length, 0);
  assert.deepEqual([r.name, r.writtenApply, r.writtenApplyExtra[0], r.practicalApply, r.practicalExam, r.finalResult], ['정기 기능사 제4회', '2026-08-24~2026-08-27', '2026-09-10~2026-09-11', '2026-10-12~2026-10-15', '2026-11-14~2026-12-02', '2026-12-11']);
});

test('병무청 조회 실패 원인 분류', () => {
  assert.equal(describeFailure(new Error('missing_key')).code, 'missing_key');
  assert.equal(describeFailure(new Error('upstream_error_30')).code, 'portal_30');
  assert.match(describeFailure(new Error('upstream_error_30')).reason, /등록되지 않은 인증키/);
  assert.equal(describeFailure(new Error('upstream_http_502')).code, 'http_502');
  assert.match(describeFailure(new Error('upstream_http_403')).reason, /인증키가 거부/);
  assert.equal(describeFailure(Object.assign(new Error('x'), { name: 'TimeoutError' })).code, 'timeout');
});

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
    // 첫 응답은 저장본일 수 있고, API 조회가 끝나면 live로 바뀐다
    let ex = await (await fetch(`${base}/api/exam-schedule?deadline=2099-12-31`)).json();
    for (let i = 0; i < 50 && !ex.live; i++) { await new Promise((r) => setTimeout(r, 50)); ex = await (await fetch(`${base}/api/exam-schedule?deadline=2099-12-31`)).json(); }
    assert.equal(ex.live, true); assert.deepEqual(ex.rounds.map((r) => r.name), ['정기 기능사 제1회', '정기 기사 제1회']);
    assert(ex.rounds.every((r) => typeof r.canApply === 'boolean' && typeof r.inTime === 'boolean'));
    const ping = await fetch(`${base}/api/ping`); assert.equal(ping.status, 200); assert.equal((await ping.json()).ok, true);
  } finally { Object.assign(fs, original); globalThis.fetch = nativeFetch; await new Promise((resolve) => server.close(resolve)); }
});
