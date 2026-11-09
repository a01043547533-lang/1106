import { PageHeading } from '../design.jsx';
// 마감 임박 미달 보드 — 접수 중인 특기 가운데 곧 마감되고 지원률이 1.0 미만인 것만 모은다.
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AddToCalendar, BranchBadge, Countdown, Forecast, OfficialApplyLink, RateBar, Status, monthLabel, useApi } from '../components.jsx';

const WINDOWS = [[24, '24시간 이내'], [48, '48시간 이내'], [168, '7일 이내'], [0, '접수 중 전체']];
const endTime = (v) => (v ? Date.parse(String(v).length === 10 ? `${v}T23:59:59+09:00` : /(?:Z|[+-]\d\d:\d\d)$/.test(v) ? v : `${v}+09:00`) : NaN);

export function closingItems(items, hours = 48, shortOnly = true, now = Date.now()) {
  const limit = hours ? now + hours * 3600000 : Infinity;
  return (items || [])
    .filter((s) => { const t = endTime(s.applyEnd); return Number.isFinite(t) && t >= now && t <= limit && (!shortOnly || (s.rate ?? 99) < 1); })
    .sort((a, b) => endTime(a.applyEnd) - endTime(b.applyEnd) || (a.rate ?? 99) - (b.rate ?? 99));
}

export default function Closing() {
  const live = useApi('/api/now?sort=rate_asc', { interval: 30000 });
  const fc = useApi('/api/forecast', { interval: 60000 });
  const fcOf = (s) => (fc.data?.items || []).find((x) => x.branch === s.branch && x.mosCode === s.mosCode && x.roundLabel === s.roundLabel && x.unit === s.unit && x.enlistMonth === s.enlistMonth)?.forecast;
  const [hours, setHours] = useState(48);
  const [shortOnly, setShortOnly] = useState(true);
  const all = live.data?.items || [];
  const rows = useMemo(() => closingItems(all, hours, shortOnly), [all, hours, shortOnly]);
  const within = useMemo(() => closingItems(all, hours, false).length, [all, hours]);
  const label = WINDOWS.find(([h]) => h === hours)?.[1];
  return (
    <>
      <PageHeading title="마감 임박 미달 특기" description="접수 마감이 가까운데 아직 지원자가 모집인원보다 적은 특기만 모았어요. 30초마다 갱신되고, 마감 직전에는 숫자가 빠르게 바뀌어요." />
      <div className="tabs" role="group" aria-label="마감까지 남은 시간">
        {WINDOWS.map(([h, name]) => <button key={h} aria-pressed={hours === h} className={hours === h ? 'on' : ''} onClick={() => setHours(h)}>{name}</button>)}
      </div>
      <div className="filters">
        <label className="check-inline"><input type="checkbox" checked={shortOnly} onChange={(e) => setShortOnly(e.target.checked)} /> 미달(지원률 1.0 미만)만 보기</label>
        <span className="muted small">{live.at ? `마지막 갱신 ${live.at.toLocaleTimeString('ko-KR')}` : ''}</span>
      </div>
      {live.data && <p className="muted small">접수 중 {all.length}개 · {label} 마감 {within}개{shortOnly ? ` · 그중 미달 ${rows.length}개` : ''}</p>}
      <Status state={live} empty={live.data && !rows.length ? (shortOnly ? `${label}에 마감되는 미달 특기가 없어요. 기간을 늘리거나 「미달만 보기」를 꺼 보세요.` : `${label}에 마감되는 특기가 없어요.`) : null} />
      {rows.length > 0 && <div className="table-wrap"><table className="grid stack closing-table">
        <thead><tr><th>특기</th><th>입영</th><th className="num">모집 / 접수</th><th className="num">부족 인원</th><th>지원률</th><th>마감 예상</th><th>마감까지</th><th>지원·알림</th></tr></thead>
        <tbody>
          {rows.map((s) => {
            const short = (s.quota ?? 0) - (s.applicants ?? 0);
            const ev = { uid: `close-${s.branch}-${s.mosCode}-${s.roundLabel}-${s.unit}`, title: `${s.branch} ${s.mosName} 접수 마감`, start: String(s.applyEnd).slice(0, 10), description: `${s.category || ''} ${s.roundLabel ? s.roundLabel + '회차' : ''} · 접수기간 ${s.applyStart || '?'} ~ ${s.applyEnd} · 지원은 병무청에서`, url: `${window.location.origin}/mos/${encodeURIComponent(s.mosCode)}` };
            return <tr key={`${s.branch}-${s.mosCode}-${s.unit}-${s.enlistMonth}-${s.roundLabel}`}>
              <td className="cell-name"><BranchBadge branch={s.branch} /> <Link to={`/mos/${encodeURIComponent(s.mosCode)}`}><b>{s.mosName}</b></Link><div className="muted small">{[s.category, s.unit, s.roundLabel && `${s.roundLabel}회차`].filter(Boolean).join(' · ')}</div></td>
              <td className="cell-sub">{monthLabel(s.enlistMonth)}</td>
              <td className="num" data-label="모집 / 접수">{s.quota} / {s.applicants}</td>
              <td className="num" data-label="부족 인원">{short > 0 ? <b className="short">{short}명</b> : <span className="muted">-</span>}</td>
              <td data-label="지원률"><RateBar rate={s.rate} /></td>
              <td data-label="마감 예상"><Forecast f={fcOf(s)} compact /></td>
              <td data-label="마감까지">{s.applyEnd ? <Countdown to={s.applyEnd} /> : '-'}</td>
              <td className="actions cell-full"><OfficialApplyLink compact mosName={s.mosName} /><AddToCalendar event={ev} compact /></td>
            </tr>;
          })}
        </tbody>
      </table></div>}
      <aside className="note" aria-labelledby="closing-help">
        <p className="note-title" id="closing-help">보기 전에 알아 둘 것</p>
        <p>미달은 「지금 이 순간」 지원자가 모집인원보다 적다는 뜻이고, 마감 때까지 바뀔 수 있어요. 「마감 예상」은 지난 회차들이 마감 전 같은 시점부터 얼마나 늘었는지를 현재 지원률에 곱한 참고값이에요.{fc.data?.summary && !fc.data.summary.ready && ' 아직 기록이 모이는 중이라 예상치 대신 수집 상태를 보여 줘요.'} 신체조건과 필수 자격을 갖춰야 하고, 1차 합격 뒤 서류와 입영판정검사를 거쳐 최종 합격이 정해져요.</p>
        <p className="note-links"><Link to="/guide/rate-reading">지원률 읽는 법</Link> · <Link to="/find">내 조건으로 지원 가능한지 확인</Link> · <Link to="/now">접수 중 전체 보기</Link></p>
      </aside>
    </>
  );
}
