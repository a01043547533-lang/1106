// SSR 메타와 본문이 함께 사용한다. 공개 데이터에 있는 값만 설명한다.
const n = (item) => item?._norm || item || {};
const unique = (items) => [...new Set(items.filter(Boolean))];
const finite = (value) => value != null && Number.isFinite(Number(value));
const variant = (code) => [...String(code)].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 4;

export function rateLine(data) {
  const s = data?.snapshot;
  if (!s || !finite(s.quota) || !finite(s.applicants)) return null;
  const round = s.roundLabel ? `${s.roundLabel}회차 기록에서 ` : '수집된 기록에서 ';
  const rate = finite(s.rate) ? `, 지원률은 ${Number(s.rate).toFixed(2)}:1` : '';
  return `${round}${data.mosName} 모집인원은 ${s.quota}명, 접수인원은 ${s.applicants}명${rate}이에요.${s.enlistMonth && s.enlistMonth !== '*' ? ` ${data.mosName}의 해당 회차 입영월은 ${s.enlistMonth}이에요.` : ''}`;
}

export function describeMos(data) {
  if (!data) return [];
  const m = n(data.mos);
  const name = data.mosName || data.mosCode;
  const where = [data.branch, data.category].filter(Boolean).join(' ');
  const code = data.mosCode ? ` (특기코드 ${data.mosCode})` : '';
  const introductions = [
    `${name}${code}의 공개 모집 정보예요.${where ? ` ${name}의 모집 구분은 ${where}입니다.` : ''}`,
    `${where ? `${where}에 속한 ` : ''}${name}${code}의 지원 기준과 접수 기록을 정리했어요.`,
    `${name}${code} 지원을 준비한다면${where ? ` ${where}의` : ''} 공개 기준을 확인해 보세요.`,
    `${where ? `${where} ` : ''}${name}${code}에 대해 수집한 조건과 회차별 현황이에요.`,
  ];
  const body = [introductions[variant(data.mosCode)]];
  const conditions = [m.height && `신장 ${m.height}`, m.weight && `체중 ${m.weight}`, m.vision,
    m.minGrade && `신체등급 ${m.minGrade}급 이내`].filter(Boolean);
  if (conditions.length) body.push(`${name}의 공개 신체 기준에는 ${conditions.join(', ')} 항목이 있어요.`);
  const eligibility = unique((data.eligibility || []).map((item) => n(item).item));
  const eligTotal = data.eligibilityTotal ?? eligibility.length;
  if (eligibility.length) body.push(`${name}에 연결된 자격·면허·전공은 ${eligTotal.toLocaleString()}종이며, ${eligibility.slice(0, 3).join(' · ')}${eligTotal > 3 ? ' 등이' : ' 항목이'} 포함돼요. ${name}의 필수 자격과 배점은 해당 회차 공고를 확인하세요.`);
  const documents = unique((data.documents || []).map((item) => n(item).docName));
  if (documents.length) body.push(`${name}의 구비서류 데이터에는 ${documents.slice(0, 3).join(' · ')}${documents.length > 3 ? ` 등 ${documents.length}종이` : ' 항목이'} 있어요.`);
  if (m.interview === 'Y' || m.interview === 'N') body.push(`${name}의 면접 실시 여부는 수집된 기준에서 '${m.interview === 'Y' ? '실시' : '미실시'}'로 표시돼요.`);
  if (m.yearRound === 'Y') body.push(`${name}의 모집 방식은 데이터에 연간모집으로 표시돼요.`);
  if (m.applyStart && m.applyEnd) body.push(`${name} 기준표의 접수기간은 ${m.applyStart}부터 ${m.applyEnd}까지예요.`);
  return [body.join(' '), rateLine(data), jobfitLine(data)].filter(Boolean);
}

// 취업맞춤특기병: 다가오는 입영일의 모집·선발·남은 자리 합계를 문장으로 쓴다.
export function jobfitLine(data) {
  const rows = (data?.jobfit || []).filter((r) => !r.past);
  if (!rows.length) return null;
  const sum = (k) => rows.reduce((t, r) => t + (Number(r[k]) || 0), 0);
  const first = rows[0].enlistDate, last = rows[rows.length - 1].enlistDate;
  const span = first === last ? `${first} 입영` : `${first}부터 ${last}까지 입영일 ${rows.length}개`;
  return `${data.mosName}은(는) 취업맞춤특기병 특기로, ${span}에 모집 ${sum('quota')}명 중 ${sum('selected')}명이 선발돼 남은 자리는 ${sum('vacancy')}명이에요.`;
}
