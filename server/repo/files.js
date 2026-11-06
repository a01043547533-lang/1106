// 파일 읽기와 CSV 변환 저장은 repo 안에서만 수행한다. 서버 요청에서는 읽기만 사용.
import fs from 'node:fs';
import path from 'node:path';
import { DATA_DIR } from '../config.js';
export const dataPath = (...parts) => path.join(DATA_DIR, ...parts);
export function readJson(name, fallback) {
  try { return JSON.parse(fs.readFileSync(dataPath(name), 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return fallback; throw error; }
}
export function readJsonl(name) {
  const file = dataPath(name);
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').split('\n').filter((line) => line.trim()).map((line) => JSON.parse(line));
}
export function writeJson(name, value) {
  const file = dataPath(name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2), { mode: 0o600 });
}