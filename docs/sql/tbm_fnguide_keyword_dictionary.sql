BEGIN;

CREATE TABLE IF NOT EXISTS public.tbm_fnguide_keyword_dictionary (
    keyword_id BIGSERIAL PRIMARY KEY,
    keyword_code VARCHAR(80) NOT NULL,
    keyword VARCHAR(100) NOT NULL,
    normalized_keyword VARCHAR(100)
        GENERATED ALWAYS AS (regexp_replace(lower(keyword), '\s+', '', 'g')) STORED,
    category_code VARCHAR(30) NOT NULL,
    signal_type VARCHAR(20) NOT NULL,
    meaning TEXT NOT NULL,
    investment_implication TEXT NOT NULL,
    importance_level SMALLINT NOT NULL DEFAULT 3,
    match_scope VARCHAR(50) NOT NULL DEFAULT 'fnguide_summary',
    source_basis TEXT NOT NULL,
    matched_report_count INTEGER NOT NULL DEFAULT 0,
    occurrence_count INTEGER NOT NULL DEFAULT 0,
    analyzed_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INTEGER NOT NULL DEFAULT 100,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by VARCHAR(80) NOT NULL DEFAULT 'system',
    updated_by VARCHAR(80) NOT NULL DEFAULT 'system',
    CONSTRAINT uq_tbm_fnguide_keyword_dictionary_code UNIQUE (keyword_code),
    CONSTRAINT uq_tbm_fnguide_keyword_dictionary_normalized UNIQUE (normalized_keyword),
    CONSTRAINT ck_tbm_fnguide_keyword_dictionary_signal
        CHECK (signal_type IN ('positive', 'negative', 'catalyst', 'context')),
    CONSTRAINT ck_tbm_fnguide_keyword_dictionary_importance
        CHECK (importance_level BETWEEN 1 AND 5),
    CONSTRAINT ck_tbm_fnguide_keyword_dictionary_category
        CHECK (category_code IN (
            'earnings', 'supply', 'orders', 'pricing', 'valuation',
            'growth', 'shareholder', 'risk', 'clinical'
        )),
    CONSTRAINT ck_tbm_fnguide_keyword_dictionary_keyword
        CHECK (btrim(keyword) <> ''),
    CONSTRAINT ck_tbm_fnguide_keyword_dictionary_meaning
        CHECK (btrim(meaning) <> '')
);

CREATE INDEX IF NOT EXISTS idx_tbm_fnguide_keyword_dictionary_active
    ON public.tbm_fnguide_keyword_dictionary (is_active, category_code, display_order);

CREATE INDEX IF NOT EXISTS idx_tbm_fnguide_keyword_dictionary_signal
    ON public.tbm_fnguide_keyword_dictionary (signal_type, importance_level DESC);

CREATE OR REPLACE FUNCTION public.set_tbm_fnguide_keyword_dictionary_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tbm_fnguide_keyword_dictionary_updated_at
    ON public.tbm_fnguide_keyword_dictionary;

CREATE TRIGGER trg_tbm_fnguide_keyword_dictionary_updated_at
BEFORE UPDATE ON public.tbm_fnguide_keyword_dictionary
FOR EACH ROW
EXECUTE FUNCTION public.set_tbm_fnguide_keyword_dictionary_updated_at();

COMMENT ON TABLE public.tbm_fnguide_keyword_dictionary IS
'FnGuide 요약의 투자 중요 표현을 중앙 관리하는 마스터 딕셔너리. 본문 강조, 검색, 알림, 중요도 점수 및 분석 모델의 공통 기준으로 사용한다.';
COMMENT ON COLUMN public.tbm_fnguide_keyword_dictionary.keyword_id IS '키워드 내부 식별자';
COMMENT ON COLUMN public.tbm_fnguide_keyword_dictionary.keyword_code IS 'API 및 코드 연동에 사용하는 변경되지 않는 영문 식별 코드';
COMMENT ON COLUMN public.tbm_fnguide_keyword_dictionary.keyword IS '화면과 문서에 표시하는 표준 키워드';
COMMENT ON COLUMN public.tbm_fnguide_keyword_dictionary.normalized_keyword IS '공백과 대소문자를 제거한 중복 검사 및 매칭용 키워드';
COMMENT ON COLUMN public.tbm_fnguide_keyword_dictionary.category_code IS 'earnings, supply, orders, pricing, valuation, growth, shareholder, risk, clinical 중 하나';
COMMENT ON COLUMN public.tbm_fnguide_keyword_dictionary.signal_type IS 'positive 긍정 변화, negative 부정 변화, catalyst 주요 촉매, context 참고 문맥';
COMMENT ON COLUMN public.tbm_fnguide_keyword_dictionary.meaning IS '키워드가 일반적으로 뜻하는 현상이나 사건의 정의';
COMMENT ON COLUMN public.tbm_fnguide_keyword_dictionary.investment_implication IS '투자 판단에서 확인할 해석과 오해 방지를 위한 주의점';
COMMENT ON COLUMN public.tbm_fnguide_keyword_dictionary.importance_level IS '강조 및 점수화 우선순위. 1 낮음, 5 매우 중요';
COMMENT ON COLUMN public.tbm_fnguide_keyword_dictionary.match_scope IS '키워드가 적용되는 데이터 범위';
COMMENT ON COLUMN public.tbm_fnguide_keyword_dictionary.source_basis IS '키워드 등록 및 분류 근거';
COMMENT ON COLUMN public.tbm_fnguide_keyword_dictionary.matched_report_count IS '마지막 분석 시 해당 키워드가 한 번 이상 등장한 FnGuide 리포트 수';
COMMENT ON COLUMN public.tbm_fnguide_keyword_dictionary.occurrence_count IS '마지막 분석 시 FnGuide 전체 본문에서 해당 키워드가 등장한 총 횟수';
COMMENT ON COLUMN public.tbm_fnguide_keyword_dictionary.analyzed_at IS '빈도 통계를 계산한 기준 시각';
COMMENT ON COLUMN public.tbm_fnguide_keyword_dictionary.is_active IS '본문 강조 및 후속 분석에서 사용할지 여부';
COMMENT ON COLUMN public.tbm_fnguide_keyword_dictionary.display_order IS '같은 분류 안에서의 노출 순서';
COMMENT ON COLUMN public.tbm_fnguide_keyword_dictionary.metadata IS '예문, 오탐 메모, 외부 분류 등 확장 정보';
COMMENT ON COLUMN public.tbm_fnguide_keyword_dictionary.created_at IS '레코드 생성 시각';
COMMENT ON COLUMN public.tbm_fnguide_keyword_dictionary.updated_at IS '레코드 최종 수정 시각';
COMMENT ON COLUMN public.tbm_fnguide_keyword_dictionary.created_by IS '최초 등록 주체';
COMMENT ON COLUMN public.tbm_fnguide_keyword_dictionary.updated_by IS '최종 수정 주체';

WITH seed (
    keyword_code, keyword, category_code, signal_type,
    meaning, importance_level, display_order
) AS (
    VALUES
    ('EARNINGS_SURPRISE', '어닝 서프라이즈', 'earnings', 'positive', '실적이 시장 예상치를 의미 있게 웃돈 상태', 5, 10),
    ('CONSENSUS_BEAT', '컨센서스 상회', 'earnings', 'positive', '발표 또는 추정 실적이 시장 컨센서스보다 높은 상태', 5, 20),
    ('TARGET_PRICE_UP', '목표주가 상향', 'valuation', 'positive', '분석기관이 기업가치 추정치를 이전보다 높인 변화', 5, 30),
    ('VALUATION_APPEAL', '밸류에이션 매력', 'valuation', 'positive', '실적과 자산가치 대비 현재 가격 부담이 낮다는 판단', 4, 40),
    ('PROFITABILITY_IMPROVEMENT', '수익성 개선', 'earnings', 'positive', '매출 대비 이익률 또는 이익 규모가 좋아지는 변화', 5, 50),
    ('EARNINGS_IMPROVEMENT', '실적 개선', 'earnings', 'positive', '매출이나 이익이 이전 기간보다 좋아지는 흐름', 4, 60),
    ('EARNINGS_RECOVERY', '실적 회복', 'earnings', 'positive', '부진했던 실적이 정상 수준으로 복귀하는 과정', 4, 70),
    ('TURN_TO_PROFIT', '흑자전환', 'earnings', 'positive', '적자 상태에서 순이익 또는 영업이익이 흑자로 바뀐 상태', 5, 80),
    ('TURNAROUND', '턴어라운드', 'earnings', 'positive', '사업과 실적의 하락 추세가 개선 추세로 전환되는 국면', 5, 90),
    ('RERATING', '리레이팅', 'valuation', 'positive', '성장성과 질적 변화로 적용 밸류에이션 배수가 높아지는 현상', 5, 100),
    ('EARNINGS_INCREASE', '증익', 'earnings', 'positive', '이익이 전년 또는 전분기 대비 증가하는 변화', 4, 110),
    ('PRODUCTION_INCREASE', '증산', 'supply', 'positive', '수요 대응이나 가동 확대를 위해 생산량을 늘리는 변화', 4, 120),
    ('SHORTAGE', '쇼티지', 'supply', 'positive', '수요 대비 공급이 부족해 가격과 협상력이 높아질 수 있는 상태', 5, 130),
    ('SUPPLY_SHORTAGE', '공급 부족', 'supply', 'positive', '시장 수요를 충족할 공급 물량이 부족한 상태', 5, 140),
    ('HIGH_PRICE_ORDER', '고가 수주', 'orders', 'positive', '높은 판매단가나 수익성이 반영된 계약을 확보한 상태', 5, 150),
    ('ASP_INCREASE', '판가 인상', 'pricing', 'positive', '제품의 평균 판매가격을 올리는 조치', 5, 160),
    ('ASP_RISE', '판가 상승', 'pricing', 'positive', '제품 평균 판매가격이 이전보다 높아지는 변화', 5, 170),
    ('PRICE_INCREASE', '가격 인상', 'pricing', 'positive', '제품 또는 서비스 가격을 올리는 조치', 4, 180),
    ('COST_PASS_THROUGH', '가격 전가', 'pricing', 'positive', '원가 상승분을 판매가격에 반영해 수익성을 방어하는 능력', 5, 190),
    ('MARGIN_IMPROVEMENT', '마진 개선', 'earnings', 'positive', '매출총이익률이나 영업이익률이 높아지는 변화', 5, 200),
    ('MIX_IMPROVEMENT', '믹스 개선', 'pricing', 'positive', '고수익 제품 비중이 높아져 평균 수익성이 좋아지는 변화', 4, 210),
    ('COST_REDUCTION', '원가 절감', 'pricing', 'positive', '생산이나 조달 비용을 낮춰 이익 체력을 높이는 활동', 4, 220),
    ('MARKET_SHARE_GAIN', '점유율 확대', 'growth', 'positive', '전체 시장에서 회사가 차지하는 판매 비중이 높아지는 변화', 4, 230),
    ('INVENTORY_DEPLETION', '재고 소진', 'supply', 'positive', '누적 재고가 판매 또는 감산으로 줄어드는 과정', 4, 240),
    ('SHAREHOLDER_RETURN', '주주환원', 'shareholder', 'positive', '배당과 자사주 정책으로 기업가치를 주주에게 돌려주는 활동', 5, 250),
    ('TREASURY_SHARE_CANCELLATION', '자사주 소각', 'shareholder', 'positive', '보유 자사주를 없애 유통 주식 수를 줄이는 조치', 5, 260),

    ('CONSENSUS_MISS', '컨센서스 하회', 'earnings', 'negative', '발표 또는 추정 실적이 시장 컨센서스보다 낮은 상태', 5, 310),
    ('TARGET_PRICE_DOWN', '목표주가 하향', 'valuation', 'negative', '분석기관이 기업가치 추정치를 이전보다 낮춘 변화', 5, 320),
    ('PROFITABILITY_DETERIORATION', '수익성 악화', 'earnings', 'negative', '이익 규모나 이익률이 이전보다 나빠지는 변화', 5, 330),
    ('EARNINGS_WEAKNESS', '실적 부진', 'earnings', 'negative', '매출이나 이익이 기대 또는 이전 기간보다 약한 상태', 4, 340),
    ('TURN_TO_LOSS', '적자전환', 'earnings', 'negative', '흑자 상태에서 순이익 또는 영업이익이 적자로 바뀐 상태', 5, 350),
    ('GROWTH_SLOWDOWN', '성장 둔화', 'growth', 'negative', '매출이나 이익 성장 속도가 이전보다 낮아지는 변화', 4, 360),
    ('NEGATIVE_GROWTH', '역성장', 'growth', 'negative', '매출이나 이익이 전년 또는 전분기보다 감소한 상태', 5, 370),
    ('DERATING', '디레이팅', 'valuation', 'negative', '성장성이나 신뢰 저하로 적용 밸류에이션 배수가 낮아지는 현상', 5, 380),
    ('EARNINGS_DECREASE', '감익', 'earnings', 'negative', '이익이 전년 또는 전분기 대비 감소하는 변화', 4, 390),
    ('PRODUCTION_CUT', '감산', 'supply', 'negative', '수요 부진이나 재고 조정을 위해 생산량을 줄이는 조치', 4, 400),
    ('OVERSUPPLY', '공급 과잉', 'supply', 'negative', '수요보다 공급이 많아 가격과 가동률에 압력이 생기는 상태', 5, 410),
    ('LOW_PRICE_ORDER', '저가 수주', 'orders', 'negative', '낮은 단가 또는 수익성으로 계약을 확보한 상태', 5, 420),
    ('ASP_DECLINE', '판가 하락', 'pricing', 'negative', '제품 평균 판매가격이 이전보다 낮아지는 변화', 5, 430),
    ('PRICE_DECLINE', '가격 하락', 'pricing', 'negative', '제품 또는 서비스의 시장가격이 낮아지는 변화', 4, 440),
    ('MARGIN_DECLINE', '마진 하락', 'earnings', 'negative', '매출총이익률이나 영업이익률이 낮아지는 변화', 5, 450),
    ('COST_INCREASE', '원가 상승', 'pricing', 'negative', '원재료나 생산 비용이 높아져 수익성에 부담이 생기는 변화', 4, 460),
    ('PRODUCTION_DISRUPTION', '생산 차질', 'supply', 'negative', '설비, 인력 또는 공급망 문제로 계획 생산이 지연되는 상태', 5, 470),
    ('DEMAND_SLOWDOWN', '수요 둔화', 'growth', 'negative', '시장 주문과 소비 증가 속도가 낮아지는 변화', 5, 480),
    ('COMPETITION_INTENSIFIES', '경쟁 심화', 'risk', 'negative', '경쟁사 증가나 가격 경쟁으로 점유율과 마진 압력이 커지는 상태', 4, 490),
    ('CUSTOMER_DEFECTION', '고객사 이탈', 'risk', 'negative', '기존 고객이 거래를 축소하거나 경쟁사로 이동하는 사건', 5, 500),

    ('ORDER_BACKLOG', '수주잔고', 'orders', 'catalyst', '아직 매출로 인식되지 않은 계약 잔액', 5, 610),
    ('NEW_ORDER', '신규 수주', 'orders', 'catalyst', '새롭게 체결된 제품 또는 서비스 공급 계약', 5, 620),
    ('SUPPLY_CONTRACT', '공급계약', 'orders', 'catalyst', '제품이나 서비스를 정해진 조건으로 공급하기로 한 계약', 5, 630),
    ('LONG_TERM_CONTRACT', '장기계약', 'orders', 'catalyst', '여러 기간에 걸쳐 매출 가시성을 제공하는 계약', 4, 640),
    ('INVENTORY_ADJUSTMENT', '재고 조정', 'supply', 'catalyst', '산업 참여자가 적정 수준으로 재고를 줄이거나 늘리는 과정', 4, 650),
    ('GROWTH_RATE', '성장률', 'growth', 'catalyst', '매출, 이익 또는 시장 규모가 일정 기간 동안 변한 비율', 4, 660),
    ('HIGH_GROWTH', '고성장', 'growth', 'catalyst', '비교 대상보다 높은 속도로 매출이나 이익이 증가하는 상태', 4, 670),
    ('CAPACITY_EXPANSION', '증설', 'supply', 'catalyst', '설비 투자를 통해 생산 능력을 확대하는 활동', 5, 680),
    ('UTILIZATION_RATE', '가동률', 'supply', 'catalyst', '보유 생산 능력 중 실제로 가동한 비율', 4, 690),
    ('YIELD_RATE', '수율', 'supply', 'catalyst', '투입량 대비 정상 제품으로 생산된 비율', 5, 700),
    ('ORDER', '수주', 'orders', 'catalyst', '고객으로부터 제품 또는 서비스 주문을 계약으로 확보한 상태', 4, 710),
    ('MASS_PRODUCTION', '양산', 'growth', 'catalyst', '개발 단계를 지나 상업 규모로 제품을 생산하는 단계', 5, 720),
    ('SHIPMENT_VOLUME', '출하량', 'growth', 'catalyst', '고객이나 유통망으로 실제 출고된 제품 물량', 4, 730),
    ('SALES_VOLUME', '판매량', 'growth', 'catalyst', '일정 기간 동안 판매된 제품의 수량', 4, 740),
    ('MOMENTUM', '모멘텀', 'growth', 'catalyst', '실적이나 기업가치 변화를 촉발할 사건과 추세', 3, 750),
    ('NEW_BUSINESS', '신사업', 'growth', 'catalyst', '기존 사업 외에 새롭게 추진하는 수익 사업', 4, 760),
    ('NEW_PRODUCT', '신제품', 'growth', 'catalyst', '새로 출시하거나 출시를 준비하는 제품', 4, 770),
    ('COMMERCIALIZATION', '상용화', 'growth', 'catalyst', '기술이나 제품이 실제 판매와 매출 단계에 진입하는 과정', 5, 780),
    ('CLINICAL_TRIAL', '임상', 'clinical', 'catalyst', '의약품과 의료기기의 안전성과 유효성을 사람에게 검증하는 시험', 5, 790),
    ('APPROVAL', '승인', 'clinical', 'catalyst', '규제기관 또는 고객이 제품과 절차의 사용을 공식 허용한 상태', 5, 800),
    ('LICENSE', '허가', 'clinical', 'catalyst', '사업, 제품 또는 의약품의 판매와 사용에 필요한 공식 허가', 5, 810),
    ('CAPEX', 'CAPEX', 'growth', 'catalyst', '생산설비와 장기 자산에 투입하는 자본적 지출', 4, 820),
    ('MOU', 'MOU', 'growth', 'catalyst', '본계약 전에 협력 의사를 확인하는 양해각서', 3, 830),
    ('PENETRATION_RATE', '침투율', 'growth', 'catalyst', '전체 잠재 시장 중 제품이나 서비스가 실제 채택된 비율', 4, 840)
)
INSERT INTO public.tbm_fnguide_keyword_dictionary (
    keyword_code,
    keyword,
    category_code,
    signal_type,
    meaning,
    investment_implication,
    importance_level,
    display_order,
    source_basis,
    created_by,
    updated_by
)
SELECT
    keyword_code,
    keyword,
    category_code,
    signal_type,
    meaning,
    CASE signal_type
        WHEN 'positive' THEN
            '긍정 신호지만 발생 시점, 지속 기간, 실적 반영 규모를 함께 확인해야 한다.'
        WHEN 'negative' THEN
            '부정 신호의 원인이 일시적인지 구조적인지와 실적 추정치 반영 여부를 함께 확인해야 한다.'
        ELSE
            '방향이 자동으로 확정되는 표현은 아니므로 규모, 계약 조건, 일정과 실제 매출·이익 연결성을 확인해야 한다.'
    END,
    importance_level,
    display_order,
    '2026-06-06 운영 PostgreSQL FnGuide 요약 9,732건 전수 분석 및 투자 리서치 문맥 분류',
    'codex_seed',
    'codex_seed'
FROM seed
ON CONFLICT (keyword_code) DO UPDATE SET
    keyword = EXCLUDED.keyword,
    category_code = EXCLUDED.category_code,
    signal_type = EXCLUDED.signal_type,
    meaning = EXCLUDED.meaning,
    investment_implication = EXCLUDED.investment_implication,
    importance_level = EXCLUDED.importance_level,
    display_order = EXCLUDED.display_order,
    source_basis = EXCLUDED.source_basis,
    is_active = TRUE,
    updated_by = 'codex_seed';

COMMIT;

BEGIN;

WITH normalized_reports AS MATERIALIZED (
    SELECT regexp_replace(lower(coalesce(summary_text, '')), '\s+', '', 'g') AS body
    FROM public.tbl_fnguide_report_summaries
),
keyword_stats AS (
    SELECT
        d.keyword_id,
        count(*) FILTER (WHERE position(d.normalized_keyword IN r.body) > 0)::INTEGER
            AS matched_report_count,
        coalesce(sum(
            CASE
                WHEN position(d.normalized_keyword IN r.body) > 0 THEN
                    (
                        length(r.body)
                        - length(replace(r.body, d.normalized_keyword, ''))
                    ) / length(d.normalized_keyword)
                ELSE 0
            END
        ), 0)::INTEGER AS occurrence_count
    FROM public.tbm_fnguide_keyword_dictionary d
    CROSS JOIN normalized_reports r
    GROUP BY d.keyword_id
)
UPDATE public.tbm_fnguide_keyword_dictionary d
SET
    matched_report_count = s.matched_report_count,
    occurrence_count = s.occurrence_count,
    analyzed_at = now(),
    updated_by = 'full_db_analysis'
FROM keyword_stats s
WHERE d.keyword_id = s.keyword_id;

COMMIT;
