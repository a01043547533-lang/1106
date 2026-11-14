'use client';
import { PageHeading } from '../design.jsx';
import { useState } from 'react';
import { Link } from '@/legacy/router.jsx';
import { useRouteData } from '../data.jsx';
import { AddToCalendar, OfficialApplyLink, Status, dday } from '../components.jsx';

const KINDS = ['전체', '모집병', '일반병 입영일자', '사회복무', '카투사', '취업맞춤특기병'];

export default function Calendar() {
  const cal = useRouteData('calendar', '/api/calendar', (r) => r.items);
  const [kind, setKind] = useState('전체');
  const rows = (cal.value || []).filter((e) => kind === '전체' || e.kind === kind);
  // 일정이 0건인 종류는 탭에서 뺀다(눌러도 빈 화면만 나오던 문제). 종류별 건수를 탭 이름에 함께 적는다.
  const countOf = (k) => (k === '전체' ? (cal.value || []).length : (cal.value || []).filter((e) => e.kind === k).length);
  const kinds = KINDS.filter((k) => k === '전체' || countOf(k) > 0);
  const toEvent = (e) => ({ uid: `cal-${e.id}`, title: e.title, start: e.start, end: e.end || e.start, description: [e.target && `대상: ${e.target}`, e.verified ? '병무청 공고 기준' : '공고 확인 필요'].filter(Boolean).join(' · '), url: e.sourceUrl || window.location.href });
  return (
    <>
      <PageHeading title="모집병·사회복무요원·카투사 접수 일정" description="다가오는 일정을 시간순으로 모았어요. 날짜는 병무청 공고 원문에서 옮긴 값만 쓰고, 공고 전인 종류(일반병 입영일자 본인선택 등)는 일정이 나오면 탭이 생겨요." />
      <div className="tabs">
        {kinds.map((k) => <button key={k} aria-pressed={kind === k} className={kind === k ? 'on' : ''} onClick={() => setKind(k)}>{k}{cal.value ? ` ${countOf(k)}` : ''}</button>)}
      </div>
      {rows.length > 1 && <p className="cal-all"><AddToCalendar events={rows.map(toEvent)} filename={`입대타이밍-${kind}-일정`} /> <span className="muted small">내려받은 파일을 열면 휴대폰·PC 캘린더에 한 번에 들어가요. 각 일정 하루 전에 알림이 울려요.</span></p>}
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
              {['모집병', '카투사'].includes(e.kind) && <OfficialApplyLink compact />}
              <AddToCalendar event={toEvent(e)} compact />
            </div>
          </li>
        ))}
      </ul>
      <p className="muted small">일정을 놓치지 않는 방법은 <Link to="/alerts">접수 일정 챙기기</Link>에서 정리했어요. 날짜는 공고 원문이 우선이에요.</p>
    </>
  );
}
