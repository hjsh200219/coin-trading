# 시뮬레이션 로직 변경 내역

## 📅 2025-10-27 (주요 업데이트)

### 🎯 슬라이딩 윈도우 방식으로 Ranking Value 계산 변경 ⭐⭐⭐

#### **변경 이유**
기존 방식은 **전체 시뮬레이션 기간의 통계를 고정**하여 사용했기 때문에 **미래 데이터를 사용**하는 Look-Ahead Bias 문제가 있었습니다.

**문제점 (기존 방식):**
```
시뮬레이션 기간: 7월 1일 ~ 10월 1일

1. 전체 기간(7/1~10/1)의 평균/표준편차를 한 번만 계산
2. 모든 시점에서 동일한 통계 사용

7월 1일 시점:
- 7/1~10/1 전체 평균/표준편차로 계산 ❌
- 7월 2일, 8월 1일, ... 10월 1일의 "미래 데이터"를 이미 알고 있음
- 실제 거래에서는 불가능한 계산
```

**해결 (슬라이딩 윈도우 방식):**
```
시뮬레이션 기간: 7월 1일 ~ 10월 1일

각 시점마다 이전 1000개 데이터의 평균/표준편차를 계산

7월 1일: 직전 1000개 (약 1/15~7/1) 데이터로 계산 ✅
8월 1일: 직전 1000개 (약 2/14~8/1) 데이터로 계산 ✅
10월 1일: 직전 1000개 (약 4/16~10/1) 데이터로 계산 ✅

→ 각 시점에서 실제로 알 수 있는 데이터만 사용
→ 실제 거래 환경과 동일한 조건
```

#### **구현 내용**

**1. constants.ts - 슬라이딩 윈도우 크기 상수 추가**
```typescript
export const LOOKBACK_WINDOW = 1000  // Z-Score 계산용 슬라이딩 윈도우
// 4시간봉: 1000개 = 약 168일
// 2시간봉: 1000개 = 약 84일
// 1시간봉: 1000개 = 약 42일
// 30분봉: 1000개 = 약 21일
```

**2. ranking.ts - 슬라이딩 윈도우 방식으로 변경**
```typescript
// 각 시점마다
for (let i = 0; i < candles.length; i++) {
  // 이전 1000개 데이터로 슬라이딩 윈도우 생성
  const windowStart = Math.max(0, i - LOOKBACK_WINDOW)
  const macdWindow = macdValues.slice(windowStart, i)
  
  // 이 윈도우의 통계 계산
  const macdMean = calculateAverage(macdWindow)
  const macdStd = calculateStdDevP(macdWindow)
  
  // 현재 시점의 Z-Score 계산
  rankingValue += calculateZScore(macdValues[i], macdMean, macdStd)
  
  // 다른 지표들도 동일...
}
```

**3. simulation-worker.js - 슬라이딩 윈도우 함수 추가**
```javascript
// 새로운 함수: calculateRankingValueZScoreSliding
function calculateRankingValueZScoreSliding(index, indicatorArrays, indicators) {
  const windowStart = Math.max(0, index - LOOKBACK_WINDOW)
  
  // 각 지표의 윈도우 데이터로 통계 계산
  const macdWindow = indicatorArrays.macd.slice(windowStart, index)
  const macdMean = calculateAverage(macdWindow)
  const macdStd = calculateStdDevP(macdWindow)
  
  // Z-Score 계산 및 합산
  rankingValue += calculateZScore(indicatorArrays.macd[index], macdMean, macdStd)
  // ...
}
```

**4. 적용 범위**
- ✅ `src/lib/simulation/constants.ts` - LOOKBACK_WINDOW 상수 추가
- ✅ `src/lib/utils/ranking.ts` - Ranking Analysis 페이지
- ✅ `public/simulation-worker.js` - Trading Simulation
  - `runGridSimulation()` - 그리드 시뮬레이션
  - `runDetailedSimulation()` - 상세 시뮬레이션
- ✅ `src/lib/simulation/README.md` - 문서 업데이트

#### **핵심 차이점**

| 항목 | 기존 방식 | 슬라이딩 윈도우 방식 |
|------|-----------|---------------------|
| **평균/표준편차** | 전체 기간 고정 | 각 시점 이전 1000개 |
| **7월 1일 통계** | 7/1~10/1 전체 | 직전 1000개 (1/15~7/1) |
| **8월 1일 통계** | 7/1~10/1 전체 (동일) | 직전 1000개 (2/14~8/1) |
| **미래 데이터** | ⚠️ 사용함 (Look-Ahead Bias) | ✅ 사용 안 함 |
| **실전 적용** | ❌ 불가능 (백테스팅용) | ✅ 가능 (실시간 적용) |

#### **기대 효과**

1. **No Look-Ahead Bias** ✅
   - 각 시점에서 실제로 알 수 있는 정보만 사용
   - 백테스팅 결과가 실전 성능과 일치

2. **실전 거래 가능** ✅
   - 실시간 거래에 직접 적용 가능
   - 과거 1000개 데이터만 있으면 Ranking Value 계산 가능

3. **적응적 통계** ✅
   - 시장 상황 변화에 따라 통계도 변화
   - 최근 시장 트렌드 반영

4. **정확한 성능 측정** ✅
   - 실제 거래 환경과 동일한 조건
   - 과최적화(Overfitting) 방지

#### **데이터 자동 확보** ⭐

`calculateRequiredCandles()` 함수가 슬라이딩 윈도우를 위한 데이터를 자동으로 계산합니다:

```typescript
// 수정 전
return periodCandles + 150  // 분석 기간 + 지표 계산용만

// 수정 후
return periodCandles + 150 + 1000  // 분석 기간 + 지표 계산용 + 슬라이딩 윈도우용
```

**예시 (3개월, 4시간봉):**
```
분석 기간: 90일 = 540개
지표 계산용: 150개
슬라이딩 윈도우용: 1000개
--------------------------
총 필요: 1690개 (자동 계산) ✅

시뮬레이션 시작 시점부터 1000개 데이터 보장!
```

**적용 파일:**
- ✅ `src/lib/utils/ranking.ts` - `calculateRequiredCandles()`
- ✅ `src/lib/api/candleApi.ts` - `calculateRequiredCandles()` (하위 호환)
- ✅ `src/app/simulation/[symbol]/RankingAnalysisContent.tsx` - 자동 적용
- ✅ `src/app/simulation/[symbol]/TradingSimulationContent.tsx` - 자동 적용

#### **주의사항**

1. **초기 데이터 부족 문제 해결됨** ✅
   - `calculateRequiredCandles()` 함수가 1000개 추가로 계산
   - 시뮬레이션 시작부터 충분한 데이터 확보
   - 최소 10개 이상 필요 (통계 계산용) - 자동 보장

2. **성능 영향**
   - 각 시점마다 통계를 재계산하므로 약간 느려질 수 있음
   - 하지만 실전 적용 가능성이 더 중요

3. **기존 결과와 차이**
   - 슬라이딩 윈도우 방식으로 변경 후 시뮬레이션 결과가 달라질 수 있음
   - 새로운 결과가 더 정확하고 신뢰할 수 있음

#### **검증 방법**

```javascript
// 특정 시점의 슬라이딩 윈도우 확인
const index = 1500
const windowStart = Math.max(0, index - LOOKBACK_WINDOW)
console.log(`시점 ${index}의 윈도우: ${windowStart} ~ ${index}`)
console.log(`윈도우 크기: ${index - windowStart}개`)

// 통계 확인
const macdWindow = indicatorArrays.macd.slice(windowStart, index)
console.log('MACD 평균:', calculateAverage(macdWindow))
console.log('MACD 표준편차:', calculateStdDevP(macdWindow))
```

---

## 📅 2025-10-24 (오후)

### 🔧 추가 수정: 지표 계산 방식 통일 (lookback 제거)

#### **문제점 발견**
Trading Simulation에서 각 시점의 지표를 계산할 때 **최근 120개 캔들만** 사용하고 있었음.

**기존 코드:**
```javascript
for (let i = 0; i < candles.length; i++) {
  const lookbackPeriod = Math.min(120, i + 1)  // ❌ 최대 120개만
  const candlesForIndicator = candles.slice(Math.max(0, i - lookbackPeriod + 1), i + 1)
  arrays.macd.push(calculateMACD(candlesForIndicator))  // 120개로 계산
}
```

**문제:**
- 시점 500에서 MACD 계산 시 최근 120개만 사용 (381~500번 캔들)
- 하지만 **처음부터 500번째까지 전체**(1~500번 캔들)를 사용해야 함

#### **수정 내용**

**변경 후:**
```javascript
for (let i = 0; i < candles.length; i++) {
  // 처음(index 0)부터 현재(index i)까지의 모든 캔들 사용 ✅
  const candlesUpToNow = candles.slice(0, i + 1)
  
  if (indicators.macd) {
    arrays.macd.push(calculateMACD(candlesUpToNow))  // 전체 데이터로 계산
  }
  // ... 다른 지표들도 동일
}
```

#### **이제 완전히 일치**

| 시점 | 이전 (lookback 120) | 현재 (전체 데이터) |
|------|-------------------|------------------|
| 100번째 | 1~100 캔들 사용 ✅ | 1~100 캔들 사용 ✅ |
| 500번째 | **381~500만** 사용 ❌ | **1~500 전체** 사용 ✅ |
| 1000번째 | **881~1000만** 사용 ❌ | **1~1000 전체** 사용 ✅ |

#### **기대 효과**

1. **Ranking Analysis와 100% 동일** ✅
   - 같은 데이터에 대해 같은 Ranking Value 보장
   
2. **장기 추세 반영** ✅
   - 전체 기간의 데이터를 고려하므로 더 정확한 지표 값
   
3. **사용자 정의와 완벽 일치** ✅
   - "기준일로부터 이전 기간까지 전체 데이터" 사용

#### **수정 파일**
- ✅ `public/simulation-worker.js` - `calculateAllIndicatorArrays()` 함수

---

### 🎯 주요 변경사항: Z-Score 기반 Ranking Value 계산 통일

#### 1. **Ranking Value 계산 방식 변경** ⭐

**엑셀 공식과 동일하게 구현:**
```excel
=(I11-AVERAGE(I:I))/STDEV.P(I:I)
 +(J11-AVERAGE(J:J))/STDEV.P(J:J)
 +(K11-AVERAGE(K:K))/STDEV.P(K:K)
 +(L11-AVERAGE(L:L))/STDEV.P(L:L)
 +(M11-AVERAGE(M:M))/STDEV.P(M:M)
```

**변경 전 (Trading Simulation):**
```javascript
// 단순 합산 방식
rankingValue = MACD + (RSI-50) + AO + DP + (RTI-50)
```

**변경 후 (모든 곳에서 동일):**
```typescript
// Z-Score 기반 (엑셀 공식과 동일)
rankingValue = Z(MACD) + Z(RSI) + Z(AO) + Z(DP) + Z(RTI)
// Z-Score = (값 - 평균) / 표준편차
```

#### 2. **구현 내용**

**새로 추가된 함수들 (`public/simulation-worker.js`):**

```javascript
// 1. 통계 함수
function calculateAverage(values)      // 평균 계산
function calculateStdDevP(values)      // 표준편차 계산 (STDEV.P)
function calculateZScore(value, mean, stdDev)  // Z-Score 계산

// 2. 지표 배열 생성
function calculateAllIndicatorArrays(candles, indicators)
// → 전체 캔들에서 각 지표의 값 배열 생성 (엑셀의 I:I, J:J 등)

// 3. 통계 계산
function calculateIndicatorStats(indicatorArrays, indicators)
// → 각 지표의 평균과 표준편차 계산 (AVERAGE(I:I), STDEV.P(I:I))

// 4. Z-Score 기반 Ranking Value
function calculateRankingValueZScore(index, indicatorArrays, stats, indicators)
// → 특정 시점의 Ranking Value를 Z-Score로 계산
```

**적용 범위:**
- ✅ `public/simulation-worker.js` - `runGridSimulation()`
- ✅ `public/simulation-worker.js` - `runDetailedSimulation()`
- ✅ `src/lib/utils/ranking.ts` - 이미 Z-Score 방식 사용 중

#### 3. **계산 프로세스**

**Step 1: 전체 지표 배열 계산**
```javascript
const indicatorArrays = calculateAllIndicatorArrays(fiveMin, indicators)
// {
//   macd: [값1, 값2, 값3, ...],  // I열
//   rsi: [값1, 값2, 값3, ...],   // J열
//   ao: [값1, 값2, 값3, ...],    // K열
//   DP: [값1, 값2, 값3, ...],    // L열
//   rti: [값1, 값2, 값3, ...]    // M열
// }
```

**Step 2: 전체 통계 계산**
```javascript
const stats = calculateIndicatorStats(indicatorArrays, indicators)
// {
//   macd: { mean: AVERAGE(I:I), stdDev: STDEV.P(I:I) },
//   rsi: { mean: AVERAGE(J:J), stdDev: STDEV.P(J:J) },
//   ...
// }
```

**Step 3: 각 시점의 Z-Score 기반 Ranking Value**
```javascript
for (let i = 0; i < fiveMin.length; i++) {
  const rankingValue = calculateRankingValueZScore(i, indicatorArrays, stats, indicators)
  // rankingValue = Z(macd[i]) + Z(rsi[i]) + Z(ao[i]) + Z(DP[i]) + Z(rti[i])
}
```

#### 4. **왜 Z-Score를 사용하는가?**

**문제점 (기존 단순 합산):**
```
MACD: -2.5  (범위: ±수백)
RSI:  45    (범위: 0~100, 조정 후: ±50)
AO:   150   (범위: ±수천)
DP:   2.1   (범위: ±20)
RTI:  52    (범위: 0~100, 조정 후: ±50)

→ AO 값이 압도적으로 크므로 다른 지표의 영향력이 무시됨
```

**해결 (Z-Score 정규화):**
```
Z(MACD): -0.5   (표준편차 단위)
Z(RSI):  -1.2   (표준편차 단위)
Z(AO):    2.0   (표준편차 단위)
Z(DP):    0.3   (표준편차 단위)
Z(RTI):   0.8   (표준편차 단위)

Ranking Value = -0.5 + (-1.2) + 2.0 + 0.3 + 0.8 = 1.4

→ 모든 지표가 동일한 스케일로 비교됨
→ 각 지표가 평균에서 얼마나 벗어났는지 표준편차 단위로 표현
```

#### 5. **기대 효과**

1. **엑셀 공식과 100% 일치** ✅
   - 동일한 데이터에 대해 동일한 결과 보장

2. **정규화된 비교** ✅
   - 각 지표가 동일한 영향력을 가짐
   - 지표의 원래 값 범위에 영향받지 않음

3. **통계적 의미 부여** ✅
   - Z-Score로 "얼마나 비정상적인가" 측정 가능
   - |Z| > 2: 상위/하위 2.5% (극단값)
   - |Z| > 3: 상위/하위 0.15% (매우 극단적)

4. **일관된 로직** ✅
   - Ranking Analysis와 Trading Simulation이 동일한 방식 사용
   - 유지보수 및 디버깅 용이

#### 6. **수정된 파일**

- ✅ `public/simulation-worker.js`
  - 새로운 Z-Score 계산 함수 추가
  - `runGridSimulation()` 수정
  - `runDetailedSimulation()` 수정
- ✅ `src/lib/simulation/README.md`
  - Ranking Value 계산 섹션 추가
  - 엑셀 공식과 TypeScript 구현 설명
- ✅ `src/lib/simulation/CHANGELOG.md`
  - 이 변경 내역 추가

#### 7. **검증 방법**

```javascript
// 1. 지표 배열 확인
console.log('MACD values:', indicatorArrays.macd)
console.log('RSI values:', indicatorArrays.rsi)

// 2. 통계 확인
console.log('MACD stats:', stats.macd)  // { mean: X, stdDev: Y }

// 3. Z-Score 확인
const z = calculateZScore(indicatorArrays.macd[100], stats.macd.mean, stats.macd.stdDev)
console.log('MACD Z-Score at index 100:', z)

// 4. 최종 Ranking Value
console.log('Ranking Value:', rankingValue)
```

---

## 📅 2025-10-24 (오전)

### 🔄 주요 변경사항: 요구사항에 맞춘 매수/매도 로직 수정

#### 1. **매수 조건 수정** ✅

**변경 전:**
```typescript
const buyCondition = min + (Math.abs(min) * buyThreshold)
shouldBuy = currentValue >= buyCondition
```

**변경 후:**
```typescript
const buyCondition = currentValue - min
shouldBuy = buyCondition > buyThreshold
```

**의미:**
- 기존: 최소값에서 임계값만큼의 비율을 더한 값과 비교
- 변경: 현재 값과 최소값의 **차이**가 임계값보다 크면 매수

**예시:**
- `min = -0.5`, `buyThreshold = 0.7`, `currentValue = 0.3`
- 기존 방식: `-0.1 >= -0.5 + 0.35 = -0.15` → 매수함
- 새 방식: `0.3 - (-0.5) = 0.8 > 0.7` → 매수함

---

#### 2. **매도 조건 수정** ✅

**변경 전:**
```typescript
const sellCondition = max - (Math.abs(max) * sellThreshold)
shouldSell = currentValue <= sellCondition
```

**변경 후:**
```typescript
const sellCondition = currentValue - max
shouldSell = sellCondition < sellThreshold
```

**의미:**
- 기존: 최대값에서 임계값만큼의 비율을 뺀 값과 비교
- 변경: 현재 값과 최대값의 **차이**가 임계값(음수)보다 작으면 매도

**예시:**
- `max = 0.8`, `sellThreshold = -0.5`, `currentValue = 0.2`
- 기존 방식: `0.3 <= 0.8 - 0.4 = 0.4` → 매도함
- 새 방식: `0.2 - 0.8 = -0.6 < -0.5` → 매도함

---

#### 3. **초기 포지션 적용** ✅

**추가 기능:**
```typescript
export interface SimulationConfig {
  // ... 기존 필드들
  initialPosition?: 'cash' | 'coin' // 새로 추가
}
```

**적용 방법:**
```typescript
// tradingSimulation.ts
const initialPrice = fiveMin[0].close
let tradingPosition = createInitialPosition(
  config.initialPosition || 'cash',
  initialPrice
)
```

**의미:**
- `'cash'` (기본값): 현금 보유 상태로 시작 → 첫 매수까지 수익률 0%
- `'coin'`: 코인 보유 상태로 시작 → 첫 매도까지 수익률은 홀드 수익률과 동일

---

#### 4. **임계값 범위 명확화** ✅

**매수 임계값:**
- 범위: `0.0 ~ 2.0` (절대값)
- 의미: 현재 값이 최소값보다 이 값만큼 커야 매수 (차이값 기준)

**매도 임계값:**
- 범위: `-2.0 ~ 0.0` (음수)
- 의미: 현재 값이 최대값보다 이 값(음수)만큼 작아야 매도 (차이값 기준)

---

### 📁 수정된 파일 목록

#### TypeScript 파일
1. ✅ `src/lib/simulation/tradingRules.ts`
   - `checkBuyCondition()` 함수 로직 수정
   - `checkSellCondition()` 함수 로직 수정

2. ✅ `src/lib/simulation/tradingSimulation.ts`
   - `SimulationConfig` 인터페이스에 `initialPosition` 필드 추가
   - `runTradingSimulation()` 함수에서 `createInitialPosition()` 사용

3. ✅ `src/lib/simulation/README.md`
   - 매수/매도 로직 설명 업데이트
   - 예시 수정

#### Web Worker 파일
4. ✅ `public/simulation-worker.js`
   - `runTradingSimulation()` 함수의 매수/매도 조건 수정
   - `runDetailedSimulation()` 함수의 매수/매도 조건 수정

#### UI 파일
5. ✅ `src/app/simulation/[symbol]/TradingSimulationContent.tsx`
   - 매수 임계값 검증 로직: `0.0 ~ 1.0` → `0.0 ~ 2.0` 수정
   - 매도 임계값 검증 로직: `0.0 ~ 1.0` → `-2.0 ~ 0.0` 수정
   - 모바일 UI input 필드 max 속성 수정 (매수: 2.0, 매도: 0.0)
   - 데스크톱 UI input 필드 max 속성 수정 (매수: 2.0, 매도: 0.0)
   - 매도 임계값 input 필드 min 속성 수정: `0.0` → `-2.0`

#### 테스트 파일
6. ✅ `tests/simulation-logic.test.ts`
   - 매수 조건 테스트 케이스 수정
   - 매도 조건 테스트 케이스 수정
   - 전체 시뮬레이션 플로우 테스트 수정

---

### ✅ 검증 완료

```bash
# 1. 린트 체크
npm run lint
# ✅ No ESLint warnings or errors

# 2. 타입 체크
npx tsc --noEmit
# ✅ No TypeScript errors

# 3. 빌드 체크
npm run build
# ✅ Compiled successfully
```

---

### 📊 변경 전후 비교

| 항목 | 변경 전 | 변경 후 |
|------|---------|---------|
| 매수 조건 | `currentValue >= min + (|min| × threshold)` | `(currentValue - min) > threshold` |
| 매도 조건 | `currentValue <= max - (|max| × threshold)` | `(currentValue - max) < threshold` |
| 매수 임계값 범위 | 0.0 ~ 1.0 (비율) | 0.0 ~ 2.0 (절대값) |
| 매도 임계값 범위 | 0.0 ~ 1.0 (비율) | -2.0 ~ 0.0 (절대값, 음수) |
| 초기 포지션 | 항상 현금 | 현금 또는 코인 선택 가능 |

---

### 🎯 결론

요구사항에 맞춰 시뮬레이션 로직을 수정했습니다:
1. ✅ 매수/매도 조건이 **차이값 기반**으로 변경
2. ✅ 임계값이 **절대값**으로 변경 (매도는 음수 범위)
3. ✅ **초기 포지션** 선택 기능 추가
4. ✅ TypeScript, Web Worker, 테스트 모두 동기화
5. ✅ 린트, 타입 체크, 빌드 모두 통과

이제 시뮬레이션은 요구사항과 정확히 일치하는 로직으로 작동합니다.

---

## 📅 2025-10-24 (추가)

### 💾 localStorage 자동 저장 기능

#### 구현 내용
사용자가 설정한 값들을 브라우저의 localStorage에 자동으로 저장하고, 페이지를 다시 방문할 때 이전 설정값을 자동으로 불러옵니다.

#### 저장되는 설정값
- **거래소**: exchange (binance, upbit)
- **기간**: period (1M, 3M, 6M, 1Y)
- **타임프레임**: timeFrame (1h, 2h, 4h, 1d)
- **지표 설정**: indicators (macd, rsi, ao, DP, rti)
- **매수 조건 개수**: buyConditionCount
- **매도 조건 개수**: sellConditionCount
- **매수 임계값 범위**: buyThresholdMin, buyThresholdMax
- **매도 임계값 범위**: sellThresholdMin, sellThresholdMax
- **소수점 자릿수**: decimalPlaces (2 또는 3)
- **초기 포지션**: initialPosition (cash 또는 coin)

#### 기술 구현
```typescript
// localStorage 키 생성 (코인별로 구분)
const getStorageKey = (key: string) => `simulation_${symbol}_${key}`

// 초기값 불러오기 (SSR 안전)
const [exchange, setExchange] = useState<Exchange>(() => 
  getStoredValue('exchange', 'binance')
)

// 값 변경 시 자동 저장
useEffect(() => {
  if (typeof window === 'undefined') return
  localStorage.setItem(getStorageKey('exchange'), JSON.stringify(exchange))
}, [exchange, getStorageKey])
```

#### 특징
- ✅ 코인별로 독립적인 설정 저장 (BTC, ETH 등 각각 다른 설정 유지)
- ✅ SSR 안전 (서버 렌더링 시 localStorage 접근 방지)
- ✅ 자동 저장 (설정 변경 시 즉시 저장)
- ✅ 자동 불러오기 (페이지 재방문 시 이전 설정 복원)
- ✅ 기본값 폴백 (저장된 값이 없으면 기본값 사용)

#### 수정된 파일
1. ✅ `src/app/simulation/[symbol]/TradingSimulationContent.tsx`
   - `getStorageKey()` 헬퍼 함수 추가
   - `getStoredValue()` 헬퍼 함수 추가
   - 모든 설정 state에 localStorage 초기값 적용
   - 각 설정값에 대한 useEffect 저장 로직 추가 (12개)

#### 사용자 경험 개선
이제 사용자는 시뮬레이션 설정을 매번 다시 입력할 필요 없이, 이전에 사용했던 설정값이 자동으로 적용됩니다. 각 코인마다 독립적인 설정을 유지하므로, BTC에서 사용한 설정이 ETH 시뮬레이션에 영향을 주지 않습니다.

---

## 📅 2025-10-24 (버그 수정)

### 🐛 홀드 수익률 계산 버그 수정

#### 문제점
초기 포지션이 "현금"인 경우, 첫 매수 전까지 홀드 수익률이 0%가 아닌 값으로 계산되는 문제가 있었습니다.

#### 원인
홀드 수익률 계산 시 항상 시뮬레이션 시작 시점의 가격을 기준으로 계산하고 있었습니다.
```javascript
// 잘못된 코드
const initialPrice = analysisStartPrice  // 항상 시작 시점 가격
const holdReturn = ((currentPrice - initialPrice) / initialPrice) * 100
```

#### 수정 내용
초기 포지션에 따라 홀드 수익률 기준 가격을 다르게 설정:

**초기 포지션이 코인인 경우:**
- 홀드 기준 가격 = 시뮬레이션 시작 시점 가격
- 시작부터 코인을 보유하고 있으므로 시작 시점 가격 기준

**초기 포지션이 현금인 경우:**
- 홀드 기준 가격 = 첫 매수 시점 가격
- 첫 매수 전까지는 홀드 수익률 = 0%
- 첫 매수 이후부터 홀드 수익률 계산 시작

```javascript
// 수정된 코드
let holdBasePrice = null

// 초기 포지션이 코인이면
if (initialPosition === 'coin') {
  holdBasePrice = analysisStartPrice  // 시작 시점 가격
}

// 첫 매수 시
if (buyCondition > config.buyThreshold) {
  // ... 매수 로직
  if (holdBasePrice === null) {
    holdBasePrice = currentPrice  // 첫 매수 가격을 기준으로 설정
  }
}

// 홀드 수익률 계산
let holdReturn = 0
if (holdBasePrice !== null) {
  holdReturn = ((currentPrice - holdBasePrice) / holdBasePrice) * 100
}
```

#### 수정된 파일
1. ✅ `public/simulation-worker.js`
   - `runDetailedSimulation()` 함수의 홀드 수익률 계산 로직 수정
   - `holdBasePrice` 변수 추가 및 초기 포지션에 따른 조건부 설정

#### 결과
- ✅ 초기 포지션이 "현금"인 경우, 첫 매수 전까지 홀드 수익률이 0%로 표시됩니다
- ✅ 첫 매수 시점부터 홀드 수익률이 정확하게 계산됩니다
- ✅ 초기 포지션이 "코인"인 경우, 시작 시점부터 홀드 수익률이 계산됩니다
  
