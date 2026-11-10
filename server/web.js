// Vercel과 같은 React SPA + 읽기 전용 API 모드를 로컬에서도 실행한다.
process.env.DEPLOYMENT_MODE = 'serverless';
const { app } = await import('./app.js');
const { PORT, ROOT_DIR } = await import('./config.js');
const { default: path } = await import('node:path');
const prod = process.argv.includes('--prod');
if (prod) {
  const { default: express } = await import('express');
  app.use(express.static(path.join(ROOT_DIR, 'dist/client')));
  app.all('/_vercel/*', (req, res) => res.sendStatus(404)); // Vercel 전용 경로(통계 스크립트 등)는 로컬에 없다
  app.get(/^\/(?!ads[.]txt$|api\/).*/, (req, res) => res.sendFile(path.join(ROOT_DIR, 'dist/client/index.html')));
} else {
  const { createServer } = await import('vite');
  const vite = await createServer({ configFile: path.join(ROOT_DIR, 'client/vite.config.js'), server: { middlewareMode: true }, appType: 'spa' });
  app.use(vite.middlewares);
}
// 이 PC 안에서만 열리게 한다(같은 네트워크의 다른 기기에서 개발 서버에 접근하지 못하게). 필요하면 HOST=0.0.0.0으로 연다.
const HOST = process.env.HOST || '127.0.0.1';
app.listen(PORT, HOST, () => console.log(`[server] http://localhost:${PORT} (React + API, ${prod ? 'production' : 'development'}, ${HOST}에서만 접속 가능)`));
