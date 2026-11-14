// 1탄 Express API를 그대로 쓴다. /api/* 요청을 Express 앱이 처리한다(병무청 키는 서버에서만 읽음).
// 2탄 /api/v1/* 는 app/api/v1 의 라우트 핸들러가 먼저 처리한다.
import { app } from '../../../server/app.js';

export const config = { api: { bodyParser: false, externalResolver: true }, maxDuration: 60 };

export default function handler(req, res) {
  return app(req, res);
}
