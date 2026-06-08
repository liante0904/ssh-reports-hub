# 📊 장기 운영을 위한 LLM 혼동 코딩 포인트 분석 보고서 (LLM Coding Pitfalls)

본 문서는 대규모 언어 모델(LLM)을 사용하여 지속적으로 코드를 수정하거나 기능을 개발할 때, LLM이 실수하기 쉬운 고질적인 패턴과 구조적 특징들을 분석하여 장애를 예방하기 위해 작성되었습니다.

---

## 1. ⚠️ Layout Overflow (Flexbox 자식 요소의 `min-width` 간과)

### 🔍 장애 유발 상황
`display: flex` 혹은 `display: inline-flex` 컨테이너 내부에서 텍스트가 가로 길이를 채우고 더 나아가 부모 레이아웃을 뚫고 화면 밖으로 이탈하는 현상입니다.

### ❌ LLM의 흔한 착각과 오답
LLM은 보통 텍스트가 바깥으로 삐져나갈 때, 단순하게 텍스트 컨테이너나 그 부모에게 다음과 같은 스타일을 제시하곤 합니다.
```css
/* ❌ 해결되지 않는 오답 */
.summary-text {
  width: 100%;
  max-width: 100%;
}
```
* **동작하지 않는 이유**: Flexbox 구조 하에서 플렉스 자식 아이템(Flex Item)은 최소 너비(`min-width`) 속성의 기본값이 `auto`로 작동합니다. 이는 하위 내용물(텍스트나 이미지)의 고유 크기 이하로 줄어들지 않겠다는 뜻이므로, `width: 100%`를 주더라도 내용물 길이만큼 강제로 너비가 늘어나게 됩니다.

### ✅ 확실한 방어 전략
1. **이중 개행 규칙 지정 (권장)**: 영어 단어, 링크 주소, 숫자 등이 공백 없이 길게 나열되는 경우를 포함하여 어떤 상황에서도 부모의 폭을 넘어서는 순간 무조건 줄바꿈이 일어나도록 만듭니다.
   ```css
   .summary-text {
     word-break: break-all;     /* 문자 단위 개행 */
     overflow-wrap: break-word; /* 표준 개행 속성 */
   }
   ```
2. **플렉스 아이템 최소 너비 리셋**: 자식 아이템이 부모 너비 안으로 줄어들 수 있도록 강제합니다.
   ```css
   .summary-inner {
     min-width: 0;
   }
   ```

---

## 2. 🔄 React Infinite Re-rendering (이벤트 핸들러 실행 시점 혼동)

### 🔍 장애 유발 상황
페이지가 로딩되자마자 브라우저 탭이 먹통이 되거나 "Maximum update depth exceeded" 에러가 콘솔에 찍히며 폭사하는 치명적인 장애입니다.

### ❌ LLM의 흔한 착각과 오답
LLM은 인자를 넘겨주어야 하는 이벤트 핸들러를 바인딩할 때, 자바스크립트의 실행 시점을 종종 혼동합니다.
```jsx
/* ❌ 치명적 무한 루프 장애 코드 */
<span className="ai-badge" onClick={onToggleSummary(id)}>
  AI 요약
</span>
```
* **동작하지 않는 이유**: 위 코드는 클릭 시 함수를 실행하라는 의미가 아니라, **렌더링하는 시점에 즉시 `onToggleSummary(id)`를 호출**하라는 자바스크립트 문법입니다. 호출된 함수가 부모 컴포넌트의 State를 업데이트하면 React는 재렌더링을 시도하고, 렌더링하면서 다시 이 함수를 즉각 호출하게 되어 결국 무한 루프에 빠집니다.

### ✅ 확실한 방어 전략
반드시 익명의 화살표 함수나 별도의 바인딩용 래퍼 함수를 제공하여, 실제 "클릭(Click) 이벤트가 발생했을 때만" 호출되도록 해야 합니다.
```jsx
/* ✅ 안전한 바인딩 코드 */
<span className="ai-badge" onClick={() => onToggleSummary(id)}>
  AI 요약
</span>
```

---

## 3. 💥 Null / Undefined 런타임 크래시 (Optional Chaining 누락)

### 🔍 장애 유발 상황
서버로부터 비동기 상태로 데이터를 받아오는 로딩 도중이거나, API 스펙에 없는 데이터가 들어왔을 때 프론트엔드가 하얗게 죽어버리는 현상(White Screen of Death)입니다.

### ❌ LLM의 흔한 착각과 오답
LLM은 데이터가 항상 완벽하게 들어올 것이라는 긍정적이고 정형화된 응답 객체를 상정하고 코딩하는 습관이 있습니다.
```jsx
/* ❌ API 지연 로딩 시 에러로 화면이 즉시 폭사함 */
<div>{fnguide_summary.summary_text}</div>
```
* **동작하지 않는 이유**: 서버 통신이 완료되지 않아 `fnguide_summary`가 아직 `null`이거나 `undefined`인 상태에서 내부 프로퍼티인 `summary_text`를 읽으려고 하면 JS 엔진은 즉시 실행을 중단하고 치명적 오류를 내뿜습니다.

### ✅ 확실한 방어 전략
1. **Optional Chaining (`?.`) 사용 습관화**:
   ```jsx
   <div>{fnguide_summary?.summary_text}</div>
   ```
2. **논리곱 연산자(`&&`)를 이용한 선제 조건부 렌더링**:
   ```jsx
   {hasFnguideSummary && (
     <div className="summary-text">{fnguide_summary.summary_text}</div>
   )}
   ```

---

## 4. 🔗 Markdown 파서와 Raw Text 개행의 혼용 실패

### 🔍 장애 유발 상황
줄바꿈(`\n`)이 포함된 데이터가 출력될 때 줄바꿈이 모두 무시된 채 한 줄로 길게 뭉개져 출력되거나, 반대로 파싱할 필요가 없는 텍스트를 마크다운 파서에 강제로 밀어넣어 깨진 문자가 화면에 출력되는 가독성 장애입니다.

### ❌ LLM의 흔한 착각과 오답
데이터가 어떻게 저장되고 가공되는지에 대한 맥락을 잊어버리고, 데이터 파싱 방식을 단일화하거나 적절하지 않은 CSS를 부여합니다.
* 마크다운 형식으로 작성된 AI 요약(`gemini_summary`)을 일반 `div`에 그대로 렌더링하면 개행이 무시되어 가독성이 심각해집니다.
* 일반 줄바꿈 텍스트 데이터(`fnguide_summary.summary_text`)를 무작정 마크다운 컴포넌트에 통과시키면 마크다운의 특수문자 규칙과 꼬여 렌더링이 비정상적으로 흘러갑니다.

### ✅ 확실한 방어 전략
* **구조화된 마크다운 데이터**: `ReactMarkdown`과 GFM(Github Flavored Markdown) 플러그인을 결합하여 올바르게 서식을 렌더링해야 합니다.
  ```jsx
  <ReactMarkdown remarkPlugins={[remarkGfm]}>
    {gemini_summary}
  </ReactMarkdown>
  ```
* **일반 텍스트 데이터**: `white-space: pre-wrap` 스타일과 함께 단순 바인딩하여 텍스트 파일 고유의 줄바꿈 문자를 그대로 살려 보여줍니다.
  ```jsx
  <div style={{ whiteSpace: 'pre-wrap' }}>
    {fnguide_summary.summary_text}
  </div>
  ```

---

## 5. 🏷️ CSS 클래스 중복과 글로벌 오염 (Style Collision)

### 🔍 장애 유발 상황
A 컴포넌트의 특정 스타일을 수정했는데 뜬금없이 아무 관련 없는 B 화면의 컴포넌트 스타일이 일그러지는 기이한 레이아웃 부작용(Side Effect)입니다.

### ❌ LLM의 흔한 착각과 오답
LLM은 특정 컴포넌트를 수정할 때 해당 스코프만을 생각하고 전역 CSS 파일에 일반 셀렉터를 과감하게 사용하곤 합니다.
```css
/* ❌ 다른 뷰의 일반 문맥 영역까지 글씨 크기를 0.95em으로 강제 축소하게 됨 */
p {
  font-size: 0.95em;
}
```

### ✅ 확실한 방어 전략
1. **스코프의 범위를 컴포넌트 구조 하위로 제한**:
   ```css
   /* ✅ 오직 요약 섹션 내부의 텍스트에만 해당 속성이 한정됨 */
   .summary-inner .summary-text {
     word-break: break-all;
   }
   ```
2. **React CSS Modules 혹은 CSS 변수(`var()`)의 엄격한 상속 구조 설계**:
   글로벌 공통 클래스는 최소화하고 테마나 전역 스타일은 변수를 통해 공유하며, 각 컴포넌트는 격리된 네임스페이스를 활용하도록 유도합니다.
