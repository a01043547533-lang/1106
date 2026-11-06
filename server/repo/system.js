// 환경 파일과 빌드 산출물도 repo 경계 안에서만 읽는다. config를 import하지 않는다.
import fs from 'node:fs';

export const fileExists = (file) => fs.existsSync(file);
export const readText = (file) => fs.readFileSync(file, 'utf8');

export function loadEnv(file) {
  if (!fileExists(file)) return;
  for (const line of readText(file).split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let value = m[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (process.env[m[1]] === undefined) process.env[m[1]] = value;
  }
}
