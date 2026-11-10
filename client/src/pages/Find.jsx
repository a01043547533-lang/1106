import { PageHeading } from '../design.jsx';
import { CertificateSection } from '../exam-timeline.jsx';
// ★ 특기 찾기 — 내 신체조건·자격으로 갈 수 있는 특기. 입력은 서버에 저장되지 않는다.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BranchBadge, MultiPicker, OfficialApplyLink, RateBar, RulesBox, mosHref } from '../components.jsx';

// 입력 범위. 벗어나면 조회를 막고 칸 아래에 이유를 보여 준다(오타로 엉뚱한 결과를 받지 않게).
const LIMITS = { height: ['신장', 130, 220, 'cm'], weight: ['체중', 30, 200, 'kg'], vision: ['교정시력', 0.1, 2.0, ''] };
function validate(f) {
  const errors = {};
  for (const [k, [name, min, max, unit]] of Object.entries(LIMITS)) {
    const raw = String(f[k] ?? '').trim();
    if (!raw) continue;
    const v = Number(raw);
    if (!Number.isFinite(v)) errors[k] = `${name}은 숫자로 넣어 주세요.`;
    else if (v < min || v > max) errors[k] = `${name}은 ${min}~${max}${unit} 사이로 넣어 주세요.`;
  }
  return errors;
}
const GROUPS = [
  ['ok', '지원할 수 있어요'],
  ['item', '자격이 하나 부족해요'],
  ['physical', '신체조건이 맞지 않아요'],
];

export default function Find() {
  const [f, setF] = useState({ height: '', weight: '', vision: '', grade: '', branch: '' });
  const [items, setItems] = useState([]);
  const [res, setRes] = useState({ data: null, error: null, busy: false });
  const [touched, setTouched] = useState({});
  const errors = validate(f);
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setTouched((t) => ({ ...t, [k]: true })); };

  const search = async (e) => {
    e.preventDefault();
    if (Object.keys(errors).length) { setTouched({ height: true, weight: true, vision: true }); document.querySelector('.field-error')?.closest('label')?.querySelector('input')?.focus(); return; }
    setRes({ data: null, error: null, busy: true });
    const qs = new URLSearchParams(Object.entries({ ...f, items: items.join(',') }).filter(([, v]) => v));
    try {
      const r = await fetch(`/api/mos/search?${qs}`);
      if (!r.ok) throw new Error();
      setRes({ data: await r.json(), error: null, busy: false });
    } catch {
      setRes({ data: null, error: '지금은 불러올 수 없어요', busy: false });
    }
  };

  const d = res.data;
  return (
    <>
      <PageHeading title="내 조건으로 갈 수 있는 군 특기 찾기" description="키·몸무게·시력·신체등급과 가진 자격을 넣으면 지원할 수 있는 특기와 안 되는 이유를 알려 줘요. 전부 비워도 검색돼요." />
      <RulesBox title="출결·면접 폐지 안내 보기" ids={[5, 6]} />

      <form className="card form" onSubmit={search} aria-busy={res.busy}>
        <h2>1단계 · 내 조건</h2>
        <div className="row">
          <label className={errors.height && touched.height ? 'has-error' : ''}>신장(cm)<input inputMode="decimal" value={f.height} onChange={set('height')} placeholder="175" aria-invalid={Boolean(errors.height && touched.height)} aria-describedby={errors.height && touched.height ? 'height-error' : undefined} />{errors.height && touched.height && <span className="field-error" id="height-error" role="alert">{errors.height}</span>}</label>
          <label className={errors.weight && touched.weight ? 'has-error' : ''}>체중(kg)<input inputMode="decimal" value={f.weight} onChange={set('weight')} placeholder="68" aria-invalid={Boolean(errors.weight && touched.weight)} aria-describedby={errors.weight && touched.weight ? 'weight-error' : undefined} />{errors.weight && touched.weight && <span className="field-error" id="weight-error" role="alert">{errors.weight}</span>}</label>
          <label className={errors.vision && touched.vision ? 'has-error' : ''}>교정시력<input inputMode="decimal" value={f.vision} onChange={set('vision')} placeholder="0.8" aria-invalid={Boolean(errors.vision && touched.vision)} aria-describedby={errors.vision && touched.vision ? 'vision-error' : undefined} />{errors.vision && touched.vision && <span className="field-error" id="vision-error" role="alert">{errors.vision}</span>}</label>
          <label>신체등급
            <select value={f.grade} onChange={set('grade')}><option value="">선택 안 함</option>{[1, 2, 3, 4].map((g) => <option key={g} value={g}>{g}급</option>)}</select>
          </label>
        </div>
        <h2>2단계 · 내 자격·면허·전공</h2>
        <MultiPicker value={items} onChange={setItems} />
        <h2>3단계 · 지원 희망 군</h2>
        <label aria-label="지원 희망 군">
          <select aria-label="지원 희망 군" value={f.branch} onChange={set('branch')}><option value="">전체</option>{['육군', '해군', '공군', '해병대'].map((b) => <option key={b}>{b}</option>)}</select>
        </label>
        <p className="muted small">입력한 값은 서버에 저장되지 않아요. 검색에만 쓰고 바로 버려요.</p>
        {Object.keys(errors).length > 0 && Object.keys(touched).length > 0 && <p className="error small" role="status">입력값을 확인해 주세요. 빈칸으로 두면 그 조건은 빼고 찾아요.</p>}
        <button type="submit" className="primary" disabled={res.busy}>{res.busy ? '찾는 중…' : '조회'}</button>
      </form>

      {res.error && <p className="error" role="alert">{res.error}</p>}
      {d && d.total === 0 && <p className="card">특기 정보를 모으는 중이에요. 잠시 뒤 다시 시도해 주세요.</p>}
      {d && d.total > 0 && !d.groups.ok.length && (
        <p className="card">조건을 하나만 빼 보세요.{d.topReasons[0] && <> 가장 많이 걸린 조건은 <b>{d.topReasons[0][0]}</b>이에요.</>}</p>
      )}
      {d && d.total > 0 && <p className="muted small" id="find-results">결과 {d.total}개 · 「지원할 수 있어요」만 펼쳐 두었어요. 나머지는 제목을 누르면 열려요.</p>}
      {d && GROUPS.map(([key, title], gi) => (
        d.groups[key].length > 0 && (
          <details key={key} className="card result-group" open={key === 'ok'} style={{ animationDelay: `${gi * 150}ms` }}>
            <summary><h2>{title} <span className="muted">({d.groups[key].length})</span>{key !== 'ok' && <span className="small muted summary-hint"> 눌러서 펼치기</span>}</h2></summary>
            <ul className="cards">
              {d.groups[key].slice(0, 60).map((m) => (
                <li key={`${m.branch}-${m.mosCode}-${m.category}`} className="mcard">
                  <div><BranchBadge branch={m.branch} /> <Link to={mosHref(m.mosCode, m.branch)}><b>{m.mosName}</b></Link></div>
                  <div className="muted small">{m.category}</div>
                  <div className="badges">
                    <span className="badge gray">{m.interview === 'Y' ? '면접 있음' : '면접 없음'}</span>
                    {m.yearRound === 'Y' && <span className="badge gray">연간모집</span>}
                  </div>
                  <RateBar rate={m.rate} />
                  {m.reasons.length > 0 && <p className="small error">{m.reasons.join(' · ')}</p>}
                  {m.missingItems.length > 0 && <p className="small">{m.missingItems[0]}{m.missingItems.length > 1 ? ` 등` : ''}이(가) 있으면 지원할 수 있어요</p>}
                  {m.unknownCriteria.length > 0 && <p className="muted small">{m.unknownCriteria.join('·')} 기준은 공고에서 확인하세요</p>}
                  {key === 'ok' && <div className="apply-result"><OfficialApplyLink compact mosName={m.mosName} /><span className="muted small">접수 여부·최종 자격은 병무청에서 확인해요.</span></div>}
                </li>
              ))}
            </ul>
            {d.groups[key].length > 60 && <p className="muted small">상위 60개만 보여요. 조건을 더 넣으면 좁혀져요.</p>}
          </details>
        )
      ))}
      <CertificateSection intro={d && d.groups?.item?.length ? `「자격이 하나 부족해요」에 나온 ${d.groups.item.length}개 특기는 관련 자격·면허·전공 중 하나만 있으면 지원할 수 있어요. 따고 싶은 자격의 시험 일정을 확인해 보세요.` : '자격증·면허를 새로 따면 지원할 수 있는 특기와 배점이 늘어나요. 공식 사이트와 올해 시험 일정을 확인해 보세요.'} />
    </>
  );
}
