// Focused follow-up: real internal links, narrow layouts, and isolated loading/error UI.
import assert from 'node:assert/strict';
import { saveDesignCheck } from '../server/repo/design-check.js';
const tabs = await (await fetch('http://localhost:9333/json')).json();
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r, { once: true }));
const calls = new Map(); let id = 0; let paused; const errors = [];
ws.addEventListener('message', e => {
  const m = JSON.parse(e.data);
  if (m.id) { const p = calls.get(m.id); calls.delete(m.id); m.error ? p.reject(m.error) : p.resolve(m.result); }
  if (m.method === 'Fetch.requestPaused') paused = m.params.requestId;
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.text);
});
const send = (method, params = {}) => new Promise((resolve, reject) => { const key = ++id; calls.set(key, {resolve, reject}); ws.send(JSON.stringify({id:key,method,params})); });
const evalJs = async expression => { const r = await send('Runtime.evaluate', {expression,returnByValue:true,awaitPromise:true}); if(r.exceptionDetails) throw new Error(r.exceptionDetails.text); return r.result.value; };
const sleep = ms => new Promise(r=>setTimeout(r,ms));
const until = async expr => { for(let i=0;i<160;i++){if(await evalJs(expr)) return;await sleep(250);}throw new Error('Timeout: '+expr); };
const links = ['/now','/find','/calendar','/score','/alerts','/prepare','/mos','/plan','/social','/privacy','/terms','/ads','/status','/'];
const results = [];
try {
  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setEmulatedMedia',{features:[]});
  await send('Page.navigate',{url:'http://localhost:3100/'}); await until('!!document.querySelector(".topcard")');
  for(const width of [320,390,820,1440]) {
    await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<650}); await sleep(200);
    assert.equal(await evalJs('document.documentElement.scrollWidth>innerWidth'),false,'Home width '+width);
    if(width===390) {const shot=await send('Page.captureScreenshot',{format:'png'});saveDesignCheck('home-mobile-final.png',Buffer.from(shot.data,'base64'));}
  }
  for(const route of links) {
    const selector = `a[href="${route}"]`;
    assert(await evalJs(`!!document.querySelector(${JSON.stringify(selector)})`),'Link exists '+route);
    await evalJs(`document.querySelector(${JSON.stringify(selector)}).click()`);
    await until(`location.pathname===${JSON.stringify(route)} && !!document.querySelector('h1')`);
    assert(await evalJs("document.title.includes('입대타이밍')"));
    results.push('Internal link '+route);
  }
  await send('Fetch.enable',{patterns:[{urlPattern:'*/api/mos',requestStage:'Request'}]});
  await evalJs(`document.querySelector('a[href="/mos"]').click()`);
  await until('!!document.querySelector(".feedback.loading")');
  assert(paused, 'API request intercepted only in test browser');
  results.push('Loading feedback');
  await send('Fetch.fulfillRequest',{requestId:paused,responseCode:503,responseHeaders:[{name:'Content-Type',value:'application/json'}],body:Buffer.from('{"error":"test"}').toString('base64')});
  await until('!!document.querySelector(".feedback.error[role=alert]")');
  results.push('Mocked API error feedback');
  await send('Fetch.disable');
  await evalJs(`document.querySelector('a[href="/find"]').click()`);
  await until('!!document.querySelector("form")');
  await send('Emulation.setDeviceMetricsOverride',{width:320,height:900,deviceScaleFactor:1,mobile:true});
  assert.equal(await evalJs('document.documentElement.scrollWidth>innerWidth'),false,'Find 320px');
  await evalJs(`document.querySelector('a[href="/now"]').click()`);
  await until('!!document.querySelector("table")');
  assert.equal(await evalJs('document.documentElement.scrollWidth>innerWidth'),false,'Now 320px');
  assert(await evalJs('document.querySelector(".table-wrap").scrollWidth>document.querySelector(".table-wrap").clientWidth'));
  results.push('Narrow table scroll stays inside table');
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({results,errors},null,2));
} finally { saveDesignCheck('states.json',JSON.stringify({results,errors},null,2)); ws.close(); }
