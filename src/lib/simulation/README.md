# Trading Simulation - 중앙화된 로직 관리

## 📁 파일 구조

```
src/lib/simulation/
├── README.md              # 이 파일 (문서)
├── CHANGELOG.md          # 변경 이력
├── constants.ts          # 모든 상수 중앙 관리 ⭐
├── tradingRules.ts       # 매수/매도 로직 중앙 관리 ⭐
└── tradingSimulation.ts  # 시뮬레이션 실행 (TypeScript)

src/lib/utils/
└── ranking.ts            # Ranking Value 계산 (Z-Score 기반) ⭐

public/
└── simulation-worker.js  # Web Worker (JavaScript, 독립 실행)
```

## 🎯 중앙 관리 원칙

### 1. **constants.ts** - 모든 상수 관리
```typescript
// ✅ 여기서 수정하면 전체에 적용됨
export const INITIAL_CAPITAL = 1000000  // 초기 자본
export const MAX_LOOKBACK_PERIOD = 120  // 최대 lookback
export const THRESHOLD_STEP = 0.01      // 임계값 단위
```

**사용처:**
- `tradingSimulation.ts`
- `public/simulation-worker.js` (수동 동기화 필요)

---

### 2. **ranking.ts** - Ranking Value 계산 (Z-Score 기반, 슬라이딩 윈도우) ⭐

**핵심 개념: 슬라이딩 윈도우 방식**
```
각 시점마다 이전 LOOKBACK_WINDOW(1000개) 데이터로 평균/표준편차 계산
→ 미래 데이터를 사용하지 않음 (No Look-Ahead Bias)
→ 실제 거래 환경과 동일한 조건

⭐ 데이터 준비: calculateRequiredCandles() 함수가 자동으로
   분석 기간 + 지표 계산용(150개) + 슬라이딩 윈도우용(1000개)를 계산
→ 시뮬레이션 시작부터 충분한 데이터 확보
```

**TypeScript 구현:**
```typescript
// 1단계: 전체 지표 배열 계산
const indicatorArrays = calculateAllIndicatorArrays(candles, indicators)

// 2단계: 각 시점마다 슬라이딩 윈도우로 Z-Score 계산
for (let i = 0; i < candles.length; i++) {
  // 현재 시점 이전 LOOKBACK_WINDOW(1000개) 데이터
  const windowStart = Math.max(0, i - LOOKBACK_WINDOW)
  const macdWindow = indicatorArrays.macd.slice(windowStart, i)
  
  // 이 윈도우의 통계로 현재 시점의 Z-Score 계산
  const macdMean = calculateAverage(macdWindow)
  const macdStd = calculateStdDevP(macdWindow)
  rankingValue += calculateZScore(indicatorArrays.macd[i], macdMean, macdStd)
  
  // 다른 지표들도 동일...
}
```

**적용 범위:**
- ✅ `src/lib/utils/ranking.ts` - Ranking Analysis 페이지
- ✅ `public/simulation-worker.js` - Trading Simulation

**중요:**
- 각 시점마다 **이전 1000개 데이터**로 평균/표준편차 계산 (슬라이딩 윈도우)
- **미래 데이터를 절대 사용하지 않음** → 실전 거래 가능
- 각 지표를 Z-Score로 정규화하여 동일한 스케일로 비교
- 5개 지표의 Z-Score를 합산하여 최종 Ranking Value 계산
- **각 시점의 지표는 처음부터 해당 시점까지의 전체 데이터로 계산** (lookback 방식 아님)

**데이터 준비:**
- `calculateRequiredCandles()` 함수가 필요한 데이터 자동 계산
- 분석 기간 + 지표 계산용(150개) + 슬라이딩 윈도우용(1000개)
- 시뮬레이션 시작부터 충분한 1000개 데이터 보장

---

### 3. **tradingRules.ts** - 매수/매도 로직 관리
```typescript
// ✅ 매수 비교 범위 판단
export function checkBuyCondition(
  recentValues: number[],
  currentValue: number,
  buyThreshold: number
): BuyCondition

// ✅ 매도 비교 범위 판단
export function checkSellCondition(
  recentValues: number[],
  currentValue: number,
  sellThreshold: number
): SellCondition

// ✅ 매수 실행
export function executeBuy(position, price): TradingPosition

// ✅ 매도 실행
export function executeSell(position, price): TradingPosition
```

**사용처:**
- `tradingSimulation.ts`에서 import하여 사용
- `public/simulation-worker.js`는 동일한 로직을 복사 (⚠️ 수동 동기화 필요)

---

### 3. **tradingSimulation.ts** - 시뮬레이션 실행
```typescript
// ✅ constants와 tradingRules를 import하여 사용
import { INITIAL_CAPITAL, MAX_LOOKBACK_PERIOD, ... } from './constants'
import { checkBuyCondition, checkSellCondition, ... } from './tradingRules'
```

**역할:**
- 지표 계산 (`calculateIndicatorValue`)
- 5분봉 데이터 생성 (`generate5MinCandles`)
- 시뮬레이션 실행 (`runTradingSimulation`)
- 그리드 시뮬레이션 (`runGridSimulation`)

---

### 4. **public/simulation-worker.js** - Web Worker
```javascript
// ⚠️ 주의: Worker는 ES Module import를 사용할 수 없음
// tradingRules.ts와 constants.ts의 로직을 수동으로 복사

// 매수 비교 범위 판단 (tradingRules.checkBuyCondition와 동일)
function checkBuyCondition(recentValues, currentValue, buyThreshold) {
  // ... tradingRules.ts와 동일한 로직
}
```

**⚠️ 중요:**
- Worker는 TypeScript 모듈을 import할 수 없음
- `tradingRules.ts`와 `constants.ts`의 로직을 **수동으로 동기화**해야 함
- 로직 변경 시 **Worker도 함께 업데이트** 필요

---

## 🔄 로직 변경 프로세스

### 상수 변경 (예: 초기 자본 변경)
1. `constants.ts`에서 수정
   ```typescript
   export const INITIAL_CAPITAL = 2000000  // 200만원으로 변경
   ```
2. `public/simulation-worker.js`에서 동일하게 수정
   ```javascript
   const INITIAL_CAPITAL = 2000000  // 200만원으로 변경
   ```

### 매수/매도 로직 변경 (예: 매수 비교 범위 수식 변경)
1. `tradingRules.ts`의 `checkBuyCondition` 함수 수정
   ```typescript
   export function checkBuyCondition(...) {
     // 새로운 로직
     const buyCondition = min + (Math.abs(min) * buyThreshold * 1.1)  // 10% 추가
     return { shouldBuy: currentValue >= buyCondition, ... }
   }
   ```

2. `public/simulation-worker.js`의 동일 함수 수정
   ```javascript
   function checkBuyCondition(...) {
     // 새로운 로직 (위와 동일)
     const buyCondition = min + (Math.abs(min) * buyThreshold * 1.1)
     return { shouldBuy: currentValue >= buyCondition, ... }
   }
   ```

3. 테스트 실행
   ```bash
   npm run dev
   # 시뮬레이션 페이지에서 테스트
   ```

---

## 📋 체크리스트

### 로직 변경 시 확인사항
- [ ] `constants.ts` 수정
- [ ] `tradingRules.ts` 수정
- [ ] `public/simulation-worker.js`에 동일 수정 적용
- [ ] TypeScript 타입 체크 (`npx tsc --noEmit`)
- [ ] Lint 체크 (`npm run lint`)
- [ ] 시뮬레이션 테스트 실행
- [ ] Worker와 TypeScript 결과 일치 확인

---

## 🧪 매수/매도 로직 상세

### 매수 비교 범위 (checkBuyCondition)
```typescript
// 1. 직전 N개의 최소값 구하기
const min = Math.min(...recentValues)

// 2. 현재 값과 최소값의 차이 계산
const buyCondition = currentValue - min

// 3. 차이가 임계값보다 크면 매수
shouldBuy = buyCondition > buyThreshold
```

**예시:**
- `min = -0.5`, `buyThreshold = 0.7`, `currentValue = -0.1`
- `buyCondition = -0.1 - (-0.5) = 0.4`
- `0.4 > 0.7` → **매수 안함** ❌
- `currentValue = 0.3`이면 `0.3 - (-0.5) = 0.8 > 0.7` → **매수함** ✅

### 매도 비교 범위 (checkSellCondition)
```typescript
// 1. 직전 N개의 최대값 구하기
const max = Math.max(...recentValues)

// 2. 현재 값과 최대값의 차이 계산
const sellCondition = currentValue - max

// 3. 차이가 임계값보다 작으면 매도 (임계값은 음수)
shouldSell = sellCondition < sellThreshold
```

**예시:**
- `max = 0.8`, `sellThreshold = -0.5` (음수), `currentValue = 0.3`
- `sellCondition = 0.3 - 0.8 = -0.5`
- `-0.5 < -0.5` → **매도 안함** ❌ (같으므로)
- `currentValue = 0.2`이면 `0.2 - 0.8 = -0.6 < -0.5` → **매도함** ✅

---

## 🚀 성능 최적화

### 지표 캐싱 (runGridSimulation)
```typescript
// ✅ 지표를 한 번만 계산하고 재사용
const cachedIndicatorValues: number[] = []
for (let i = 0; i < fiveMin.length; i++) {
  const lookbackPeriod = Math.min(MAX_LOOKBACK_PERIOD, i + 1)
  const indicatorValue = calculateIndicatorValue(...)
  cachedIndicatorValues.push(indicatorValue)
}

// ✅ 모든 시뮬레이션에서 캐시된 값 재사용
runTradingSimulation(..., cachedIndicatorValues)
```

### 배치 처리
```typescript
// BATCH_SIZE (10)마다 UI 업데이트
if (currentIteration % BATCH_SIZE === 0) {
  onProgress(progress)
  await new Promise(resolve => setTimeout(resolve, UI_UPDATE_DELAY))
}
```

---

## ⚠️ 주의사항

1. **Worker 동기화 필수**
   - Worker는 TypeScript를 import할 수 없으므로 수동 동기화 필요
   - 로직 변경 시 반드시 Worker도 함께 수정

2. **상수 변경 시**
   - `constants.ts`와 `simulation-worker.js` 양쪽 모두 수정
   - 특히 `INITIAL_CAPITAL`, `MAX_LOOKBACK_PERIOD` 등

3. **수식 변경 시**
   - `tradingRules.ts`와 `simulation-worker.js`의 수식이 동일해야 함
   - 테스트로 결과 일치 확인

---

## 📚 참고 자료

- **엑셀 시뮬레이션**: `/sample/NVDL매매점_Min_Max.xlsx`
- **시뮬레이션 설명**: `/sample/시뮬레이션 설명.xlsx`
- **지표 계산**: `src/lib/indicators/calculator.ts`

---

## 🔍 디버깅 팁

### Worker 로직 확인
```javascript
// public/simulation-worker.js
console.log('Buy condition:', {
  min,
  buyCondition,
  currentValue,
  shouldBuy
})
```

### TypeScript 로직 확인
```typescript
// src/lib/simulation/tradingRules.ts
console.log('Buy check:', buyCheck)
```

### 결과 비교
```typescript
// 두 결과가 동일한지 확인
console.log('TypeScript result:', tsResult.totalReturn)
console.log('Worker result:', workerResult.totalReturn)
```

