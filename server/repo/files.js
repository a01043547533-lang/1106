// 파일 읽고쓰기는 이 폴더(server/repo)에서만 한다.
// 나중에 SQLite나 Postgres로 옮길 때 repo 폴더만 고치면 된다.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import { Transform } from 'node:stream';
import { DATA_DIR } from '../config.js';

export const dataPath = (...p) => path.join(DATA_DIR, ...p);

export function readJson(name, fallback) {
  const file = dataPath(name);
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return fallback;
    throw error; // 손상된 구독/데이터 파일을 빈 값으로 덮어쓰지 않는다.
  }
}

// 임시 파일에 쓰고 이름을 바꿔서, 쓰는 도중 죽어도 파일이 깨지지 않게 한다.
export function writeJson(name, value) {
  const file = dataPath(name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${crypto.randomUUID()}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2), { mode: 0o600 });
  fs.renameSync(tmp, file);
}

export function readJsonl(name, { strict = false } = {}) {
  const file = dataPath(name);
  if (!fs.existsSync(file)) return [];
  const out = [];
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try { out.push(JSON.parse(line)); } catch (error) { if (strict) throw error; }
  }
  return out;
}

// 추가만 한다. 절대 덮어쓰지 않는다.
export function appendJsonl(name, rows) {
  const list = Array.isArray(rows) ? rows : [rows];
  if (!list.length) return;
  const file = dataPath(name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const fd = fs.openSync(file, 'a', 0o600);
  try { fs.writeSync(fd, list.map((r) => JSON.stringify(r)).join('\n') + '\n'); fs.fsyncSync(fd); }
  finally { fs.closeSync(fd); }
}

// 원본 XML을 _raw/YYYY-MM/ 아래 gzip으로 보관한다.
export function saveRaw(apiKey, page, xml) {
  const now = new Date();
  const month = now.toISOString().slice(0, 7);
  const stamp = now.toISOString().replace(/[:.]/g, '-');
  const dir = dataPath('_raw', month);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${apiKey}-${stamp}-p${page}.xml.gz`), zlib.gzipSync(xml));
}

export function fileMtime(name) {
  try { return fs.statSync(dataPath(name)).mtime.toISOString(); } catch { return null; }
}

export function retainJsonl(name, keep) {
  const rows = readJsonl(name, { strict: true });
  const next = rows.filter(keep);
  if (next.length === rows.length) return;
  const file = dataPath(name);
  const temporary = `${file}.${crypto.randomUUID()}.tmp`;
  fs.writeFileSync(temporary, next.map((row) => JSON.stringify(row)).join('\n') + (next.length ? '\n' : ''), { mode: 0o600 });
  fs.renameSync(temporary, file);
}

// 단일 영속 볼륨에서 API/작업 프로세스 간 중복 실행을 막는다.
// 비정상 종료로 남은 잠금은 PID가 없음을 확인한 뒤 운영자가 제거한다.
export function acquireLock(name) {
  const file = dataPath(`${name}.lock`);
  fs.mkdirSync(DATA_DIR, { recursive: true });
  let fd;
  try { fd = fs.openSync(file, 'wx', 0o600); }
  catch (error) { if (error.code === 'EEXIST') throw new Error(`${name} 작업이 실행 중이거나 잠금 점검이 필요합니다`); throw error; }
  fs.writeSync(fd, JSON.stringify({ pid: process.pid, at: new Date().toISOString() }));
  return () => { fs.closeSync(fd); fs.unlinkSync(file); };
}

export function updateSubscriptions(update) {
  const release = acquireLock('subscriptions');
  try {
    const subscriptions = readJson('subscriptions.json', []);
    const result = update(subscriptions);
    writeJson('subscriptions.json', subscriptions);
    return result;
  } finally { release(); }
}

// 주별 스냅샷 원본을 보존한다. 수집기가 추가 쓰는 동안에도 시작 시점의 바이트까지만 읽는다.
export async function backupSnapshots(now = new Date()) {
  const release = acquireLock('backup');
  let temporary;
  try {
    const day = new Date(now.getTime() + 9 * 3600000);
    day.setUTCDate(day.getUTCDate() - (day.getUTCDay() + 6) % 7);
    const week = day.toISOString().slice(0, 10);
    const relative = `_backup/snapshots-${week}.jsonl.gz`;
    const destination = dataPath(relative);
    if (fs.existsSync(destination)) return { skipped: true, file: relative, reason: '이번 주 백업이 이미 있습니다' };
    const source = dataPath('snapshots.jsonl');
    const size = fs.statSync(source).size;
    if (!size) throw new Error('snapshots.jsonl이 비어 있어 백업하지 않았습니다');
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    temporary = `${destination}.${crypto.randomUUID()}.tmp`;
    const hash = crypto.createHash('sha256');
    await pipeline(fs.createReadStream(source, { start: 0, end: size - 1 }), new Transform({
      transform(chunk, encoding, callback) { hash.update(chunk); callback(null, chunk); },
    }), zlib.createGzip(), fs.createWriteStream(temporary, { flags: 'wx', mode: 0o600 }));
    const sha256 = hash.digest('hex');
    const check = crypto.createHash('sha256');
    await pipeline(fs.createReadStream(temporary), zlib.createGunzip(), check);
    if (check.digest('hex') !== sha256) throw new Error('백업 압축 해제 검증 실패');
    fs.renameSync(temporary, destination); temporary = null;
    const result = { file: relative, bytes: size, sha256, createdAt: now.toISOString() };
    writeJson(`${relative}.manifest.json`, result);
    return result;
  } finally { if (temporary && fs.existsSync(temporary)) fs.unlinkSync(temporary); release(); }
}
