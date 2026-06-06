# FnGuide 중요 키워드 관리

## 관리 위치

- 운영 마스터: `public.tbm_fnguide_keyword_dictionary`
- 재현 가능한 DDL/seed: `docs/sql/tbm_fnguide_keyword_dictionary.sql`
- 프론트 런타임 스냅샷: `src/constants/fnguideKeywords.js`
- 토큰화 로직: `src/utils/fnguide.js`
- 화면 스타일: `src/components/FnGuideList.css`
- 회귀 테스트: `test/unit/utils.test.js`

현재 프론트는 API 연동 전이므로 `FNGUIDE_KEYWORD_GROUPS`를 런타임 스냅샷으로 사용한다.
키워드를 변경할 때는 운영 마스터와 스냅샷을 함께 갱신한다.
띄어쓰기가 있는 표현은 붙여 쓴 문장도 자동으로 인식한다.

## 분류

| 분류 | 의미 | 예시 |
|---|---|---|
| `positive` | 실적·가격·수급의 긍정 변화 | 리레이팅, 증산, 고가 수주, 판가 인상 |
| `negative` | 실적·가격·수급의 부정 변화 | 감산, 저가 수주, 공급 과잉, 감익 |
| `catalyst` | 방향 확정 전 확인할 주요 사건 | 증설, 수주, 양산, 임상, CAPEX |

## 운영 DB 기준

2026년 6월 6일 운영 PostgreSQL에 `tbm_fnguide_keyword_dictionary`를 생성하고
`tbl_fnguide_report_summaries` 9,732건을 정규화해 전수 집계했다.

주요 등장 횟수:

- 수주 5,486
- 성장률 1,043
- 증설 1,264
- 가동률 1,100
- 리레이팅 541
- 판가 인상 300
- 증산 67
- 감산 44
- 저가 수주 10
- 고가 수주 4

공백 제거 후 집계하므로 붙여 쓴 표현도 같은 키워드로 계산한다.

## 추가 기준

1. 투자 판단의 방향이나 촉매를 바꾸는 표현만 추가한다.
2. `개선`, `상승`, `성장` 같은 일반 단어는 단독 등록하지 않는다.
3. 긍정·부정 의미가 문맥에 따라 달라지는 단어는 `catalyst`로 둔다.
4. 추가 시 실제 FnGuide 문장과 붙여쓰기 변형을 유닛 테스트에 포함한다.
5. 강조가 지나치게 많아지면 빈도보다 판단 중요도를 우선해 제거한다.
