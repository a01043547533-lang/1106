import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));

// 심사·광고용 head 태그를 빌드 시에만 넣는다. 값이 없으면 아무것도 넣지 않아서 깨진 태그가 생기지 않는다.
//  - VITE_ADSENSE_CLIENT=ca-pub-… : AdSense 스크립트(심사 코드이자 광고 코드)
//  - GOOGLE_SITE_VERIFICATION / NAVER_SITE_VERIFICATION : 서치콘솔·서치어드바이저 소유 확인 메타
function seoHead(env) {
  const tags = [];
  const client = env.VITE_ADSENSE_CLIENT || '';
  if (/^ca-pub-\d+$/.test(client)) tags.push(`<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}" crossorigin="anonymous"></script>`);
  const safe = (v) => /^[\w-]+$/.test(v);
  if (env.GOOGLE_SITE_VERIFICATION && safe(env.GOOGLE_SITE_VERIFICATION)) tags.push(`<meta name="google-site-verification" content="${env.GOOGLE_SITE_VERIFICATION}" />`);
  if (env.NAVER_SITE_VERIFICATION && safe(env.NAVER_SITE_VERIFICATION)) tags.push(`<meta name="naver-site-verification" content="${env.NAVER_SITE_VERIFICATION}" />`);
  return {
    name: 'seo-head',
    transformIndexHtml(html) { return html.replace('<!--seo-head-->', tags.join('\n    ')); },
  };
}

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, fileURLToPath(new URL('..', import.meta.url)), ''), ...process.env };
  return {
    root,
    plugins: [react(), seoHead(env)],
    server: {
      port: 5173,
    },
    build: {
      outDir: fileURLToPath(new URL('../dist/client', import.meta.url)),
      emptyOutDir: true,
    },
  };
});
