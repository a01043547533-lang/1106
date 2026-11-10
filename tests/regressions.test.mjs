import test from 'node:test';
import assert from 'node:assert/strict';
process.env.VERCEL = '1';
process.env.MMA_API_KEY = '';
const { runtime } = await import('../server/repo/prepared.js');
const q = await import('../server/queries.js');
const { app } = await import('../server/app.js');
const before = { ...runtime };
test.afterEach(() => Object.assign(runtime, before));
async function withServer(run) {
  const server = app.listen(0, '127.0.0.1'); await new Promise((resolve) => server.once('listening', resolve));
  try { await run('http://127.0.0.1:' + server.address().port); } finally { await new Promise((resolve) => server.close(resolve)); }
}

test('시험은 정규 접수 둘째 날·마감일·추가 접수일에도 지원 가능하다', () => {
  runtime.exams = { year: 2026, fetchedAt: '2026-08-01', rounds: [{ writtenApply: '2026-08-24~2026-08-27', writtenApplyExtra: ['2026-09-10~2026-09-11'], finalResult: '2026-12-11' }, { writtenApply: '2026-08-24~2026-08-27' }] };
  for (const day of ['2026-08-25', '2026-08-27', '2026-09-10', '2026-09-11']) assert(q.examsBefore('2026-12-11', day).rounds[0].canApply, day);
  assert.equal(q.examsBefore('2026-12-11', '2026-09-12').rounds[0].canApply, false);
  assert.equal(q.examsBefore('2026-12-10', '2026-08-25').rounds[0].inTime, false);
  assert.equal(q.examsBefore('2026-12-11', '2026-08-25').rounds[1].inTime, false);
});

test('군 캐시가 이전의 없음 응답이나 군 추가를 고정하지 않는다', () => {
  runtime.snapshots = []; assert.deepEqual(q.branchesOfCode('TEST-NEW'), []);
  runtime.snapshots = [{ mosCode: 'TEST-NEW', branch: '육군' }]; assert.deepEqual(q.branchesOfCode('TEST-NEW'), ['육군']);
  runtime.snapshots.push({ mosCode: 'TEST-NEW', branch: '해군' }); assert.equal(q.branchesOfCode('TEST-NEW').length, 2);
});

test('공유 코드의 마감 지원률은 마감 후 최신 관측만 집계한다', () => {
  const row = { mosCode: '46', branch: '해군', roundLabel: '2020-1', category: '일반', enlistMonth: '2020-03', applyEnd: '2020-01-02', quota: 10 };
  runtime.snapshots = [
    { ...row, applicants: 1, collectedAt: '2020-01-03T00:00:00Z' },
    { ...row, applicants: 9, collectedAt: '2020-01-04T00:00:00Z' },
    { ...row, roundLabel: 'ongoing', applyEnd: '2099-01-01', applicants: 5, collectedAt: '2026-01-01T00:00:00Z' },
    { ...row, roundLabel: 'early-only', applicants: 2, collectedAt: '2020-01-01T00:00:00Z' },
  ];
  const rates = q.mosDetail('46', '해군').finalRates;
  assert.deepEqual(rates.map((r) => [r.roundLabel, r.rate]), [['2020-1', 0.9]]);
});

test('실제 API는 쉼표 포함 자격·51번째 자격을 보존하고 모집구분을 합치지 않는다', async () => {
  runtime.snapshots = ['기술행정병', '카투사'].map((category) => ({ branch: '육군', roundLabel: '2026-1', category, enlistMonth: '2026-12', mosCode: category, applyStart: '2026-10-01', applyEnd: '2026-10-08' }));
  await withServer(async (base) => {
    const item = '리눅스마스터(1,2급)';
    const params = new URLSearchParams({ branch: '육군' });
    for (let i = 0; i < 50; i++) params.append('item', '없는자격' + i);
    params.append('item', item);
    const match = await (await fetch(base + '/api/mos/132.102/match?' + params)).json();
    assert(match.items.some((r) => r._norm.item === item));
    const search = await (await fetch(base + '/api/mos/search?' + params)).json();
    assert(search.groups.ok.some((r) => r.mosCode === '132.102'));
    const eligible = await (await fetch(base + '/api/eligible?' + params)).json();
    assert(eligible.items.some((r) => r.mosCode === '132.102'));
    const plan = await (await fetch(base + '/api/plan?months=2026-12')).json();
    assert.deepEqual(plan.items[0].rounds.map((r) => r.category).sort(), ['기술행정병', '카투사']);
  });
});

test('수집 실패와 오래된 저장본만 있는 콜드 인스턴스는 정상 ping을 반환하지 않는다', async () => {
  runtime.snapshots = null; runtime.logs = [{ api: 'status', ok: false, at: new Date().toISOString() }];
  await withServer(async (base) => {
    const response = await fetch(base + '/api/ping');
    assert.equal(response.status, 503); assert.equal((await response.json()).ok, false);
  });
});
