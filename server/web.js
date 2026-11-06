// Vercel과 같은 React SPA + 읽기 전용 API 모드를 로컬에서도 실행한다.
process.env.DEPLOYMENT_MODE = 'serverless';
const { app } = await import('./app.js');
const { PORT, ROOT_DIR } = await import('./config.js');
const { default: path } = await import('node:path');
const prod = process.argv.includes('--prod');
if (prod) {
  const { default: express } = await import('express');
  app.use(express.static(path.join(ROOT_DIR, 'dist/client')));
  app.get(/^\/(?!api\/).*/, (req, res) => res.sendFile(path.join(ROOT_DIR, 'dist/client/index.html')));
} else {
  const { createServer } = await import('vite');
  const vite = await createServer({ configFile: path.join(ROOT_DIR, 'client/vite.config.js'), server: { middlewareMode: true }, appType: 'spa' });
  app.use(vite.middlewares);
}
app.listen(PORT, () => console.log(`[server] http://localhost:${PORT} (React + API, ${prod ? 'production' : 'development'})`));
