// 서버 시작점.
//   npm run dev   → 개발(Vite 미들웨어 + HMR, http://localhost:3000 하나로 화면·API 모두)
//   npm start     → 운영(npm run build 후 dist/ 사용)
import { fileExists } from './repo/system.js';
import path from 'node:path';
import { app } from './app.js';
import { PORT, ROOT_DIR } from './config.js';
import { setupSsr } from './ssr.js';

const prod = process.argv.includes('--prod');
if (prod && !fileExists(path.join(ROOT_DIR, 'dist', 'server', 'entry-server.js'))) {
  console.error('dist/가 없어요. 먼저 npm run build를 실행하세요.');
  process.exit(1);
}

await setupSsr(app, { dev: !prod });
app.listen(PORT, () => console.log(`[server] http://localhost:${PORT} (${prod ? '운영' : '개발'})`));
