// 발송은 이 모듈의 HTTP fetch 한 곳으로만 통과한다. SDK/SMTP 라이브러리는 사용하지 않는다.
import { MAIL, SITE } from './config.js';

export function mailMode() { return MAIL.key ? 'live' : 'console'; }
export function validateMailConfig() {
  if (!MAIL.key) return;
  if (MAIL.provider.toLowerCase() !== 'resend') throw new Error('지원하는 MAIL_PROVIDER는 Resend입니다');
  if (!MAIL.from || /[\r\n]/.test(MAIL.from)) throw new Error('MAIL_FROM 설정이 필요합니다');
  if (!SITE.url.startsWith('https://')) throw new Error('실제 발송에는 HTTPS SITE_URL이 필요합니다');
  if (!SITE.contactEmail) throw new Error('CONTACT_EMAIL 설정이 필요합니다');
}

export function mailContent({ to, subject, text, unsubToken }) {
  const unsubscribe = `${SITE.url}/api/unsubscribe?token=${encodeURIComponent(unsubToken)}`;
  return { from: MAIL.from || '입대타이밍 <preview@example.test>', to: [to], subject,
    text: `${text}\n\n—\n입대타이밍 · 신청한 알림만 보내 드려요.\n알림 해지: ${unsubscribe}\n개인정보처리방침: ${SITE.url}/privacy${SITE.contactEmail ? `\n문의: ${SITE.contactEmail}` : ''}`,
    headers: { 'List-Unsubscribe': `<${unsubscribe}>` },
  };
}

export async function sendMail(message, { idempotencyKey, fetchImpl = fetch } = {}) {
  validateMailConfig();
  const content = mailContent(message);
  if (!MAIL.key) {
    console.log('[mail:console] 보낼 내용\n' + JSON.stringify(content, null, 2));
    return { mode: 'console', id: null };
  }
  let response;
  try {
    response = await fetchImpl('https://api.resend.com/emails', {
      method: 'POST', signal: AbortSignal.timeout(15000),
      headers: { Authorization: `Bearer ${MAIL.key}`, 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify(content),
    });
  } catch {
    throw Object.assign(new Error('메일 API 응답을 확인하지 못했습니다'), { uncertain: true });
  }
  if (!response.ok) {
    // 공급자 응답 본문(이메일/키 포함 가능)은 로그나 사용자에게 반환하지 않는다.
    throw Object.assign(new Error(`메일 API HTTP ${response.status}`), { uncertain: response.status >= 500 || response.status === 409 });
  }
  let result;
  try { result = await response.json(); } catch { /* 전달 여부가 불명확하므로 재발송하지 않는다. */ }
  if (!result?.id) throw Object.assign(new Error('메일 API 발송 ID를 확인하지 못했습니다'), { uncertain: true });
  return { mode: 'live', id: result.id };
}

export function sendVerification(subscription) {
  return sendMail({ to: subscription.contact, unsubToken: subscription.unsubToken,
    subject: '[입대타이밍] 이메일을 확인해 주세요',
    text: `알림 신청을 완료하려면 아래 링크를 48시간 안에 눌러 주세요. 확인하기 전에는 새 알림을 보내지 않아요.\n\n${SITE.url}/api/verify?token=${subscription.verifyToken}\n\n직접 신청하지 않았다면 확인하지 말고 아래 해지 링크를 이용해 주세요.`,
  }, { idempotencyKey: `verify/${subscription.verifyToken}` });
}
