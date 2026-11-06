// 사용자 제공 병무청 CSV를 기존 복무기간 데이터 계약으로 변환한다. 파일 I/O는 repo에서만 수행.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeJson } from './files.js';

export function importServiceTerms(file) {
  const bytes = fs.readFileSync(file);
  let text;
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
  catch { text = new TextDecoder('euc-kr', { fatal: true }).decode(bytes); }
  const lines = text.replace(/^\uFEFF/, '').trim().split(/\r?\n/);
  const fields = (line) => line.split(',').map((v) => v.trim().replace(/^"(.*)"$/, '$1'));
  if (fields(lines.shift()).join(',') !== '데이터기준일,구분,복무기간') throw new Error('CSV 열을 확인하세요: 데이터기준일,구분,복무기간');
  const aliases = {
    육군: ['육군', '현역병'], 해군: ['해군', '현역병'], 해병: ['해병대', '현역병'], 공군: ['공군', '현역병'],
    상근예비역: ['상근예비역', ''], 사회복무요원: ['사회복무', '사회복무요원'],
    산업기능요원현역: ['산업기능요원', '현역 대상'], 산업기능요원보충역: ['산업기능요원', '보충역 대상'],
    '예술.체육요원': ['예술·체육요원', ''],
  };
  const seen = new Set();
  const items = lines.filter((line) => line.trim()).map((line) => {
    const row = fields(line);
    const [asOf, sourceCategory, duration] = row;
    if (row.length !== 3 || !/^\d{4}-\d{2}-\d{2}$/.test(asOf) || !sourceCategory || !/^\d+개월$/.test(duration)) throw new Error('CSV에 올바르지 않은 복무기간 행이 있어요');
    if (seen.has(sourceCategory)) throw new Error(`중복 복무유형: ${sourceCategory}`);
    seen.add(sourceCategory);
    const [branch, type] = aliases[sourceCategory] || [sourceCategory, ''];
    const months = Number(duration.replace('개월', ''));
    if (months <= 0) throw new Error('복무기간은 양수여야 해요');
    return { branch, type, months, asOf, sourceCategory, sourceFile: path.basename(file), source: '병무청 군별 복무유형별 복무기간 CSV', note: `출처: 병무청 군별 복무유형별 복무기간 · 데이터 기준일 ${asOf}` };
  });
  if (!items.length) throw new Error('CSV에 복무기간 데이터가 없어요');
  writeJson('service_terms.json', items);
  return items;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!process.argv[2]) throw new Error('사용법: npm run import:service-terms -- <CSV 경로>');
  const items = importServiceTerms(process.argv[2]);
  console.log(JSON.stringify({ imported: items.length, dates: [...new Set(items.map((x) => x.asOf))], items: items.map(({ branch, type, months }) => ({ branch, type, months })) }, null, 2));
}
