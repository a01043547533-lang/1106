import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import React from 'react';
import { create, act } from 'react-test-renderer';
import { MemoryRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { build } from 'esbuild';
import { dday, nextExamWindow } from '../shared/dates.js';
const result = await build({ stdin: { contents: "export {useApi} from './client/src/lib/use-api.js'; export {useRouteData} from './client/src/data.jsx'; export {invalidate} from './client/src/lib/fetch-cache.js'; export {default as Calc} from './client/src/pages/Calc.jsx'; export {default as Plan} from './client/src/pages/Plan.jsx'; export {ExamYearTable} from './client/src/exam-timeline.jsx'; export {MosDetail} from './client/src/pages/Mos.jsx';", resolveDir: process.cwd() }, bundle: true, write: false, format: 'cjs', platform: 'node', packages: 'external', jsx: 'automatic', logLevel: 'silent' });
const module = { exports: {} };
new Function('require', 'module', 'exports', result.outputFiles[0].text)(createRequire(import.meta.url), module, module.exports);
const { useApi, useRouteData, invalidate, Calc, Plan, ExamYearTable, MosDetail } = module.exports;
const h = React.createElement;
const nativeFetch = globalThis.fetch;
const originalWindow = globalThis.window, originalDocument = globalThis.document;
globalThis.window = new EventTarget();
globalThis.document = Object.assign(new EventTarget(), { hidden: false });
const reply = (data) => ({ ok: true, json: async () => data });
const tick = () => new Promise((resolve) => setImmediate(resolve));
async function flush(action = () => {}) { await act(async () => { action(); for (let i = 0; i < 12; i++) await tick(); }); }
let view;
const mount = async (component, route = '/') => flush(() => { view = create(h(MemoryRouter, { initialEntries: [route] }, component)); });
const text = () => JSON.stringify(view.toJSON());
test.afterEach(async () => { await flush(() => view?.unmount()); view = null; invalidate(() => true); document.hidden = false; });
test.after(() => { globalThis.fetch = nativeFetch; globalThis.window = originalWindow; globalThis.document = originalDocument; });

test('한국 날짜 자정과 시험 접수 종료일·빈자리 접수 경계', () => {
  assert.equal(dday('2026-11-10', Date.parse('2026-11-09T15:00:00Z')), 'D-day');
  assert.equal(dday('2026-11-10', Date.parse('2026-11-09T14:59:59Z')), 'D-1');
  const round = { writtenApply: '2026-08-24~2026-08-27', writtenApplyExtra: ['2026-09-10~2026-09-11'] };
  assert.equal(nextExamWindow(round, '2026-08-25'), round.writtenApply);
  assert.equal(nextExamWindow(round, '2026-09-11'), round.writtenApplyExtra[0]);
  assert.equal(nextExamWindow(round, '2026-09-12'), null);
});

test('주소 변경·늦은 응답·503에서 이전 API 데이터가 남지 않는다', async () => {
  let state; const renders = []; let pending;
  globalThis.fetch = async (url) => url === '/a' ? reply({ id: 'a' }) : url === '/b' ? new Promise((resolve) => { pending = resolve; }) : { ok: false, status: 503 };
  function Probe({ url }) { state = useApi(url); renders.push({ url, data: state.data }); return null; }
  await mount(h(Probe, { url: '/a' })); assert.equal(state.data.id, 'a');
  await flush(() => view.update(h(MemoryRouter, null, h(Probe, { url: '/b' }))));
  assert.equal(state.data, null); assert.equal(state.loading, true);
  assert(renders.filter((r) => r.url === '/b').every((r) => r.data === null));
  await flush(() => view.update(h(MemoryRouter, null, h(Probe, { url: '/c' }))));
  assert.equal(state.data, null); assert.equal(state.error.message, '503');
  await flush(() => pending(reply({ id: 'late-b' })));
  assert.equal(state.data, null); assert.equal(state.error.message, '503');
});

test('숨겨진 탭의 최초 조회와 실시간 전환 시 경로 데이터 갱신', async () => {
  document.hidden = true; let value = 'saved', state;
  globalThis.fetch = async () => reply({ items: [value] });
  function Probe() { state = useRouteData('calendar', '/api/calendar', (r) => r.items); return null; }
  await mount(h(Probe)); assert.deepEqual(state.value, ['saved']);
  value = 'live'; await flush(() => invalidate(() => true)); assert.deepEqual(state.value, ['live']);
  value = 'resumed'; document.hidden = false;
  await flush(() => { invalidate(() => true); document.dispatchEvent(new Event('visibilitychange')); });
  assert.deepEqual(state.value, ['resumed']);
});

const license = '리눅스마스터(1,2급)';
const mos = { mosCode: '132.102', branch: '육군', mosName: '검증 특기', category: '기술행정병' };
function calcFetch({ failMatch = false } = {}) {
  globalThis.fetch = async (url) => {
    const u = new URL(url, 'http://test');
    if (u.pathname.endsWith('/match')) {
      assert.deepEqual(u.searchParams.getAll('item'), [license]);
      return failMatch ? { ok: false, status: 503 } : reply({ items: [{ item: license, kind: '자격', level: '기사', relation: '직접' }] });
    }
    if (u.pathname === '/api/mos') return reply({ items: [mos] });
    if (u.pathname === '/api/score-rules') return reply({ items: [{ kindName: '자격증', detailName: '기사', directScore: 50, indirectScore: 30 }] });
    if (u.pathname === '/api/eligible-items') return reply({ meta: [{ item: license }], kinds: ['자격'] });
    return reply({});
  };
}
const checkbox = () => view.root.findByProps({ type: 'checkbox' });
const score = () => view.root.findByProps({ className: 'calc-total-head' }).findByType('b').children[0];
test('계산기 자동 점수는 자격 해제·조회 실패에 지워지고 수동 점수는 유지된다', async () => {
  calcFetch(); await mount(h(Calc), '/calc?mos=132.102');
  await flush(() => checkbox().props.onChange()); assert.equal(score(), '50');
  await flush(() => checkbox().props.onChange()); assert.equal(score(), '0');
  calcFetch({ failMatch: true }); await flush(() => invalidate((url) => url.includes('/match')));
  await flush(() => checkbox().props.onChange()); assert.equal(score(), '0'); assert(text().includes('자격 대조에 실패'));
  await flush(() => view.root.findByType('select').props.onChange({ target: { value: '0' } })); assert.equal(score(), '50');
  await flush(() => checkbox().props.onChange()); assert.equal(score(), '50');
});

test('플래너 희망 월 해제·과거 월에서 결과가 초기화되고 수동 모드는 유지된다', async () => {
  globalThis.fetch = async (url) => reply(url === '/api/service-terms' ? { items: [{ branch: '육군', type: '현역', months: 18 }] } : { items: [], months: {} });
  await mount(h(Plan));
  const goalInputs = () => view.root.findByProps({ className: 'card goal-box' }).findAllByType('select');
  const chips = () => view.root.findByProps({ className: 'chips month-chips' }).findAllByType('button');
  const selected = () => chips().filter((b) => b.props['aria-pressed']);
  const now = new Date(); const target = new Date(now.getFullYear(), now.getMonth() + 24, 1);
  await flush(() => goalInputs()[0].props.onChange({ target: { value: String(target.getFullYear()) } }));
  await flush(() => goalInputs()[1].props.onChange({ target: { value: String(target.getMonth() + 1).padStart(2, '0') } }));
  assert.equal(selected().length, 3);
  await flush(() => goalInputs()[0].props.onChange({ target: { value: '' } })); assert.equal(selected().length, 0);
  await flush(() => goalInputs()[0].props.onChange({ target: { value: String(now.getFullYear()) } })); assert.equal(selected().length, 0);
  await flush(() => view.root.findByProps({ className: 'tabs mode-tabs' }).findAllByType('button')[1].props.onClick());
  await flush(() => chips()[0].props.onClick()); assert.equal(selected().length, 1);
});

test('시험 표는 진행 중인 빈자리 접수 기간을 안내한다', async () => {
  const day = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
  globalThis.fetch = async () => reply({ year: Number(day.slice(0, 4)), rounds: [{ name: '빈자리 검증', writtenApply: '2020-01-01~2020-01-02', writtenApplyExtra: [day + '~' + day], finalResult: '2099-01-01' }] });
  await mount(h(ExamYearTable)); assert(text().includes('필기 접수 중')); assert(!text().includes('원서접수는 모두 끝났어요'));
});

test('단일 군 상세에서 공용 코드로 이동해도 새 군 쿼리를 지우지 않는다', async () => {
  let navigate, location, resolveDetail;
  const detail = (code, branch, branches) => ({ mosCode: code, mosName: code, branch, branches, mos: {}, finalRates: [], eligibility: [], documents: [], links: [] });
  globalThis.fetch = async (url) => url.startsWith('/api/mos/161.103') ? reply(detail('161.103', '육군', ['육군'])) : new Promise((resolve) => { resolveDetail = resolve; });
  function RouterProbe() { navigate = useNavigate(); location = useLocation(); return h(Routes, null, h(Route, { path: '/mos/:code', element: h(MosDetail) })); }
  await mount(h(RouterProbe), '/mos/161.103');
  await flush(() => navigate('/mos/46?branch=' + encodeURIComponent('해군')));
  assert.equal(new URLSearchParams(location.search).get('branch'), '해군');
  assert(!text().includes('161.103'));
  await flush(() => resolveDetail(reply(detail('46', '해군', ['공군', '해군']))));
  assert.equal(new URLSearchParams(location.search).get('branch'), '해군');
  assert(text().includes('46 경쟁률'));
});
