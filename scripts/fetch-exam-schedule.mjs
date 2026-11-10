// 국가기술자격 시험일정 API로 server/data/exam_schedule.json(대비용 저장본)을 다시 만든다.
// 키가 없거나 실패하면 기존 파일을 그대로 두고 0으로 끝난다(빌드를 막지 않는다).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const url = (p) => 'file:///' + path.join(ROOT, p).split(path.sep).join('/');
const { refreshExams } = await import(url('server/exam-api.js'));
const { runtime } = await import(url('server/repo/prepared.js'));
await refreshExams();
if (!runtime.exams) { console.warn('[exam] API 조회 실패 또는 키 없음 · 저장본을 그대로 둡니다:', runtime.logs.at(-1)?.reason || ''); process.exit(0); }
const out = { year: runtime.exams.year, source: `한국산업인력공단 국가기술자격 시험정보 API(공공데이터포털 15003029) · ${runtime.exams.fetchedAt.slice(0, 10)} 저장`, sourceUrl: 'https://www.data.go.kr/data/15003029/openapi.do',
  note: '서버가 API를 부르지 못할 때 쓰는 저장본이에요. 빌드할 때마다 API로 다시 만들어요.', rounds: runtime.exams.rounds };
fs.writeFileSync(path.join(ROOT, 'server/data/exam_schedule.json'), JSON.stringify(out, null, 2) + '\n');
console.log(`[exam] ${out.rounds.length}개 회차 저장 → server/data/exam_schedule.json`);
