// Vercel은 app.listen 없이 Express 앱을 함수로 실행한다. 서버 키는 이 번들 안에서만 사용.
import { app } from '../server/app.js';
export default app;
