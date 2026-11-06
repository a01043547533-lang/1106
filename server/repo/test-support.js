// 운영 데이터와 분리된 테스트 전용 저장소. 테스트에서조차 파일 접근은 repo 안으로 모은다.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';

const base = path.resolve('.checks/ops-data');
export function createTestDirectory() {
  const dir = path.join(base, crypto.randomUUID()); fs.mkdirSync(dir, { recursive: true }); return dir;
}
function checked(file = '') {
  const root = path.resolve(process.env.DATA_DIR || '');
  const target = path.resolve(root, file);
  if (!root.startsWith(base + path.sep) || (target !== root && !target.startsWith(root + path.sep))) throw new Error('테스트 경로 밖 접근 금지');
  return target;
}
export function fixture(name, value) {
  const file = checked(name); fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value));
}
export const fixtureText = (name) => fs.readFileSync(checked(name), 'utf8');
export const unzipFixture = (name) => zlib.gunzipSync(fs.readFileSync(checked(name))).toString('utf8');
export function cleanupTestDirectory() { fs.rmSync(checked(), { recursive: true, force: true }); }
export function saveCheckArtifact(name, content) {
  const root = path.resolve('.checks'); const destination = path.resolve(root, name);
  if (!destination.startsWith(root + path.sep)) throw new Error('검증 산출물 경로 밖 접근 금지');
  fs.mkdirSync(path.dirname(destination), { recursive: true }); fs.writeFileSync(destination, content);
}
