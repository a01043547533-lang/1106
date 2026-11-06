import { randomInt } from 'node:crypto';
import { mosIndex, mosDetail } from '../server/queries.js';
import { describeMos } from '../client/src/lib/describe.js';

const pool = mosIndex();
const examples = [];
while (pool.length && examples.length < 10) {
  const [item] = pool.splice(randomInt(pool.length), 1);
  const detail = mosDetail(item.mosCode);
  examples.push({ code: item.mosCode, name: item.mosName, paragraphs: describeMos(detail),
    evidence: { criteria: detail.mos?._norm || detail.mos, snapshot: detail.snapshot,
      documentCount: detail.documents.length, eligibilityCount: detail.eligibility.length } });
}
const sentences = new Map();
for (const example of examples) for (const sentence of example.paragraphs.join(' ').split(/(?<=[.!?])\s+/)) {
  const codes = sentences.get(sentence) || new Set(); codes.add(example.code); sentences.set(sentence, codes);
}
const repeated = [...sentences].filter(([, codes]) => codes.size > 1).map(([sentence, codes]) => ({ sentence, codes: [...codes] }));
console.log(JSON.stringify({ checkedAt: new Date().toISOString(), sampled: examples.length,
  uniqueDescriptions: new Set(examples.map((e) => e.paragraphs.join(' '))).size, repeatedSentences: repeated, examples }, null, 2));
if (examples.length < 10 || new Set(examples.map((e) => e.paragraphs.join(' '))).size < examples.length) process.exitCode = 1;
