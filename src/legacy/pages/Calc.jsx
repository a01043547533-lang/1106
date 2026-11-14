'use client';
import { PageHeading } from '../design.jsx';
// 예상 배점 계산기 — 병무청 선발배점기준(공개 데이터)으로 항목별 점수를 고르고 합계를 본다.
// 보유 자격을 고르면 이 특기에서 인정되는 등급·관련 구분을 찾아 자동으로 맞춰 준다. 입력은 저장하지 않는다.
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from '@/legacy/router.jsx';
import { BranchBadge, MultiPicker, RateBar, n, useApi, mosHref } from '../components.jsx';
import { MosSearch } from '../mos-search.jsx';
import { itemParams } from '../lib/item-params.js';
import { ExamTimeline } from '../exam-timeline.jsx';

const num = (v) => (v === null || v === undefined || v === '' || Number.isNaN(Number(v)) ? null : Number(v));
const SKIP_GENERAL = ['유급지원병전공점수'];
const SKIP_SPECIAL = ['고교출석률'];

// 배점표를 '구분(kind) → 선택지 목록'으로 바꾼다.
function buildKinds(rows, special) {
  const map = new Map();
  rows.forEach((raw, i) => {
    const r = n(raw);
    const kind = r.kindName || '기타';
    if ((special ? SKIP_SPECIAL : SKIP_GENERAL).includes(kind)) return;
    const option = special
      ? { id: i, label: [r.itemName, r.relName && r.relName !== r.itemName ? r.relName : null].filter(Boolean).join(' · '), direct: num(r.maxValue) ?? num(r.minValue), indirect: null, detail: r.itemName }
      : { id: i, label: [r.gradeName, r.detailName].filter(Boolean).join(' · '), direct: num(r.directScore), indirect: num(r.indirectScore), detail: r.detailName, grade: r.gradeName };
    if (option.direct === null && option.indirect === null) return;
    if (!map.has(kind)) map.set(kind, { kind, options: [], max: 0 });
    const k = map.get(kind);
    k.options.push(option);
    k.max = Math.max(k.max, option.direct ?? 0, option.indirect ?? 0);
  });
  for (const k of map.values()) k.options.sort((a, b) => (b.direct ?? b.indirect ?? 0) - (a.direct ?? a.indirect ?? 0));
  return [...map.values()];
}

// 보유 자격의 인정 등급(level)·관련 구분(relation)으로 선택지를 자동 지정한다.
function autoPick(kinds, matched) {
  const pick = {};
  for (const k of kinds) {
    let best = null;
    for (const m of matched) {
      if (!m.level) continue;
      const isLicenseKind = /운전|면허/.test(k.kind) && m.kind === '면허' && /보통|대형|특수/.test(m.level);
      const isCertKind = /자격/.test(k.kind) && (m.kind === '자격' || (m.kind === '면허' && /일반면허/.test(m.level)));
      if (!isLicenseKind && !isCertKind) continue;
      const opt = k.options.find((o) => o.detail === m.level || (o.detail && m.level.startsWith(o.detail)));
      if (!opt) continue;
      const relation = m.relation === '간접' ? '간접' : '직접';
      const score = relation === '간접' ? opt.indirect ?? opt.direct : opt.direct;
      if (score !== null && (!best || score > best.score)) best = { id: opt.id, relation, score, via: m.item };
    }
    if (best) pick[k.kind] = { id: best.id, relation: best.relation, via: best.via };
    else if (/전공/.test(k.kind)) { const m = matched.find((x) => x.kind === '전공'); if (m) pick[k.kind] = { id: null, relation: m.relation === '간접' ? '간접' : '직접', via: m.item }; }
  }
  return pick;
}

export default function Calc() {
  const [params, setParams] = useSearchParams();
  const code = params.get('mos') || '';
  const branchParam = params.get('branch') || '';
  const idx = useApi('/api/mos');
  const mos = useMemo(() => (idx.data?.items || []).find((m) => m.mosCode === code && (!branchParam || m.branch === branchParam)) || null, [idx.data, code, branchParam]);
  const detail = useApi(mos ? `/api/mos/${encodeURIComponent(code)}?branch=${encodeURIComponent(mos.branch)}` : null);
  const rulesUrl = mos ? `/api/score-rules?${new URLSearchParams({ branch: mos.branch || '', mosCode: mos.mosCode, category: mos.category || '' })}` : null;
  const rules = useApi(rulesUrl);
  const special = Boolean(mos?.category && /전문특기/.test(mos.category));
  const kinds = useMemo(() => buildKinds(rules.data?.items || [], special), [rules.data, special]);
  const [items, setItems] = useState([]);
  const [sel, setSel] = useState({});
  // 상세는 자격 일부만 보내므로, 보유 자격 대조는 서버에서 이 특기(군 기준)의 전체 목록으로 한다
  const match = useApi(mos && items.length ? `/api/mos/${encodeURIComponent(code)}/match?${itemParams(items, { branch: mos.branch })}` : null);
  const matched = useMemo(() => (items.length ? (match.data?.items || []).map(n) : []), [match.data, items]);

  useEffect(() => { setSel({}); }, [code, branchParam]);
  useEffect(() => { setSel((s) => ({ ...autoPick(kinds, matched), ...Object.fromEntries(Object.entries(s).filter(([, v]) => v.manual)) })); }, [kinds, matched]);

  const choose = (kind, patch) => setSel((s) => ({ ...s, [kind]: { ...(s[kind] || { id: null, relation: '직접' }), ...patch, manual: true } }));
  const scoreOf = (k) => {
    const c = sel[k.kind]; if (!c || c.id === null || c.id === undefined) return { score: 0, missing: false };
    const o = k.options.find((x) => x.id === c.id); if (!o) return { score: 0, missing: false };
    const v = c.relation === '간접' ? o.indirect : o.direct;
    return { score: v ?? 0, missing: v === null };
  };
  const total = kinds.reduce((sum, k) => sum + scoreOf(k).score, 0);
  const max = kinds.reduce((sum, k) => sum + k.max, 0);
  const snapshot = detail.data?.snapshot;
  const skipped = (rules.data?.items || []).map(n).filter((r) => (special ? SKIP_SPECIAL : SKIP_GENERAL).includes(r.kindName)).length;

  return (
    <>
      <PageHeading title="예상 배점 계산기" description="특기를 고르고 자격·전공·면허 항목을 선택하면 병무청 선발배점기준으로 예상 합계를 계산해요. 보유 자격을 고르면 인정 등급을 자동으로 맞춰 줘요." />
      <ol className="score-guide" aria-label="계산 순서">
        <li aria-current={!mos ? 'step' : undefined}><b>01</b><span>특기 선택</span></li>
        <li aria-current={mos && !items.length ? 'step' : undefined}><b>02</b><span>보유 자격 선택 (선택)</span></li>
        <li aria-current={mos && items.length ? 'step' : undefined}><b>03</b><span>항목 확인 · 합계</span></li>
      </ol>
      <section className="card">
        <h2>1. 어느 특기의 배점을 볼까요</h2>
        {mos ? <p className="calc-picked"><BranchBadge branch={mos.branch} /> <b>{mos.mosName}</b> <span className="muted small">{[mos.category, mos.mosCode].filter(Boolean).join(' · ')}</span> <button type="button" className="link" onClick={() => setParams({})}>다른 특기 고르기</button> · <Link to={mosHref(mos.mosCode, mos.shared ? mos.branch : null)}>특기 상세</Link></p>
          : <MosSearch onPick={(m) => setParams({ mos: m.mosCode, ...(m.shared ? { branch: m.branch } : {}) })} />}
        {code && idx.data && !mos && <p className="muted" role="alert">특기 코드 {code}를 찾을 수 없어요. 다시 검색해 주세요.</p>}
      </section>
      {mos && <section className="card">
        <h2>2. 가지고 있는 자격·면허·전공을 고르세요 <span className="muted small">(선택)</span></h2>
        <p className="muted small">이 특기의 지원 자격 목록과 대조해서 인정 등급(기사급·산업기사급 등)과 관련 구분(직접·간접)을 자동으로 맞춰요. 입력은 저장하지 않아요.</p>
        <MultiPicker value={items} onChange={setItems} />
        {match.loading && <p role="status">보유 자격을 대조하고 있어요…</p>}
        {match.error && <p role="alert">자격 대조에 실패했어요. 자동 점수는 제외했으니 잠시 후 다시 선택해 주세요.</p>}
        {items.length > 0 && match.data && (matched.length
          ? <p className="small">이 특기에서 인정되는 항목: {matched.map((m) => `${m.item}(${[m.level, m.relation].filter(Boolean).join(' · ')})`).join(', ')}</p>
          : <p className="small warn">선택한 자격은 이 특기의 지원 자격 목록에 없어요. 아래에서 직접 등급을 고르거나 다른 특기를 확인해 보세요.</p>)}
      </section>}
      {mos && <section className="card">
        <h2>3. 항목별 배점</h2>
        {rules.loading && <p className="muted" role="status">배점표를 불러오는 중이에요…</p>}
        {rules.error && <p role="alert">배점표를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</p>}
        {rules.data?.lottery && <p className="warn">{rules.data.note} 이 모집분야는 점수가 아니라 추첨으로 뽑기 때문에 배점 계산이 필요 없어요. 지원 자격 충족 여부만 확인하세요.</p>}
        {rules.data && !rules.data.lottery && !kinds.length && <p className="muted">이 특기의 배점 정보가 공개 데이터에 없어요. 병무청 모집공고 원문을 확인하세요.</p>}
        {rules.data?.lotteryFrom && <p className="warn">{rules.data.lotteryFrom}부터는 점수 대신 추첨이에요. {rules.data.note}</p>}
        {kinds.length > 0 && <>
          <p className="muted small">기준 회차 {rules.data.appliedRound || '-'} · 자료 조회 {rules.data.fetchedAt?.slice(0, 10) || '-'}{skipped ? ` · 폐지되었거나 해당자만 적용되는 항목 ${skipped}개는 제외` : ''}</p>
          <div className="calc-kinds">
            {kinds.map((k) => {
              const c = sel[k.kind] || {};
              const { score, missing } = scoreOf(k);
              const hasIndirect = !special && k.options.some((o) => o.indirect !== null);
              return <fieldset key={k.kind} className="calc-kind">
                <legend>{k.kind} <span className="muted small">최대 {k.max}점</span></legend>
                <label className="calc-select">해당 항목
                  <select value={c.id ?? ''} onChange={(e) => choose(k.kind, { id: e.target.value === '' ? null : Number(e.target.value) })}>
                    <option value="">해당 없음 (0점)</option>
                    {k.options.map((o) => <option key={o.id} value={o.id}>{o.label} — {o.direct ?? '-'}점{o.indirect !== null ? ` / 간접 ${o.indirect}점` : ''}</option>)}
                  </select>
                </label>
                {hasIndirect && <div className="calc-relation" role="group" aria-label={`${k.kind} 관련 구분`}>
                  {['직접', '간접'].map((r) => <button type="button" key={r} aria-pressed={(c.relation || '직접') === r} className={(c.relation || '직접') === r ? 'on' : ''} onClick={() => choose(k.kind, { relation: r })}>{r} 관련</button>)}
                </div>}
                <p className="calc-kind-score"><b>{score}</b>점{missing && <span className="muted small"> · 이 구분의 점수가 자료에 없어요. 공고 확인</span>}{c.via && !c.manual && <span className="muted small"> · {c.via} 기준 자동 선택</span>}</p>
              </fieldset>;
            })}
          </div>
          <div className="calc-total" aria-live="polite">
            <div className="calc-total-head"><span>예상 합계</span><b>{total}<small> / {max}점</small></b></div>
            <div className="calc-bar" aria-hidden="true"><span style={{ width: `${max ? Math.min(100, (total / max) * 100) : 0}%` }} /></div>
            <ul className="calc-hints">
              {kinds.filter((k) => scoreOf(k).score < k.max).map((k) => <li key={k.kind}>{k.kind}에서 최대 <b>{k.max - scoreOf(k).score}점</b> 더 받을 수 있어요{k.options[0] ? ` (예: ${k.options[0].label})` : ''}.</li>)}
              {kinds.every((k) => scoreOf(k).score >= k.max) && <li>선택한 항목이 모두 최대 배점이에요.</li>}
            </ul>
            <ExamTimeline deadline={snapshot?.applyEnd || null} />
            <details className="calc-table-wrap">
              <summary>이 특기의 배점표 전체 보기 ({kinds.reduce((n, k) => n + k.options.length, 0)}개 항목)</summary>
              <div className="table-wrap"><table className="grid">
                <thead><tr><th>구분</th><th>항목</th><th className="num">{special ? '배점' : '직접 관련'}</th>{!special && <th className="num">간접 관련</th>}</tr></thead>
                <tbody>{kinds.flatMap((k) => k.options.map((o) => <tr key={k.kind + o.id} className={sel[k.kind]?.id === o.id ? 'best' : ''}><td>{k.kind}</td><td>{o.label}</td><td className="num">{o.direct ?? '-'}</td>{!special && <td className="num">{o.indirect ?? '-'}</td>}</tr>))}</tbody>
              </table></div>
              <p className="muted small">노란 줄이 위에서 고른 항목이에요. 출결·면접 점수는 2025년 12월 30일 접수부터 폐지돼 표에서 뺐어요.</p>
            </details>
            {snapshot && <p className="muted small">참고: 이 특기의 현재 접수 회차 지원률 <RateBar rate={snapshot.rate} /> (모집 {snapshot.quota}명 · 접수 {snapshot.applicants}명)</p>}
          </div>
        </>}
        <p className="muted small">참고용 계산이에요. 실기 점수, 가산점 세부 조건, 자격의 실제 인정 여부는 회차별 모집공고가 우선이고, 출결·면접 점수는 2025년 12월 30일 접수부터 폐지됐어요. <Link to="/guide/score-basics">배점 구조 안내</Link></p>
      </section>}
    </>
  );
}
