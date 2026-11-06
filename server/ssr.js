// 서버 렌더(SSR). 검색 엔진이 본문까지 읽도록 완성된 HTML을 내려준다.
//  - 개발: Vite 미들웨어(HMR 유지) / 운영: dist/client + dist/server
//  - 캐시: url + lastCollectedAt 키, 최대 500개 LRU, TTL 10분
//  - 폴백: 운영에서 렌더가 실패하면 빈 index.html을 200으로 내려 SPA로 동작
import { readText } from './repo/system.js';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import express from 'express';
import { ROOT_DIR } from './config.js';
import { loadRoute } from './loaders.js';
import { buildHead, sitemapXml, robotsTxt, rssXml } from './seo.js';
import * as q from './queries.js';
import { appendJsonl, fileMtime } from './repo/files.js';

const CLIENT_DIR = path.join(ROOT_DIR, 'client');
const DIST_CLIENT = path.join(ROOT_DIR, 'dist', 'client');
const DIST_SERVER = path.join(ROOT_DIR, 'dist', 'server', 'entry-server.js');

// ── LRU 캐시 ──
const MAX = 500;
const TTL = 10 * 60 * 1000;
const cache = new Map();
let cacheVersion = null;
function cacheGet(key) {
  const hit = cache.get(key);
  if (!hit || Date.now() - hit.at > TTL) { cache.delete(key); return null; }
  cache.delete(key); cache.set(key, hit); // 최근 사용으로 이동
  return hit;
}
function cacheSet(key, value) {
  cache.set(key, { ...value, at: Date.now() });
  if (cache.size > MAX) cache.delete(cache.keys().next().value);
}
// 수집기가 새 데이터를 쓰면 lastCollectedAt이 바뀌므로 통째로 비운다.
function checkVersion() {
  const meta = q.meta();
  const v = JSON.stringify([meta.collectedAt, meta.source, meta.stale, meta.consecutiveFailures, fileMtime('collect_log.jsonl')]);
  if (v !== cacheVersion) { cache.clear(); cacheVersion = v; }
  return meta.collectedAt;
}

const safeJson = (o) => JSON.stringify(o).replace(/</g, '\\u003c').replace(/[\u2028\u2029]/g, (c) => `\\u${c.charCodeAt(0).toString(16)}`);

export async function setupSsr(app, { dev }) {
  let vite = null;
  let prodTemplate = null;
  let prodRender = null;

  if (dev) {
    const { createServer } = await import('vite');
    vite = await createServer({
      configFile: path.join(CLIENT_DIR, 'vite.config.js'),
      server: { middlewareMode: true },
      appType: 'custom',
    });
    app.use(vite.middlewares);
  } else {
    prodTemplate = readText(path.join(DIST_CLIENT, 'index.html'));
    prodRender = (await import(pathToFileURL(DIST_SERVER).href)).render;
    app.use(express.static(DIST_CLIENT, { index: false, maxAge: '7d' }));
  }

  // ── 검색 엔진용 파일 ──
  app.get('/robots.txt', (req, res) => res.type('text/plain').send(robotsTxt()));
  app.get('/sitemap.xml', (req, res) => {
    const v = checkVersion();
    const key = `sitemap|${v}`;
    const hit = cacheGet(key);
    const xml = hit?.html || sitemapXml(q.mosIndex(), v);
    if (!hit) cacheSet(key, { html: xml });
    res.type('application/xml').set('Cache-Control', 'public, max-age=3600').send(xml);
  });
  app.get('/rss.xml', (req, res) => {
    res.type('application/rss+xml').set('Cache-Control', 'public, max-age=3600').send(rssXml(q.calendarList().items, q.meta().collectedAt));
  });

  // ── 페이지 렌더 ──
  app.get(/^\/(?!api\/).*/, async (req, res, next) => {
    const url = req.originalUrl;
    const pathname = req.path.replace(/\/+$/, '') || '/';
    if (req.path !== '/' && req.path.endsWith('/')) return res.redirect(301, pathname); // 끝 슬래시 정리(중복 URL 방지)

    const version = checkVersion();
    const key = `GET|${pathname}|${version}`;
    const cacheable = pathname !== '/status';
    if (!dev && cacheable) {
      const hit = cacheGet(key);
      if (hit) {
        console.log(`[ssr] cache hit ${pathname}`);
        return res.status(hit.status).set(headers()).type('html').send(hit.html);
      }
      console.log(`[ssr] cache miss ${pathname}`);
    }

    try {
      const loaded = loadRoute(pathname);
      let template; let render;
      if (dev) {
        template = await vite.transformIndexHtml(url, readText(path.join(CLIENT_DIR, 'index.html')));
        render = (await vite.ssrLoadModule('/src/entry-server.jsx')).render;
      } else {
        template = prodTemplate; render = prodRender;
      }
      const { appHtml } = render(url, { path: pathname, ...loaded });
      const html = template
        .replace('<!--app-head-->', buildHead(pathname, loaded))
        .replace('<!--app-html-->', appHtml)
        .replace('<!--app-data-->', `<script>window.__DATA__ = ${safeJson({ path: pathname, ...loaded })}</script>`);
      if (!dev && cacheable) cacheSet(key, { html, status: loaded.status });
      res.status(loaded.status).set(cacheable ? headers() : { 'Cache-Control': 'no-store' }).type('html').send(html);
    } catch (e) {
      appendJsonl('ssr_errors.jsonl', { at: new Date().toISOString(), path: pathname, error: 'render_failed' });
      if (dev) { vite.ssrFixStacktrace(e); return next(e); } // 개발 중엔 원인이 보이게 그대로 던진다
      const fallback = prodTemplate.replace('<!--app-head-->', '<title>입대타이밍</title>').replace('<!--app-html-->', '').replace('<!--app-data-->', '');
      res.status(200).type('html').send(fallback);
    }
  });
}

const headers = () => ({ 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' });
