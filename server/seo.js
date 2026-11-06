// 라우트별 제목·설명·canonical·OG·JSON-LD. 네이버·구글 모두 이 <head>를 읽는다.
import { SITE } from './config.js';
import { describeMos, rateLine } from '../client/src/lib/describe.js';

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const clip = (s, n = 155) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const json = (o) => JSON.stringify(o).replace(/</g, '\\u003c');

const PAGES = {
  '/': {
    title: `${SITE.name} · 모집병 경쟁률·지원자격·입대 일정 한눈에`,
    description: '육군·해군·공군·해병대 모집병 실시간 지원률, 내 신체조건과 자격으로 갈 수 있는 특기, 접수·입영 일정을 병무청 공공데이터로 정리해요.',
  },
  '/now': {
    title: `지금 접수 중인 모집병 실시간 지원률 · ${SITE.name}`,
    description: '지금 접수 중인 각 군 모집병 특기별 모집인원·접수인원·지원률을 낮은 순으로 보여 줘요. 미달 특기를 바로 찾을 수 있어요.',
  },
  '/mos': {
    title: `모집병 특기 전체 목록(육군·해군·공군·해병대) · ${SITE.name}`,
    description: '각 군 모집병 군사특기를 한곳에 모았어요. 특기마다 신체조건, 지원 자격·면허·전공, 회차별 경쟁률 기록을 볼 수 있어요.',
  },
  '/calendar': {
    title: `모집병·사회복무요원·카투사 접수 일정 · ${SITE.name}`,
    description: '모집병 접수, 일반병 입영일자 본인선택, 사회복무요원 소집신청, 카투사 접수 일정을 시간순으로 정리했어요.',
  },
  '/find': {
    title: `내 조건으로 갈 수 있는 군 특기 찾기 · ${SITE.name}`,
    description: '키·몸무게·시력·신체등급과 가진 자격증을 넣으면 지원할 수 있는 모집병 특기와 안 되는 이유를 알려 줘요. 입력값은 저장하지 않아요.',
  },
  '/plan': { title: `입영월별 모집병 플래너 · ${SITE.name}`, description: '원하는 입영월을 고르면 접수부터 입영까지 일정과 특기별 지원률을 비교해 줘요.' },
  '/score': { title: `모집병 점수 계산기(배점 기준) · ${SITE.name}`, description: '자격·면허·전공으로 받을 수 있는 모집병 배점과 추첨 전환 여부를 병무청 배점 기준으로 보여 줘요.' },
  '/alerts': { title: `모집병 접수 알림 받기 · ${SITE.name}`, description: '관심 특기의 접수 시작·마감, 미달 소식, 카투사·사회복무요원 일정을 이메일로 알려 줘요.' },
  '/prepare': { title: `입대 준비 체크리스트(지원 전·합격 후·입영 당일) · ${SITE.name}`, description: '모집병 지원 전 서류, 중복접수 규칙, 합격 후 일정, 입영 당일 준비를 단계별로 정리했어요.' },
  '/social': { title: `사회복무요원 복무기관 찾기·소집 일정 · ${SITE.name}`, description: '4급(보충역) 판정자를 위한 사회복무요원 복무기관 검색과 소집신청 일정이에요.' },
  '/privacy': { title: `개인정보처리방침 · ${SITE.name}`, description: `${SITE.name} 개인정보처리방침` },
  '/status': { title: `서비스 운영 상태 · ${SITE.name}`, description: 'API 수집 성공·실패, 데이터 갱신 시각과 SSR 오류 현황을 공개해요.' },
  '/terms': { title: `이용약관 · ${SITE.name}`, description: `${SITE.name} 이용약관` },
  '/ads': { title: `광고 안내 · ${SITE.name}`, description: '입대 6~12개월 전 지원자와 부모에게 닿는 광고 자리를 안내해요.' },
};

const ORG = { '@context': 'https://schema.org', '@type': 'Organization', name: SITE.name, url: SITE.url };

export function buildHead(pathname, loaded) {
  const url = `${SITE.url}${pathname === '/' ? '/' : pathname}`;
  let { title, description } = PAGES[pathname] || {};
  const ld = [ORG];
  let robots = 'index,follow';

  const d = loaded?.data?.mos;
  if (d) {
    title = `${d.mosName} 경쟁률·지원자격 · ${d.branch || ''} 모집병 · ${SITE.name}`.replace(/\s+/g, ' ');
    // 설명의 숫자는 본문과 같은 함수(rateLine)로 만든다 → 화면 숫자와 절대 다르지 않다.
    description = [rateLine(d), `${d.mosName}의 신체조건과 지원 자격, 회차별 경쟁률 기록을 볼 수 있어요.`].filter(Boolean).join(' ');
    ld.push({
      '@context': 'https://schema.org', '@type': 'Dataset',
      name: `${d.branch || ''} ${d.mosName} 모집병 지원현황`.trim(),
      description: describeMos(d).join(' ') || description,
      url, creator: ORG, isBasedOn: 'https://www.data.go.kr (병무청 공공데이터)',
      license: 'https://www.data.go.kr', dateModified: loaded.meta?.collectedAt || undefined,
    });
    ld.push({
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: SITE.name, item: `${SITE.url}/` },
        { '@type': 'ListItem', position: 2, name: '특기 목록', item: `${SITE.url}/mos` },
        { '@type': 'ListItem', position: 3, name: d.mosName, item: url },
      ],
    });
  }
  if (pathname === '/') ld.push({ '@context': 'https://schema.org', '@type': 'WebSite', name: SITE.name, url: `${SITE.url}/` });

  if (loaded?.status === 404) {
    title = `페이지를 찾을 수 없어요 · ${SITE.name}`;
    description = '주소를 다시 확인해 주세요.';
    robots = 'noindex,follow';
  }
  // 샘플 데이터일 때는 색인하지 않는다(가짜처럼 보이는 숫자가 검색에 남지 않게).
  if (loaded?.meta?.source === 'sample' && d) robots = 'noindex,follow';

  title = title || SITE.name;
  description = clip(description || PAGES['/'].description);

  const tags = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}">`,
    `<meta name="robots" content="${robots}">`,
    `<link rel="canonical" href="${esc(url)}">`,
    `<meta property="og:type" content="${d ? 'article' : 'website'}">`,
    `<meta property="og:site_name" content="${esc(SITE.name)}">`,
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(description)}">`,
    `<meta property="og:url" content="${esc(url)}">`,
    `<meta property="og:locale" content="ko_KR">`,
    `<meta name="twitter:card" content="summary">`,
  ];
  if (SITE.naverVerification) tags.push(`<meta name="naver-site-verification" content="${esc(SITE.naverVerification)}">`);
  if (SITE.googleVerification) tags.push(`<meta name="google-site-verification" content="${esc(SITE.googleVerification)}">`);
  for (const o of ld) tags.push(`<script type="application/ld+json">${json(o)}</script>`);
  return tags.join('\n    ');
}

// ── sitemap.xml / robots.txt / rss.xml ──
export function sitemapXml(mosList, lastmod) {
  const lm = lastmod ? `<lastmod>${lastmod.slice(0, 10)}</lastmod>` : '';
  const fixed = ['/', '/now', '/mos', '/calendar', '/find', '/plan', '/score', '/prepare', '/social', '/alerts'];
  const urls = [
    ...fixed.map((p) => `<url><loc>${esc(SITE.url + p)}</loc>${lm}</url>`),
    ...mosList.map((m) => `<url><loc>${esc(`${SITE.url}/mos/${encodeURIComponent(m.mosCode)}`)}</loc>${lm}</url>`),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

export function robotsTxt() {
  return `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${SITE.url}/sitemap.xml\n`;
}

// 네이버 서치어드바이저는 RSS 제출도 받는다. 일정(새 접수 회차)을 새 글처럼 알린다.
export function rssXml(calendar, lastmod) {
  const items = calendar.slice(0, 30).map((e) => `
  <item>
    <title>${esc(e.title)}</title>
    <link>${esc(`${SITE.url}/calendar`)}</link>
    <guid isPermaLink="false">${esc(e.id)}</guid>
    <description>${esc(`${e.start || ''}${e.end ? ` ~ ${e.end}` : ''} · ${e.target || ''}`)}</description>
  </item>`).join('');
  const date = new Date(lastmod || Date.now()).toUTCString();
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <title>${esc(SITE.name)} · 접수 일정</title>
  <link>${esc(SITE.url)}/</link>
  <description>모집병·사회복무요원·카투사 접수 일정</description>
  <language>ko</language>
  <lastBuildDate>${date}</lastBuildDate>${items}
</channel></rss>
`;
}
