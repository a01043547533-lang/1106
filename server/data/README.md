# 공개 데이터

- prepared/*.json.gz: 기존 병무청 API 응답을 열 이름+행 배열로 압축한 공개 기준자료. manifest.json에 조회일·행 수 기록.
- snapshots.jsonl: 실시간 조회 실패 시 사용하는 기존 접수현황 공개 기록.
- final_rates.json: 기존 회차의 지원률 기록.
- service_terms.json: 2025-12-31 기준 병무청 복무기간 CSV 15종. 원본 구분·파일명·기준일 보존.
- calendar.json, lottery.json, rules.json, links.json: 화면에서 사용하는 참고 정보.

키와 개인정보는 이 폴더에 포함하지 않습니다. 서버 함수에서는 읽기만 합니다.