import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createHash } from 'node:crypto';
import { createTestDirectory, fixture, fixtureText, unzipFixture, cleanupTestDirectory } from '../server/repo/test-support.js';

process.env.DATA_DIR = createTestDirectory();
process.env.MAIL_KEY = '';
process.env.MAIL_PROVIDER = 'Resend';
process.env.TRUST_PROXY = '';
const repo = await import('../server/repo/index.js');
const { app } = await import('../server/app.js');
const { notificationEvents, notify } = await import('../server/notifier.js');
const { sendMail } = await import('../server/mailer.js');
const { MAIL, SITE } = await import('../server/config.js');
const { koreaDay, daysBefore } = await import('../server/time.js');
const { requestLimit } = await import('../server/rate-limit.js');
const { setupSsr } = await import('../server/ssr.js');

const now = new Date(`${koreaDay()}T09:05:00+09:00`);
const day = koreaDay(now);
const nextDay = koreaDay(new Date(+now + 86400000));
const weekLater = koreaDay(new Date(+now + 7 * 86400000));
const snapshot = { source: 'api', collectedAt: now.toISOString(), branch: '테스트군', category: '테스트분야', roundLabel: 'TEST-1', mosCode: 'TEST', mosName: '검증용 특기', enlistMonth: '2027-01', applyStart: `${day}T00:00`, applyEnd: `${nextDay}T14:00`, quota: 10, applicants: 3, rate: .3 };
fixture('snapshots.jsonl', JSON.stringify(snapshot) + '\n');
fixture('collect_log.jsonl', JSON.stringify({ api: 'status', at: now.toISOString(), ok: true, httpStatus: 200 }) + '\n');
fixture('mos_master.json', { source: 'api', items: [{ _norm: { mosCode: 'TEST', mosName: '검증용 특기', branch: '테스트군' } }] });
fixture('calendar.json', [
  { id: 'today-social', kind: '사회복무', title: '검증용 사회복무 일정', start: day, verified: true },
  { id: 'week-katusa', kind: '카투사', title: '검증용 카투사 일정', start: weekLater, verified: true },
  { id: 'unverified', kind: '카투사', title: '미확인 날짜', start: day, verified: false },
]);
const captured = [];
const originalLog = console.log;
const originalError = console.error;
console.log = (...args) => { captured.push(args.join(' ')); originalLog(...args); };
console.error = (...args) => { captured.push(args.join(' ')); originalError(...args); };
let server;

test('상용 운영 통합 검증 (외부 메일 전송 없음)', async (t) => {
  try {
    await setupSsr(app, { dev: false });
    server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
    const base = `http://127.0.0.1:${server.address().port}`;
    const post = (body) => fetch(`${base}/api/subscribe`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    let subscription;

    await t.test('구독 → 콘솔 확인 메일 → verifiedAt (확인 전 발송 0)', async () => {
      const response = await post({ contact: 'release-check@example.test', kinds: ['start', 'deadline', 'shortage', 'katusa', 'social'] });
      assert.equal(response.status, 202);
      assert.equal((await response.json()).verificationRequired, true);
      [subscription] = repo.getSubscriptions();
      assert.equal(subscription.verifiedAt, null);
      assert.match(subscription.verifyToken, /^[a-f0-9]{64}$/);
      assert(captured.some((line) => line.includes(`/api/verify?token=${subscription.verifyToken}`)));
      const before = await notify({ now });
      assert.equal(before.verifiedSubscribers, 0); assert.equal(before.previewed, 0);
      const verified = await fetch(`${base}/api/verify?token=${subscription.verifyToken}`);
      assert.equal(verified.status, 200);
      const stored = repo.getSubscriptions()[0];
      assert(stored.verifiedAt); assert(!stored.verifyToken);
      originalLog('[verification-proof]', JSON.stringify({ subscribe: response.status, verifiedBefore: null, verify: verified.status, verifiedAt: stored.verifiedAt }));
      assert.equal((await fetch(`${base}/api/verify?token=${subscription.verifyToken}`)).status, 410);
    });

    await t.test('한국 시간 경계·오전 발송·48시간·캘린더·샘플 제외', () => {
      assert.equal(koreaDay(new Date('2026-11-05T15:01:00Z')), '2026-11-06');
      assert.equal(daysBefore('2027-01-01', 1), '2026-12-31');
      const events = notificationEvents({ snapshots: [snapshot, { ...snapshot, source: 'sample' }, { ...snapshot, mosCode: 'BAD', applyStart: 'invalid', applyEnd: 'invalid' }], calendar: repo.getCalendar(), now });
      assert.deepEqual(events.map((e) => e.kind).sort(), ['deadline', 'katusa', 'shortage', 'social', 'start']);
      assert.equal(notificationEvents({ snapshots: [snapshot], calendar: repo.getCalendar(), now: new Date(`${day}T08:59:00+09:00`) }).length, 1);
      assert.equal(notificationEvents({ snapshots: [{ ...snapshot, applyEnd: `${day}T08:00` }], calendar: [], now }).some((e) => e.kind === 'shortage'), false);
    });

    await t.test('5종 콘솔 발송·같은 사람 중복 구독·재실행 중복 0·해지 링크', async () => {
      repo.updateSubscriptions((subs) => subs.push({ ...subs[0], id: 'duplicate-subscription', mosCode: 'TEST' }));
      const first = await notify({ now });
      assert.equal(first.previewed, 5); assert.equal(first.duplicate, 3);
      const second = await notify({ now });
      assert.equal(second.previewed, 0); assert.equal(second.duplicate, 8);
      assert(captured.filter((line) => line.includes('[mail:console]')).every((line) => line.includes('/api/unsubscribe?token=')));
      assert(!fixtureText('sent_log.jsonl').includes('release-check@example.test'));
    });

    await t.test('전송 결과 불명확한 건은 자동 재시도하지 않음', async () => {
      fixture('sent_log.jsonl', '');
      let attempts = 0;
      const first = await notify({ now, deliver: async () => { attempts++; throw Object.assign(new Error('timeout'), { uncertain: true }); } });
      assert.equal(first.uncertain, 5);
      const second = await notify({ now, deliver: async () => { attempts++; return { mode: 'console' }; } });
      assert.equal(second.previewed, 0); assert.equal(attempts, 5);
    });

    await t.test('Resend HTTP 어댑터·idempotency·실패 분류 (fetch 모의)', async () => {
      const original = { ...MAIL }; const originalUrl = SITE.url;
      try {
        MAIL.key = 'test-only'; MAIL.from = 'test@example.test'; SITE.url = 'https://example.test';
        let request;
        const result = await sendMail({ to: 'recipient@example.test', subject: 'Test', text: 'Body', unsubToken: 'test' }, {
          idempotencyKey: 'test/key', fetchImpl: async (url, options) => { request = { url, ...options }; return { ok: true, json: async () => ({ id: 'mock-message' }) }; },
        });
        assert.equal(result.id, 'mock-message'); assert.equal(request.headers['Idempotency-Key'], 'test/key');
        assert.equal(request.url, 'https://api.resend.com/emails'); assert(JSON.parse(request.body).text.includes('/api/unsubscribe'));
        await assert.rejects(sendMail({ to: 'recipient@example.test', subject: 'Test', text: 'Body', unsubToken: 'test' }, {
          fetchImpl: async () => { throw new Error('network'); },
        }), (error) => error.uncertain === true);
      } finally { Object.assign(MAIL, original); SITE.url = originalUrl; }
    });

    await t.test('개인정보 쿼리 정상·오류 경로 로그 누출 없음', async () => {
      const marker = 'PRIVATE_QUERY_DO_NOT_LOG';
      for (const route of ['mos/search', 'eligible']) {
        const response = await fetch(`${base}/api/${route}?items=${marker}&height=179.123`);
        assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'no-store');
        const invalid = await fetch(`${base}/api/${route}?items=${marker}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{bad' });
        assert.equal(invalid.status, 400);
      }
      assert(!captured.join('\n').includes(marker));
    });

    await t.test('상태 8개 API·최근 24시간 오류·SSR 캐시 hit·privacy 설정', async () => {
      fixture('ssr_errors.jsonl', [new Date().toISOString(), new Date(Date.now() - 25 * 3600000).toISOString()].map((at) => JSON.stringify({ at, error: 'test' })).join('\n') + '\n');
      const response = await fetch(`${base}/api/health`); const health = await response.json();
      assert.equal(health.apis.length, 8); assert.equal(health.ssrErrors24h, 1); assert.equal(health.isSample, false);
      assert(!JSON.stringify(health).includes('MAIL_KEY'));
      const status = await fetch(`${base}/status`);
      assert.equal(status.headers.get('cache-control'), 'no-store'); assert((await status.text()).includes('API별 수집 기록'));
      await fetch(`${base}/privacy`); const again = await fetch(`${base}/privacy`);
      const html = await again.text(); assert(html.includes('Resend')); assert(html.includes(SITE.contactEmail));
      assert(captured.includes('[ssr] cache miss /privacy')); assert(captured.includes('[ssr] cache hit /privacy'));
      originalLog('[health-proof]', JSON.stringify(health));
    });

    await t.test('값이 같아도 수집 성공 시각 갱신·실패3회·오래됨·상단 띠', async () => {
      const at = new Date(+now + 3600000).toISOString();
      repo.appendCollectLog({ api: 'status', at, ok: true });
      assert.equal(repo.collectStatus(+now + 3600000).lastCollectedAt, at);
      for (let i = 1; i <= 3; i++) repo.appendCollectLog({ api: 'status', at: new Date(+now + (i + 1) * 3600000).toISOString(), ok: false });
      assert.equal(repo.collectStatus(+now + 5 * 3600000).consecutiveFailures, 3);
      assert.equal(repo.collectStatus(+now + 8 * 3600000).stale, true);
      fixture('collect_log.jsonl', [
        { api: 'status', at: new Date(Date.now() - 7 * 3600000).toISOString(), ok: true },
        ...[3, 2, 1].map((hours) => ({ api: 'status', at: new Date(Date.now() - hours * 3600000).toISOString(), ok: false })),
      ].map((row) => JSON.stringify(row)).join('\n') + '\n');
      const html = await (await fetch(`${base}/privacy`)).text();
      assert(html.includes('데이터가 오래됐어요')); assert(html.includes('접수현황 수집이 연속 3회 이상 실패했어요'));
      const original = fixtureText('snapshots.jsonl');
      fixture('snapshots.jsonl', JSON.stringify({ ...snapshot, source: 'sample' }) + '\n');
      const sample = await (await fetch(`${base}/terms`)).text(); assert(sample.includes('샘플 데이터예요. 실제 접수현황과 다를 수 있어요.'));
      fixture('snapshots.jsonl', original);
    });

    await t.test('알림 작업 동시 실행 잠금·90일 이력 정리', async () => {
      const release = repo.acquireLock('notify');
      try { await assert.rejects(notify({ now }), /작업이 실행 중/); } finally { release(); }
      repo.appendSentLog({ at: new Date(+now - 91 * 86400000).toISOString(), key: 'expired-record', status: 'sent' });
      repo.pruneSentLog(now); assert(!repo.getSentLog().some((row) => row.key === 'expired-record'));
      assert(repo.getSentLog().some((row) => row.status === 'uncertain'));
    });

    await t.test('gzip 복원 바이트·해시 일치·같은 주 덮어쓰기 없음', async () => {
      const before = fixtureText('snapshots.jsonl');
      const backup = await repo.backupSnapshots(now);
      assert.equal(unzipFixture(backup.file), before);
      assert.equal(backup.sha256, createHash('sha256').update(before).digest('hex'));
      assert.equal((await repo.backupSnapshots(now)).skipped, true);
      assert.equal(fixtureText('snapshots.jsonl'), before);
    });

    await t.test('이메일 종류 추가 재확인·만료 토큰 거부·미확인 7일 정리·해지', async () => {
      repo.updateSubscriptions((subs) => { subs.splice(1); subs[0].kinds = ['start']; subs[0].verificationSentAt = new Date(0).toISOString(); });
      await post({ contact: 'release-check@example.test', kinds: ['social'] });
      assert.deepEqual(repo.getSubscriptions()[0].kinds, ['start']);
      const pending = repo.getSubscriptions()[0];
      repo.updateSubscriptions((subs) => { subs[0].verifyExpiresAt = new Date(0).toISOString(); });
      assert.equal((await fetch(`${base}/api/verify?token=${pending.verifyToken}`)).status, 410);
      repo.updateSubscriptions((subs) => subs.push({ id: 'old', createdAt: new Date(+now - 8 * 86400000).toISOString(), verifiedAt: null }));
      repo.expireSubscriptions(now); assert.equal(repo.getSubscriptions().length, 1);
      await fetch(`${base}/api/unsubscribe?token=${subscription.unsubToken}`); assert.equal(repo.getSubscriptions().length, 0);
    });

    await t.test('IP당 60회 제한·61회 429·시간 경과 회복', () => {
      let clock = 100000; const limit = requestLimit({ clock: () => clock }); let calls = 0; let status;
      const res = { set() {}, status(code) { status = code; return this; }, json() {} };
      for (let i = 0; i < 61; i++) limit({ ip: 'test-ip' }, res, () => calls++);
      assert.equal(calls, 60); assert.equal(status, 429);
      clock += 60001; limit({ ip: 'test-ip' }, res, () => calls++); assert.equal(calls, 61);
    });

    await t.test('실제 /api/* 제한·X-Forwarded-For 변경으로 우회 불가', async () => {
      let blocked = 0;
      for (let i = 0; i < 65; i++) {
        const response = await fetch(`${base}/api/public-config`, { headers: { 'X-Forwarded-For': `203.0.113.${i}` } });
        if (response.status === 429) { blocked++; assert(response.headers.get('retry-after')); }
      }
      assert(blocked > 0);
    });
  } finally {
    if (server) await new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); });
    console.log = originalLog; console.error = originalError; cleanupTestDirectory();
  }
});
