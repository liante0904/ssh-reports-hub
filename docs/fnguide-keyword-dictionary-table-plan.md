# FnGuide 키워드 딕셔너리 테이블 작업 기록

## 적용 결과

- 적용일: 2026-06-06
- 운영 테이블: `public.tbm_fnguide_keyword_dictionary`
- 초기 데이터: 70건
- 분류: `positive` 26건, `negative` 20건, `catalyst` 24건
- 전수 빈도 분석 완료: 70건
- 정규화 키워드 중복: 0건
- 재실행 SQL: `docs/sql/tbm_fnguide_keyword_dictionary.sql`

## 목적

FnGuide 요약에서 사용하는 투자 중요 키워드를 코드 상수가 아닌 운영 데이터로 관리한다.
향후 본문 강조, 검색, 알림, 리포트 중요도 점수와 분석 모델의 공통 기준 데이터로 사용한다.

## 운영 DB 확인 결과

- PostgreSQL 컨테이너: `main-postgres`
- 데이터베이스: `ssh_reports_hub`
- 기존 마스터 테이블 접두어: `tbm_`
- FnGuide 원본 테이블: `tbl_fnguide_report_summaries`
- 분석 대상: 2026-01-02 ~ 2026-06-05, 총 9,732건

## 생성 테이블

`public.tbm_fnguide_keyword_dictionary`

## 필수 컬럼

| 컬럼 | 목적 |
|---|---|
| `keyword_id` | 내부 PK |
| `keyword_code` | 외부 연동에도 사용할 안정적인 식별 코드 |
| `keyword` | 화면과 문서에 표시하는 표준 키워드 |
| `normalized_keyword` | 공백·대소문자를 제거한 중복 검사용 값 |
| `category_code` | 실적, 공급, 수주, 가격, 밸류에이션 등 주제 |
| `signal_type` | `positive`, `negative`, `catalyst`, `context` |
| `meaning` | 키워드 자체의 정의 |
| `investment_implication` | 투자 판단에서 읽어야 할 의미와 주의점 |
| `importance_level` | 1~5 중요도 |
| `match_scope` | 적용 데이터 범위 |
| `source_basis` | 등록 근거 |
| `occurrence_count` | 마지막 전수 분석 시 등장 횟수 |
| `analyzed_at` | 빈도 분석 기준 시각 |
| `is_active` | 실제 사용 여부 |
| `display_order` | 동일 분류 내 노출 순서 |
| `created_at`, `updated_at` | 생성·수정 시각 |
| `created_by`, `updated_by` | 변경 주체 |

## 무결성 규칙

- `keyword_code` 유일성 보장
- `normalized_keyword` 유일성 보장
- `signal_type` 허용값 제한
- `importance_level` 1~5 제한
- 빈 키워드와 빈 의미 저장 금지
- `updated_at` 자동 갱신 트리거
- 테이블 및 모든 주요 컬럼에 PostgreSQL `COMMENT` 작성

## 초기 적재

`src/constants/fnguideKeywords.js`에 있는 전체 키워드를 적재한다.

- 긍정 변화: 리레이팅, 증산, 고가 수주, 판가 인상 등
- 부정 변화: 감산, 저가 수주, 공급 과잉, 감익 등
- 주요 촉매: 성장률, 증설, 수주, 양산, 임상 등

각 행에는 단순 분류만 넣지 않고 다음을 작성한다.

1. 용어의 일반적인 의미
2. 투자자가 확인해야 할 해석
3. 운영 DB 전수 분석 빈도
4. 등록 근거와 분석 기준일

## 실행 순서

1. 멱등성 있는 DDL 작성
2. 운영 PostgreSQL에 테이블·인덱스·트리거·코멘트 생성
3. 현재 키워드 사전 초기 적재
4. 레코드 수, 중복, 제약조건, 코멘트 검증
5. 생성 SQL과 운영 방법을 저장소 문서로 보존
6. 후속 작업에서 API를 추가해 프론트 상수 대신 DB를 조회하도록 전환

## 이번 작업 범위

- 테이블 생성
- 초기 키워드 적재
- 데이터 의미 및 투자 해석 저장
- 빈도와 분석 근거 저장
- 검증 및 문서화

## 후속 작업

- 키워드 CRUD 관리자 API
- 변경 이력 테이블 또는 감사 로그
- 프론트 키워드 사전 API 연동
- 정기 빈도 재집계 작업
- 키워드별 실제 문장 예시와 오탐/미탐 관리
