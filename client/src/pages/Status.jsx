import { PageHeading } from '../design.jsx';
import { useRouteData } from '../data.jsx';
import { Status, useApi, formatKst as time } from '../components.jsx';

export default function OperationStatus() {
  const initial = useRouteData('health', '/api/health');
  const live = useApi('/api/health', { interval: 60000 });
  const data = live.data || initial.value;
  return <>
    <PageHeading title="서비스 운영 상태" description="현재 서버 함수의 API 조회 상태를 표시해요. 함수가 재시작되면 임시 기록이 초기화됩니다. 이 화면은 1분마다 갱신됩니다." />
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
          <dt>화면 제공 방식</dt><dd>React 정적 화면 + 서버 API</dd>
          <dt>인증키 설정</dt><dd>{data.apiConfigured ? '설정됨' : '없음 (Vercel 환경변수 MMA_API_KEY 확인)'}</dd>
          <dt>서버 실행 지역</dt><dd>{data.region || '로컬'}</dd>
        </dl>
      </section>
      <section className="card">
        <h2>API별 수집 기록</h2>
        <p className="muted small">접수현황은 병무청 API에서 갱신합니다. 특기·자격·배점 기준은 아래 조회일에 준비한 공개 자료를 사용합니다.</p>
        <div className="table-wrap"><table className="grid status-table">
          <thead><tr><th>API</th><th>최근 결과</th><th>실패 원인</th><th>마지막 성공</th><th>마지막 실패</th><th>연속 실패</th></tr></thead>
          <tbody>{data.apis.map((api) => <tr key={api.key}>
            <td>{api.name}</td><td>{api.ok == null ? '기록 없음' : api.ok ? '성공' : '실패'}{api.httpStatus && ` (${api.httpStatus})`}{api.lastMs != null && <span className="muted small"> · {(api.lastMs / 1000).toFixed(1)}초</span>}</td><td>{api.reason || '-'}</td>
            <td>{time(api.lastSuccessAt)}</td><td>{time(api.lastFailureAt)}</td><td>{api.consecutiveFailures}회</td>
          </tr>)}</tbody>
        </table></div>
        <p className="muted small">확인 시각: {time(data.checkedAt)}</p>
        {data.referenceData?.length > 0 && <ul>{data.referenceData.map((item) => <li key={item.key}>{item.key} · {item.rows.toLocaleString()}건 · {time(item.fetchedAt)}</li>)}</ul>}
      </section>
    </>}
  </>;
}
