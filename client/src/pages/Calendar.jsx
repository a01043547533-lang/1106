import { PageHeading } from '../design.jsx';
import { useState } from 'react';
import { useRouteData } from '../data.jsx';
import { AdSlot, OfficialApplyLink, Status, SubscribeForm, dday } from '../components.jsx';

const KINDS = ['전체', '모집병', '일반병 입영일자', '사회복무', '카투사', '취업맞춤특기병'];
const KIND_ALERT = { 모집병: ['start', 'deadline'], 사회복무: ['social'], 카투사: ['katusa'] };

export default function Calendar() {
  const cal = useRouteData('calendar', '/api/calendar', (r) => r.items);
  const [kind, setKind] = useState('전체');
  const [alertKind, setAlertKind] = useState(null);
  const rows = (cal.value || []).filter((e) => kind === '전체' || e.kind === kind);
  return (
    <>
      <PageHeading title="모집병·사회복무요원·카투사 접수 일정" description="다가오는 일정을 시간순으로 모았어요. 날짜는 병무청 공고 원문에서 옮긴 값만 써요." />
      <div className="tabs">
        {KINDS.map((k) => <button key={k} aria-pressed={kind === k} className={kind === k ? 'on' : ''} onClick={() => setKind(k)}>{k}</button>)}
      </div>
      <Status state={cal} empty={cal.value && !rows.length ? '이 종류의 다가오는 일정이 없어요' : null} />
      <ul className="timeline-list">
        {rows.map((e) => (
          <li key={e.id} className="card">
            <div className="row-between">
              <b>{e.title}</b>
              {dday(e.start) && <span className="badge blue">{dday(e.start)}</span>}
            </div>
            <div>{e.start}{e.end ? ` ~ ${e.end}` : ''}</div>
            {e.target && <div className="muted small">대상: {e.target}</div>}
            <div className="small">
              {!e.verified && <span className="badge gray">공고 확인 필요</span>}
              {e.sourceUrl && <a href={e.sourceUrl} target="_blank" rel="noreferrer">원본 공고</a>}
              {KIND_ALERT[e.kind] && <button className="link" onClick={() => setAlertKind(e.kind)}>알림 받기</button>}
              {['모집병', '카투사'].includes(e.kind) && <OfficialApplyLink compact />}
            </div>
          </li>
        ))}
      </ul>
      {alertKind && (
        <section className="card">
          <h2>{alertKind} 일정 알림 받기</h2>
          <SubscribeForm kinds={KIND_ALERT[alertKind]} label="알림 신청" />
        </section>
      )}
      <AdSlot size="320x100" />
    </>
  );
}
