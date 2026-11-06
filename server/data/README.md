# server/data

- 수집기가 채우는 파일: snapshots.jsonl, mos_master.json, documents.json, scoring_rules.json,
  scoring_rules_special.json, eligibility.json, jobfit.json, social_orgs.json, collect_log.jsonl, _raw/
- 직접 채우는 파일: final_rates.json, service_terms.json, calendar.json, lottery.json, rules.json, links.json
- sample/ : API 키 승인 전 fallback. 병무청 실시간 지원현황 화면에서 옮긴 실제 값만 넣는다(지어낸 숫자 금지).
  snapshots.sample.jsonl 한 줄 형식:
  {"branch":"육군","roundLabel":"2026-12","enlistMonth":"2027-03","unit":"육군훈련소","category":"기술행정병","mosCode":"","mosName":"","applyStart":"2026-11-27T14:00","applyEnd":"2026-12-03T14:00","quota":0,"applicants":0,"shortage":0,"rate":0}
- service_terms.json : 사용자 제공 `병무청_군별 복무유형별 복무기간_20251231.csv`의 15종을 반영했다(데이터 기준일 2025-12-31). `branch`, `type`, `months`에 원본 구분(`sourceCategory`), 기준일(`asOf`), 출처 파일(`sourceFile`)을 함께 보존한다. 원본의 `해병`은 기존 사이트 군명 `해병대`로 매핑하며, 상근예비역에는 CSV에 없는 군을 임의로 붙이지 않는다.
  갱신: `npm run import:service-terms -- "CSV 경로"` (UTF-8/CP949 지원, 저장 전 형식·중복 검증). 복무기간 자료이며 선발배점 데이터와는 별개다.
