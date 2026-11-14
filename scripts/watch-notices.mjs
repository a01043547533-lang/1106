// 훈련소·규정 출처 페이지가 바뀌었는지 확인한다. 자동 반영은 하지 않는다.
//   npm run watch            바뀐 곳만 알려 줌
//   npm run watch -- --save  지금 상태를 기준으로 저장(검수 끝난 뒤)
// 1~2주에 한 번 돌리고, "바뀜"이 뜬 페이지만 열어 보고 centers.json을 고친 뒤 --save.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const STATE = join(root, "scripts", "notice-hashes.json");
const save = process.argv.includes("--save");

function sourcesFrom(path, pick) {
  const j = JSON.parse(readFileSync(join(root, path), "utf8"));
  return pick(j);
}

const urls = new Map();
const add = (label, url) => url && !urls.has(url) && urls.set(url, label);

sourcesFrom("src/data/centers.json", (j) => j.centers.flatMap((c) => c.sources.map((s) => [`${c.short}: ${s.label}`, s.url]))).forEach(([l, u]) => add(l, u));
sourcesFrom("src/data/todo.json", (j) => j.sources.map((s) => [`할 일: ${s.label}`, s.url])).forEach(([l, u]) => add(l, u));
for (const f of ["src/rules/2026.json", "src/rules/2027.json"]) {
  if (existsSync(join(root, f))) sourcesFrom(f, (j) => j.sources.map((s) => [`규정: ${s.label}`, s.url])).forEach(([l, u]) => add(l, u));
}

const prev = existsSync(STATE) ? JSON.parse(readFileSync(STATE, "utf8")) : {};
const next = {};
const changed = [];
const failed = [];

function textOf(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    // 날짜·시각·조회수처럼 매번 바뀌는 숫자 줄은 덜 민감하게
    .replace(/\d{1,2}:\d{2}(:\d{2})?/g, "")
    .replace(/조회\s*수?\s*[:：]?\s*\d+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

for (const [url, label] of urls) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (notice-watch)" },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const hash = createHash("sha256").update(textOf(await res.text())).digest("hex").slice(0, 16);
    next[url] = { label, hash, checked: new Date().toISOString().slice(0, 10) };
    if (prev[url] && prev[url].hash !== hash) changed.push([label, url]);
    if (!prev[url]) console.log(`처음 봄  ${label}`);
  } catch (e) {
    failed.push([label, url, String(e.message ?? e)]);
    if (prev[url]) next[url] = prev[url];
  }
}

console.log(`\n확인 ${urls.size}곳 · 바뀜 ${changed.length} · 실패 ${failed.length}`);
for (const [l, u] of changed) console.log(`바뀜  ${l}\n      ${u}`);
for (const [l, u, e] of failed) console.log(`실패  ${l} (${e})\n      ${u}`);

if (save || Object.keys(prev).length === 0) {
  writeFileSync(STATE, JSON.stringify(next, null, 2) + "\n");
  console.log(`\n기준 저장: ${STATE}`);
} else if (changed.length) {
  console.log("\n바뀐 페이지를 열어 확인하고 데이터를 고친 다음 `npm run watch -- --save`로 기준을 갱신하세요.");
  process.exitCode = 1;
}
