// 빌드 뒤 dist/client에 robots.txt와 sitemap.xml을 만든다.
// 주소는 SITE_URL(권장) → VERCEL_PROJECT_PRODUCTION_URL(Vercel 기본 제공) 순으로 정한다.
// 주소를 알 수 없으면 sitemap은 만들지 않고 robots.txt만 둔다(잘못된 주소의 사이트맵은 안 만드는 편이 낫다).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'dist/client');
if (!fs.existsSync(OUT)) { console.error('[seo] dist/client가 없어요. vite build 뒤에 실행하세요.'); process.exit(1); }

const site = (process.env.SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '')).replace(/\/$/, '');
const today = new Date().toISOString().slice(0, 10);

// 정적 라우트. /status·/contact는 색인 가치가 낮아 제외(화면에서도 noindex).
const STATIC = ['/', '/now', '/closing', '/find', '/calendar', '/plan', '/calc', '/compare', '/jobfit', '/mos', '/prepare', '/social', '/alerts', '/guide', '/about', '/privacy', '/terms'];

const { GUIDES } = await import(path.join(ROOT, 'client/src/lib/guide-list.js').replace(/\\/g, '/').replace(/^([A-Za-z]):/, 'file:///$1:'));
let mosCodes = [];
try {
  const { mosIndex } = await import(path.join(ROOT, 'server/queries.js').replace(/\\/g, '/').replace(/^([A-Za-z]):/, 'file:///$1:'));
  mosCodes = mosIndex().map((m) => m.mosCode).filter(Boolean);
} catch (error) {
  console.warn('[seo] 특기 목록을 읽지 못해 사이트맵에서 /mos/* 를 뺐어요:', error.message);
}

const urls = [
  ...STATIC.map((p) => ({ loc: p, changefreq: p === '/' || p === '/now' ? 'hourly' : p.startsWith('/guide') ? 'monthly' : 'daily', priority: p === '/' ? '1.0' : '0.8' })),
  ...GUIDES.map((g) => ({ loc: `/guide/${g.slug}`, lastmod: g.updated, changefreq: 'monthly', priority: '0.7' })),
  ...mosCodes.map((code) => ({ loc: `/mos/${encodeURIComponent(code)}`, changefreq: 'daily', priority: '0.6' })),
];

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const robots = ['User-agent: *', 'Allow: /', 'Disallow: /api/', 'Disallow: /status', 'Disallow: /contact', site ? `Sitemap: ${site}/sitemap.xml` : '', ''].filter((l, i, a) => l !== '' || i === a.length - 1).join('\n');
fs.writeFileSync(path.join(OUT, 'robots.txt'), robots);

if (site) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${esc(site + u.loc)}</loc><lastmod>${u.lastmod || today}</lastmod><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`).join('\n')}\n</urlset>\n`;
  fs.writeFileSync(path.join(OUT, 'sitemap.xml'), xml);
  console.log(`[seo] robots.txt, sitemap.xml 생성 · ${urls.length}개 URL · ${site}`);
} else {
  console.warn('[seo] SITE_URL이 없어 sitemap.xml을 만들지 않았어요. 도메인을 연결하면 SITE_URL=https://도메인 을 설정하세요.');
}
