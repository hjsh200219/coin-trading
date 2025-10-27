# Trading Simulation - 시스템 문서

## 📁 파일 구조

```
src/lib/simulation/
├── README.md              # 시스템 문서
├── constants.ts          # 상수 중앙 관리
├── tradingRules.ts       # 매수/매도 로직
└── tradingSimulation.ts  # 시뮬레이션 실행

src/lib/utils/
└── ranking.ts            # Ranking Value 계산 (Z-Score, 슬라이딩 윈도우)

public/
└── simulation-worker.js  # Web Worker (백그라운드 실행)
```

---

## 🎯 핵심 구성요소

### 1. Ranking Value 계산 (Z-Score 기반)

**공식:**
```
Ranking Value = Z(MACD) + Z(RSI) + Z(AO) + Z(DP) + Z(RTI)
Z-Score = (현재값 - 평균) / 표준편차
```

**슬라이딩 윈도우 방식:**
- 각 시점마다 **이전 1000개 데이터**로 평균/표준편차 계산
- **미래 데이터를 사용하지 않음** (No Look-Ahead Bias)
- 실제 거래 환경과 동일한 조건

**구현 위치:**
- `src/lib/utils/ranking.ts` - Ranking Analysis 페이지
- `public/simulation-worker.js` - Trading Simulation

---

### 2. 타임프레임별 시뮬레이션 간격

| 메인 타임프레임 | 시뮬레이션 간격 | 배수 |
|------------------|------------------|------|
| 1일봉 | 5분봉 | 288배 |
| 4시간봉 | 1분봉 | 240배 |
| 2시간봉 | 1분봉 | 120배 |
| 1시간봉 | 1분봉 | 60배 |
| 30분봉 | 1분봉 | 30배 |

**구현:**
```typescript
// constants.ts
export const SIMULATION_TIMEFRAME_MAP = {
  '1d': '5m',   // 1일봉 → 5분봉
  '4h': '1m',   // 4시간봉 → 1분봉
  // ...
}

// ranking.ts - 헬퍼 함수
getSimulationTimeFrame(timeFrame)  // 시뮬레이션 간격 반환
getSimulationMultiplier(timeFrame) // 배수 반환
```

---

### 3. 매수/매도 로직

**매수 조건:**
```typescript
const recentValues = rankingValues.slice(i - buyConditionCount, i)
const min = Math.min(...recentValues)
const buyCondition = currentValue - min

if (buyCondition > buyThreshold) {
  // 매수 실행
}
```

**매도 조건:**
```typescript
const recentValues = rankingValues.slice(i - sellConditionCount, i)
const max = Math.max(...recentValues)
const sellCondition = currentValue - max

if (sellCondition < sellThreshold) {  // sellThreshold는 음수
  // 매도 실행
}
```

**임계값 범위:**
- 매수 임계값: 0.0 ~ 2.0 (절대값)
- 매도 임계값: -2.0 ~ 0.0 (음수)

---

### 4. 주요 상수

```typescript
// constants.ts
export const INITIAL_CAPITAL = 1000000        // 초기 자본 (100만원)
export const MAX_LOOKBACK_PERIOD = 120        // 최대 lookback
export const THRESHOLD_STEP = 0.01            // 임계값 단위
export const LOOKBACK_WINDOW = 1000           // 슬라이딩 윈도우 크기
export const BATCH_SIZE = 10                  // UI 업데이트 배치 크기
export const UI_UPDATE_DELAY = 1              // UI 업데이트 딜레이
```

---

## 🔄 시뮬레이션 프로세스

### 1. 데이터 준비
```typescript
// 필요한 캔들 개수 자동 계산
const requiredCandles = calculateRequiredCandles(period, timeFrame)
// = 분석 기간 + 지표 계산용(150) + 슬라이딩 윈도우용(1000)

// 예: 3개월, 4시간봉 → 540 + 150 + 1000 = 1690개
```

### 2. 지표 계산
```typescript
// 각 시점마다 전체 데이터로 지표 계산
for (let i = 0; i < candles.length; i++) {
  const candlesUpToNow = candles.slice(0, i + 1)
  macd[i] = calculateMACD(candlesUpToNow)
  rsi[i] = calculateRSI(candlesUpToNow)
  // ...
}
```

### 3. Ranking Value 계산 (슬라이딩 윈도우)
```typescript
for (let i = 0; i < candles.length; i++) {
  // 이전 1000개 데이터로 윈도우 생성
  const windowStart = Math.max(0, i - LOOKBACK_WINDOW)
  const macdWindow = macd.slice(windowStart, i)
  
  // 윈도우 통계 계산
  const mean = calculateAverage(macdWindow)
  const stdDev = calculateStdDevP(macdWindow)
  
  // Z-Score 계산
  rankingValue += calculateZScore(macd[i], mean, stdDev)
  // 다른 지표들도 동일...
}
```

### 4. 매매 시뮬레이션
```typescript
// 초기 설정
let position = createInitialPosition('cash', initialPrice)
const trades = []

// 각 시점마다 매수/매도 판단
for (let i = startIndex; i < candles.length; i++) {
  // 현금 보유 중 → 매수 판단
  if (position.position === POSITION_NONE) {
    const recentValues = rankingValues.slice(i - buyConditionCount, i)
    if (checkBuyCondition(recentValues, rankingValue, buyThreshold)) {
      position = executeBuy(position, currentPrice)
      trades.push({ action: 'buy', ... })
    }
  }
  
  // 코인 보유 중 → 매도 판단
  if (position.position === POSITION_LONG) {
    const recentValues = rankingValues.slice(i - sellConditionCount, i)
    if (checkSellCondition(recentValues, rankingValue, sellThreshold)) {
      position = executeSell(position, currentPrice)
      trades.push({ action: 'sell', ... })
    }
  }
}

// 최종 수익률 계산
const totalReturn = calculateTotalReturn(position)
```

### 5. Grid Simulation (최적 파라미터 탐색)
```typescript
// 지표를 한 번만 계산하고 캐싱 (성능 최적화)
const cachedRankingValues = calculateAllRankingValues(candles)

// 모든 임계값 조합 테스트
for (buyThreshold = 0.0; buyThreshold <= 2.0; buyThreshold += 0.01) {
  for (sellThreshold = -2.0; sellThreshold <= 0.0; sellThreshold += 0.01) {
    const result = runTradingSimulation({
      buyThreshold,
      sellThreshold,
      cachedRankingValues  // 캐시 재사용
    })
    results.push(result)
  }
}

// 최고 수익률 조합 찾기
const bestResult = findBestResult(results)
```

---

## ⚙️ Web Worker 동기화

**주의사항:**
- Worker는 TypeScript 모듈을 import할 수 없음
- `constants.ts`와 `tradingRules.ts` 로직을 **수동 동기화** 필요

**동기화 프로세스:**
1. `constants.ts` 수정 → `simulation-worker.js` 동일하게 수정
2. `tradingRules.ts` 수정 → `simulation-worker.js` 동일하게 수정
3. 테스트: TypeScript 결과와 Worker 결과 일치 확인

---

## 📋 개발 체크리스트

### 로직 변경 시
- [ ] `constants.ts` 수정
- [ ] `tradingRules.ts` 수정
- [ ] `simulation-worker.js` 동기화
- [ ] `npx tsc --noEmit` (타입 체크)
- [ ] `npm run lint` (린트 체크)
- [ ] 시뮬레이션 테스트
- [ ] Worker 결과 일치 확인

---

## 📚 상세 문서

- **구현 로직 가이드**: `.docs/implementation-guide.md`
- **지표 레퍼런스**: `.docs/indicator.md`
- **TradingView 지표**: `.docs/20251014_tradingview_indicators.md`
