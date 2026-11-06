import { useRouteData } from '../data.jsx';
import { Status, useApi, formatKst as time } from '../components.jsx';

export default function OperationStatus() {
  const initial = useRouteData('health', '/api/health');
  const live = useApi('/api/health', { interval: 60000 });
  const data = live.data || initial.value;
  return <>
    <h1>서비스 운영 상태</h1>
    <p className="lead">수집 로그를 기준으로 표시해요. 이 화면은 1분마다 갱신됩니다.</p>
    <Status state={initial} />
    {data && <>
      <section className="card">
        <h2>현재 상태</h2>
        <dl className="status-summary">
          <dt>마지막 접수현황 성공 수집</dt><dd>{time(data.lastCollectedAt)}</dd>
          <dt>마지막 수집 시도</dt><dd>{time(data.lastAttemptAt)}</dd>
          <dt>샘플 모드</dt><dd>{data.isSample ? '사용 중' : '아니요'}</dd>
          <dt>데이터 신선도</dt><dd>{data.stale ? '6시간 이상 오래됐거나 성공 기록 없음' : '6시간 이내 수집'}</dd>
          <dt>접수현황 연속 실패</dt><dd>{data.consecutiveFailures}회</dd>
          <dt>최근 24시간 SSR 오류</dt><dd>{data.ssrErrors24h}건</dd>
        </dl>
      </section>
      <section className="card">
        <h2>API별 수집 기록</h2>
        <div className="table-wrap"><table className="grid status-table">
          <thead><tr><th>API</th><th>최근 결과</th><th>마지막 성공</th><th>마지막 실패</th><th>연속 실패</th></tr></thead>
          <tbody>{data.apis.map((api) => <tr key={api.key}>
            <td>{api.name}</td><td>{api.ok == null ? '기록 없음' : api.ok ? '성공' : '실패'}{api.httpStatus && ` (${api.httpStatus})`}</td>
            <td>{time(api.lastSuccessAt)}</td><td>{time(api.lastFailureAt)}</td><td>{api.consecutiveFailures}회</td>
          </tr>)}</tbody>
        </table></div>
        <p className="muted small">확인 시각: {time(data.checkedAt)}</p>
      </section>
    </>}
  </>;
}
