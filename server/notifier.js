import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import * as repo from './repo/index.js';
import { SITE } from './config.js';
import { mailMode, sendMail, validateMailConfig } from './mailer.js';
import { koreaDay, koreaHour, scheduleTime, daysBefore } from './time.js';

export function notificationEvents({ snapshots, calendar, now = new Date() }) {
  const day = koreaDay(now);
  const morning = koreaHour(now) >= 9 && koreaHour(now) < 12;
  const events = [];
  for (const s of snapshots) {
    if (s.source !== 'api' || !s.mosCode) continue; // 샘플 숫자를 실제 알림으로 보내지 않는다.
    const name = `${s.branch || ''} ${s.mosName || s.mosCode}`.trim();
    const base = `round:${repo.snapKey(s)}:${s.applyStart || ''}:${s.applyEnd || ''}`;
    const body = `${name} · ${s.roundLabel || ''}회차\n접수: ${s.applyStart || '미정'} ~ ${s.applyEnd || '미정'}\n입영월: ${s.enlistMonth || '미정'}\n${SITE.url}/mos/${encodeURIComponent(s.mosCode)}\n지원 전 병무청 공고를 확인해 주세요.`;
    const add = (kind, subject, extra = '') => events.push({ key: `${base}:${kind}`, kind, mosCode: s.mosCode, subject, text: `${extra}${body}` });
    if (morning && Number.isFinite(scheduleTime(s.applyStart)) && koreaDay(new Date(scheduleTime(s.applyStart))) === day) add('start', `${name} 접수가 오늘 시작돼요`);
    if (morning && s.applyEnd && daysBefore(s.applyEnd, 1) === day) add('deadline', `${name} 접수가 내일 마감돼요`);
    const left = scheduleTime(s.applyEnd, true) - Number(now);
    // 매시 수집 후 검사: 48시간 경계 이후 첫 성공 실행에서 한 번 보낸다.
    if (left > 0 && left <= 48 * 3600000 && (!s.applyStart || scheduleTime(s.applyStart) <= Number(now)) && s.rate != null && Number(s.rate) >= 0 && Number(s.rate) < 1) {
      add('shortage', `${name}, 지금 미달이에요`, `지원률 ${Number(s.rate).toFixed(2)} · 모집 ${s.quota ?? '-'}명 / 접수 ${s.applicants ?? '-'}명\n마감까지 48시간 이내예요.\n`);
    }
  }
  if (morning) for (const event of calendar) {
    const kind = event.kind === '카투사' ? 'katusa' : event.kind === '사회복무' ? 'social' : null;
    if (!kind || event.verified !== true || !event.id || !event.start || !Number.isFinite(scheduleTime(event.start))) continue;
    for (const before of [7, 0]) if (daysBefore(event.start, before) === day) {
      events.push({ key: `calendar:${event.id}:${event.start}:${before}`, kind, mosCode: null,
        subject: `${event.title} · ${before ? '7일 전' : '오늘'}`,
        text: `${event.title}\n일정: ${event.start}${event.end ? ` ~ ${event.end}` : ''}\n${event.target || ''}\n${event.sourceUrl || `${SITE.url}/calendar`}\n신청 전 공식 공고를 확인해 주세요.`,
      });
    }
  }
  return [...new Map(events.map((event) => [event.key, event])).values()];
}

export async function notify({ now = new Date(), deliver = sendMail } = {}) {
  validateMailConfig();
  const release = repo.acquireLock('notify');
  try {
    repo.expireSubscriptions(now);
    repo.pruneSentLog(now);
    const mode = mailMode();
    const state = repo.collectStatus(Number(now));
    const snapshots = state.isSample || state.stale || state.consecutiveFailures >= 3 ? [] : repo.latestSnapshots();
    const events = notificationEvents({ snapshots, calendar: repo.getCalendar(), now });
    const previous = new Map(repo.getSentLog().map((entry) => [`${entry.mode}:${entry.key}`, entry]));
    const summary = { mode, eligibleEvents: events.length, verifiedSubscribers: 0, sent: 0, previewed: 0, duplicate: 0, uncertain: 0, failed: 0, skippedStatus: snapshots.length === 0 };
    for (const sub of repo.getSubscriptions()) {
      if (!sub.verifiedAt) continue;
      summary.verifiedSubscribers++;
      for (const event of events) {
        if (!sub.kinds.includes(event.kind) || (sub.mosCode && sub.mosCode !== event.mosCode)) continue;
        const key = crypto.createHash('sha256').update(`${sub.contact.toLowerCase()}\n${event.key}`).digest('hex');
        const prior = previous.get(`${mode}:${key}`);
        if (prior && ['sent', 'preview', 'pending', 'uncertain'].includes(prior.status)) { summary.duplicate++; continue; }
        // 발송 직전에 해지/확인 상태를 다시 확인한다.
        const current = repo.getSubscriptions().find((s) => s.id === sub.id);
        if (!current?.verifiedAt || !current.kinds.includes(event.kind)) continue;
        const record = { at: now.toISOString(), key, mode, kind: event.kind, event: event.key };
        repo.appendSentLog({ ...record, status: 'pending' }); // fsync 후 외부 발송: 불명확한 전송의 자동 재시도 금지
        let final;
        try {
          const result = await deliver({ to: current.contact, unsubToken: current.unsubToken, subject: `[입대타이밍] ${event.subject}`, text: event.text }, { idempotencyKey: `alert/${key}` });
          final = { ...record, status: result.mode === 'console' ? 'preview' : 'sent', providerId: result.id };
          summary[result.mode === 'console' ? 'previewed' : 'sent']++;
        } catch (error) {
          final = { ...record, status: error.uncertain ? 'uncertain' : 'failed' };
          summary[error.uncertain ? 'uncertain' : 'failed']++;
          console.error(`[notify] ${final.status} ${key.slice(0, 12)}`);
        }
        repo.appendSentLog(final); previous.set(`${mode}:${key}`, final);
      }
    }
    console.log('[notify]', JSON.stringify(summary));
    return summary;
  } finally { release(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { const result = await notify(); if (result.failed || result.uncertain) process.exitCode = 1; }
  catch (error) { console.error('[notify]', error.message); process.exitCode = 1; }
}
