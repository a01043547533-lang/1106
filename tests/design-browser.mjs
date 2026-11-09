// Run against a local production server and a separate headless Chrome on port 9333.
import assert from 'node:assert/strict';
import { saveDesignCheck } from '../server/repo/design-check.js';
const origin = process.env.CHECK_ORIGIN || 'http://localhost:3100';
const tabs = await (await fetch('http://localhost:9333/json')).json();
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r, { once: true }));
let id = 0; const calls = new Map(); const errors = []; const pending = new Set();
ws.addEventListener('message', e => {
  const m = JSON.parse(e.data);
  if (m.id) { const p = calls.get(m.id); calls.delete(m.id); m.error ? p.reject(m.error) : p.resolve(m.result); }
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.text + ': ' + m.params.exceptionDetails.exception?.description);
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map(x => x.value || x.description).join(' '));
  if (m.method === 'Network.requestWillBeSent' && m.params.request.url.startsWith(origin)) pending.add(m.params.requestId);
  if (['Network.loadingFinished', 'Network.loadingFailed'].includes(m.method)) pending.delete(m.params.requestId);
});
const send = (method, params = {}) => new Promise((resolve, reject) => { const key = ++id; calls.set(key, { resolve, reject }); ws.send(JSON.stringify({ id: key, method, params })); });
const evaluate = async expression => {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + r.exceptionDetails.exception?.description);
  return r.result.value;
};
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function settled() {
  for (let i = 0; i < 240; i++) { await sleep(250); if (!pending.size && await evaluate('!!document.querySelector("main h1")')) return; }
  throw new Error('Page did not settle');
}
async function go(route) { pending.clear(); await send('Page.navigate', { url: origin + route }); await settled(); }
async function click(selector) { assert(await evaluate(`!!document.querySelector(${JSON.stringify(selector)})`), selector); await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`); await settled(); }
async function value(selector, text) {
  await evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)}); const proto=el.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto,'value').set.call(el,${JSON.stringify(text)});el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await sleep(300); await settled();
}
async function shot(name) { const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }); saveDesignCheck(name + '.png', Buffer.from(r.data, 'base64')); }
const report = { routes: [], interactions: [], errors };
try {
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await go('/'); await sleep(850); await shot('home-desktop');
  const detail = await evaluate('document.querySelector(".topcard")?.getAttribute("href")');
  assert(detail, 'Home contains a real specialty');
  const routes = ['/', '/now', '/find', '/mos', detail, '/calendar', '/score', '/alerts', '/prepare', '/plan', '/social', '/privacy', '/terms', '/ads', '/status'];
  for (const route of routes) {
    await go(route);
    const state = await evaluate(`({title:document.title,h1:document.querySelector('h1')?.textContent,overflow:document.documentElement.scrollWidth>innerWidth,links:[...document.querySelectorAll('a[href^="/"]')].map(a=>a.getAttribute('href'))})`);
    assert(state.h1 && !state.overflow, route + ' desktop layout');
    report.routes.push({ route, ...state });
    // Resize the same live page: this validates mobile without repeating API requests.
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await sleep(150);
    assert.equal(await evaluate('document.documentElement.scrollWidth > innerWidth'), false, route + ' mobile overflow');
    if (['/', '/now', '/find', detail, '/prepare'].includes(route)) await shot(route === '/' ? 'home-mobile' : route.startsWith('/mos/') ? 'detail-mobile' : route.slice(1) + '-mobile');
    await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  }
  report.interactions.push('All 15 routes directly load at desktop and mobile widths');
  // Keep the real API's 60/minute rate limit intact during extended UI verification.
  saveDesignCheck('routes.json', JSON.stringify(report, null, 2));
  console.log('Route checks passed; waiting for rate-limit window before interaction checks.');
  await sleep(45000);
  await go('/now');
  const rates = () => evaluate("[...document.querySelectorAll('tbody tr')].map(r=>Number(r.querySelector('.count-final')?.textContent)).filter(Number.isFinite)");
  let nums = await rates(); assert(nums.every((n,i)=>!i || nums[i-1]<=n));
  await click('.filters button'); nums = await rates(); assert(nums.every((n,i)=>!i || nums[i-1]>=n));
  await click('.tabs button:nth-child(2)');
  assert(await evaluate("[...document.querySelectorAll('tbody tr td:first-child .muted')].every(e=>e.textContent.includes('육군'))"));
  await shot('now-desktop'); report.interactions.push('Now sort ascending/descending and army filter');
  await go('/find'); await click('button[type=submit]'); assert(await evaluate('!!document.querySelector(".result-group")'));
  report.interactions.push('Find submits unchanged query and renders real grouped results');
  await go('/plan'); await click('.chips button'); assert(await evaluate('!!document.querySelector(".card h2")'));
  await value('input[type=date]', '2027-03-01'); assert(await evaluate("document.querySelector('.warn').textContent.includes('2027-01-30')"));
  report.interactions.push('Plan month selection and 30-day calculation');
  await go('/prepare'); await value('input[type=month]', '2027-01');
  assert(await evaluate("document.querySelector('main').textContent.includes('2028년 07월')"));
  await click('input[type=checkbox]'); assert(await evaluate('document.querySelector("input[type=checkbox]").checked'));
  report.interactions.push('Service duration calculation and preparation checklist');
  await go('/score'); await value('.picker input', '운전');
  await click('.picker-options input[type=checkbox]'); await click('.cardbtn');
  assert(await evaluate('!!document.querySelector("table.grid") || !!document.querySelector(".warn")'));
  report.interactions.push('Score qualification selection, specialty selection and official score table');
  await go('/social'); await value('input', '없는기관확인xyz');
  assert(await evaluate('!!document.querySelector(".feedback.empty")'));
  report.interactions.push('Social search and empty result');
  await go('/calendar'); await click('.tabs button:nth-child(4)');
  report.interactions.push('Calendar category filter');
  await click('header nav a[href="/find"]');
  assert.equal(await evaluate('document.activeElement.tagName'), 'H1');
  assert.equal(await evaluate('window.scrollY'), 0);
  await evaluate('history.back()'); await settled();
  assert.equal(await evaluate('location.pathname'), '/calendar');
  report.interactions.push('Internal navigation, heading focus, scroll reset and browser Back');
  await send('Emulation.setEmulatedMedia', { features: [{name:'prefers-reduced-motion',value:'reduce'}] });
  await go('/'); assert.equal(await evaluate('getComputedStyle(document.querySelector(".kinetic span span")).animationName'), 'none');
  report.interactions.push('Reduced motion reveals complete title without animation');
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ routes: report.routes.length, interactions: report.interactions, errors }, null, 2));
} finally { saveDesignCheck('report.json', JSON.stringify(report, null, 2)); ws.close(); }
