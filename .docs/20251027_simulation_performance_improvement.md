# Simulation Performance Improvement PRD

**문서 버전:** 1.1  
**작성일:** 2025-10-27  
**최종 수정:** 2025-10-27  
**상태:** Draft

**변경 이력:**
- v1.1 (2025-10-27): Phase 0 추가 - Detail Simulation 캐시 공유로 50배 개선
- v1.0 (2025-10-27): 초기 문서 작성

---

## 📋 요약 (Executive Summary)

### 목적
Trading Simulation의 실행 속도를 개선하여 사용자 경험을 향상시키고, 더 많은 시뮬레이션 조합을 빠르게 테스트할 수 있도록 한다.

### 현재 문제점
- Grid Simulation (40,401개 조합) 실행 시 **5~10분** 소요
- 대용량 데이터(1690개 캔들 × 타임프레임별 시뮬레이션 캔들) 처리 시 **메모리 부담**
- 슬라이딩 윈도우 통계 계산의 **반복적인 연산**
- 사용자는 결과를 기다리는 동안 **진행 상황만 확인 가능**

### 목표
- Grid Simulation 실행 시간: **5~10분 → 2~3분** (50% 개선)
- 실시간 점진적 결과 표시로 **체감 속도 향상**
- 메모리 사용량 **30% 절감**
- 코드 가독성 및 유지보수성 유지

---

## 🎯 문제 정의 (Problem Statement)

### 현재 시스템 분석

#### 1. 성능 병목 지점

**측정 기준:**
```
총 실행 시간: 100% 기준

1. 데이터 로딩: 5%
   - 메인 캔들 가져오기
   - 시뮬레이션 캔들 가져오기

2. 지표 계산: 10%
   - MACD, RSI, AO, DP, RTI 계산
   - 각 시점마다 전체 데이터로 계산

3. Ranking Value 계산 (슬라이딩 윈도우): 25%
   - 각 시점마다 1000개 윈도우 통계 계산
   - 평균/표준편차 반복 계산
   - Z-Score 계산

4. Grid Simulation: 60%
   - 40,401개 조합 (201 buy × 201 sell)
   - 각 조합마다 전체 시뮬레이션 실행
```

#### 2. 구체적 문제점

**A. 슬라이딩 윈도우 통계 계산 (25%)**
```typescript
// 현재: 각 시점마다 1000개 평균/표준편차 재계산
for (let i = 0; i < candles.length; i++) {
  const windowStart = Math.max(0, i - LOOKBACK_WINDOW)
  const macdWindow = macd.slice(windowStart, i)
  
  // ❌ 매번 1000개 합산 반복
  const mean = calculateAverage(macdWindow)  // O(1000)
  const stdDev = calculateStdDevP(macdWindow) // O(1000)
  
  // 5개 지표 × N개 시점 = 매우 많은 연산
}

// 문제:
// - 1개 시점: 1000개 + 1000개 = 2000번 연산 (5개 지표면 10,000번)
// - 1690개 시점: 10,000 × 1690 = 16,900,000번 연산
```

**B. Grid Simulation 순차 실행 (60%)**
```typescript
// 현재: 40,401개 조합을 순차 실행
for (buyThreshold = 0.0; buyThreshold <= 2.0; buyThreshold += 0.01) {
  for (sellThreshold = -2.0; sellThreshold <= 0.0; sellThreshold += 0.01) {
    // ❌ 순차 실행 - 병렬화 불가능한 구조
    const result = runTradingSimulation(...)
    results.push(result)
  }
}

// 문제:
// - 싱글 스레드 순차 처리
// - CPU 멀티코어 활용 불가
```

**C. 메모리 비효율**
```typescript
// 현재: 전체 데이터를 메모리에 유지
const mainCandles = [...]        // 1690개
const simulationCandles = [...]  // 288배 (1일봉 기준) = 486,720개
const indicatorArrays = {
  macd: [...],   // 486,720개
  rsi: [...],    // 486,720개
  ao: [...],     // 486,720개
  dp: [...],     // 486,720개
  rti: [...]     // 486,720개
}

// 문제:
// - 시뮬레이션 캔들 × 5개 지표 = 2,433,600개 숫자 메모리 유지
// - 약 20MB 메모리 사용 (1개 시뮬레이션 기준)
```

**D. 상세결과(Detail) 성능 문제 - 캐시 미활용** ⚠️ **중요 발견!**

Grid Simulation과 Detail Simulation의 로직을 분석한 결과, **동일한 계산을 중복으로 수행**하고 있음을 발견했습니다.

```typescript
// ❌ 현재: Detail은 Grid의 결과를 재사용하지 않음

// Grid Simulation (빠름)
const indicatorArrays = calculateAllIndicatorArrays(simCandles, indicators)  // 1회 계산
const cachedIndicatorValues = []
for (let i = 0; i < simCandles.length; i++) {
  cachedIndicatorValues.push(calculateRankingValueZScoreSliding(...))  // 캐시 저장
}

// 40,401개 조합에서 캐시 재사용 ✅
for (buyThreshold...) {
  for (sellThreshold...) {
    runTradingSimulation(..., cachedIndicatorValues)  // 캐시 재사용!
  }
}

// Detail Simulation (느림) - 사용자가 셀 클릭할 때마다 실행
// ❌ 데이터 재로드 (10~20초)
const mainCandles = await fetch(`/api/.../candles/...`)
const simulationCandles = await fetchMultipleSimulationCandles(...)

// ❌ 지표 재계산 (2~3초)
const indicatorArrays = calculateAllIndicatorArrays(simCandles, indicators)  // 또 계산
const indicatorValues = []
for (let i = 0; i < simCandles.length; i++) {
  indicatorValues.push(calculateRankingValueZScoreSliding(...))  // 또 계산
}

// ❌ 1회 사용 후 버림
runDetailedSimulation(..., indicatorValues)
```

**문제점:**
1. ❌ **데이터 중복 로드**: Grid에서 이미 로드한 데이터를 Detail에서 다시 로드 (10~20초 낭비)
2. ❌ **지표 중복 계산**: Grid에서 이미 계산한 지표를 Detail에서 다시 계산 (2~3초 낭비)
3. ❌ **캐시 미공유**: Grid의 `cachedIndicatorValues`를 Detail이 재사용하지 않음
4. ⚠️ **로직은 동일**: Ranking Value 계산 로직은 100% 동일하므로 결과도 동일

**실제 영향:**
```
Grid Simulation 완료 후 Detail 클릭 시:
- 현재: 15~25초 소요 (데이터 재로드 + 지표 재계산)
- 개선 시: 0.5초 이하 (캐시 재사용)
→ 50배 개선 가능! ⚡
```

**증거:**
```javascript
// simulation-worker.js

// Grid: Line 718-738
const indicatorArrays = calculateAllIndicatorArrays(simCandles, indicators)
const cachedIndicatorValues = []
for (let i = 0; i < simCandles.length; i++) {
  cachedIndicatorValues.push(calculateRankingValueZScoreSliding(i, indicatorArrays, indicators))
}
// → 40,401개 조합에 재사용 ✅

// Detail: Line 872-878
const indicatorArrays = calculateAllIndicatorArrays(simCandles, indicators)
const indicatorValues = []
for (let i = 0; i < simCandles.length; i++) {
  indicatorValues.push(calculateRankingValueZScoreSliding(i, indicatorArrays, indicators))
}
// → 1회 사용 후 버림 ❌

// 사용하는 함수는 완전히 동일!
// - calculateAllIndicatorArrays() - 동일
// - calculateRankingValueZScoreSliding() - 동일
// - 결과값도 100% 동일
```

#### 3. 사용자 경험 문제

- ❌ 5~10분 대기 후 한 번에 결과 표시
- ❌ 진행률만 표시 (실제 결과는 모름)
- ❌ 중간에 좋은 결과가 나와도 끝까지 기다려야 함
- ❌ 취소 후 재시작 시 처음부터 다시 시작

---

## 💡 해결 방안 (Solution)

### Phase 0: Detail Simulation 캐시 공유 (우선순위: 최우선) 🔥

**목표:** Grid Simulation의 계산 결과를 Detail Simulation에서 재사용하여 **즉시 상세결과 표시**

#### 0.1 문제 현황

```typescript
// ❌ 현재: Grid와 Detail이 독립적으로 실행
Grid 완료 (1분) → 사용자가 셀 클릭 → Detail 시작 (15~25초 대기) → 결과 표시
                                    ↑
                                데이터 재로드 + 지표 재계산
```

#### 0.2 개선 방안

**A. UI 레벨: Grid 데이터 캐시 저장**

```typescript
// TradingSimulationContent.tsx

// 1. Grid 데이터 캐시 State 추가
const [gridDataCache, setGridDataCache] = useState<{
  mainCandles: Candle[]
  simulationCandles: Candle[]
  cachedIndicatorValues: number[]
  config: {
    indicators: IndicatorConfig
    buyConditionCount: number
    sellConditionCount: number
    initialPosition: 'cash' | 'coin'
    baseDate: string
    period: Period
  }
} | null>(null)

// 2. Grid 완료 시 캐시 저장
const setupWorkerHandlers = (worker: Worker) => {
  worker.onmessage = (e) => {
    const { type, results, cachedIndicatorValues } = e.data
    
    if (type === 'COMPLETE') {
      // ✅ Worker에서 cachedIndicatorValues 받아서 저장
      setGridDataCache({
        mainCandles,
        simulationCandles,
        cachedIndicatorValues,  // ⚡ 캐시 저장!
        config: {
          indicators,
          buyConditionCount,
          sellConditionCount,
          initialPosition,
          baseDate,
          period
        }
      })
      
      setResults(results)
      // ...
    }
  }
}

// 3. Detail 클릭 시 캐시 확인
const handleCellClick = async (buyThreshold, sellThreshold) => {
  const cacheKey = `${buyThreshold}-${sellThreshold}`
  
  // 메모리 캐시 확인 (기존)
  if (detailsCache.has(cacheKey)) {
    // 즉시 표시
    return
  }
  
  // ✅ Grid 데이터 캐시 확인 (신규)
  if (gridDataCache) {
    // 데이터 재로드 없이 즉시 Worker에 전송!
    workerRef.current.postMessage({
      type: 'GET_DETAIL',
      data: {
        mainCandles: gridDataCache.mainCandles,           // ⚡ 캐시 재사용
        simulationCandles: gridDataCache.simulationCandles, // ⚡ 캐시 재사용
        cachedIndicatorValues: gridDataCache.cachedIndicatorValues, // ⚡ 캐시 재사용
        buyConditionCount: gridDataCache.config.buyConditionCount,
        sellConditionCount: gridDataCache.config.sellConditionCount,
        buyThreshold,
        sellThreshold,
        indicators: gridDataCache.config.indicators,
        initialPosition: gridDataCache.config.initialPosition,
        baseDate: gridDataCache.config.baseDate,
        period: gridDataCache.config.period
      }
    })
    
    // 로딩 표시 (하지만 즉시 완료됨)
    setIsDetailLoading(true)
    return
  }
  
  // 캐시 없으면 기존 로직 (데이터 재로드)
  // ...
}
```

**B. Worker 레벨: 캐시 파라미터 추가**

```javascript
// simulation-worker.js

// Grid 완료 시 cachedIndicatorValues 반환
function runGridSimulation(...) {
  // ... 기존 로직 ...
  
  // 완료 시 캐시도 함께 전송
  self.postMessage({
    type: 'COMPLETE',
    results: results,
    buyThresholds: buyThresholds,
    sellThresholds: sellThresholds,
    cachedIndicatorValues: cachedIndicatorValues  // ⚡ 캐시 전송!
  })
}

// Detail 실행 시 cachedIndicatorValues 파라미터 추가
function runDetailedSimulation(
  mainCandles,
  simulationCandles,
  buyConditionCount,
  sellConditionCount,
  buyThreshold,
  sellThreshold,
  indicators,
  initialPosition = 'cash',
  baseDate = null,
  period = null,
  cachedIndicatorValues = null  // ⚡ 캐시 파라미터 추가!
) {
  const simCandles = generateSimulationCandles(mainCandles, simulationCandles)
  
  // ✅ 캐시가 있으면 즉시 사용!
  const indicatorValues = cachedIndicatorValues || (() => {
    // 캐시 없으면 계산 (기존 로직)
    const indicatorArrays = calculateAllIndicatorArrays(simCandles, indicators)
    const values = []
    for (let i = 0; i < simCandles.length; i++) {
      values.push(calculateRankingValueZScoreSliding(i, indicatorArrays, indicators))
    }
    return values
  })()
  
  // ... 나머지 로직 동일 ...
}
```

#### 0.3 효과

```
Before (현재):
Grid 완료 → 셀 클릭 → [데이터 로드 10~20초] → [지표 계산 2~3초] → 결과 표시
총 시간: 15~25초

After (캐시 공유):
Grid 완료 → 셀 클릭 → [캐시 재사용 0.1초] → 결과 표시
총 시간: 0.5초 이하 ⚡

개선율: 50배 빠름!
```

**추가 이점:**
- ✅ **네트워크 요청 0회**: API 호출 없음
- ✅ **CPU 연산 최소화**: 지표 재계산 없음
- ✅ **메모리 효율**: 이미 로드된 데이터 재사용
- ✅ **즉각 반응**: 사용자가 여러 셀을 빠르게 탐색 가능

**구현 난이도:**
- 🟢 **낮음**: 기존 캐싱 로직 활용 (detailsCache와 유사)
- 🟢 **영향 범위 작음**: UI와 Worker 파라미터만 수정
- 🟢 **테스트 용이**: 결과는 100% 동일해야 함

---

### Phase 1: 통계 계산 최적화 (우선순위: 높음)

#### 1.1 증분 통계 (Incremental Statistics)

**개념:**
- 슬라이딩 윈도우에서 오래된 값 제거, 새로운 값 추가
- 전체 재계산 대신 차이만 계산

**구현:**
```typescript
// ✅ 개선: 증분 방식
class IncrementalStats {
  private window: number[] = []
  private sum = 0
  private sumSquares = 0
  private readonly maxSize: number
  
  constructor(maxSize: number) {
    this.maxSize = maxSize
  }
  
  // O(1) - 상수 시간!
  add(value: number) {
    this.window.push(value)
    this.sum += value
    this.sumSquares += value * value
    
    // 윈도우 크기 초과 시 가장 오래된 값 제거
    if (this.window.length > this.maxSize) {
      const removed = this.window.shift()!
      this.sum -= removed
      this.sumSquares -= removed * removed
    }
  }
  
  // O(1) - 상수 시간!
  getMean(): number {
    return this.sum / this.window.length
  }
  
  // O(1) - 상수 시간!
  getStdDev(): number {
    const n = this.window.length
    const mean = this.getMean()
    const variance = (this.sumSquares / n) - (mean * mean)
    return Math.sqrt(variance)
  }
}

// 사용
const macdStats = new IncrementalStats(LOOKBACK_WINDOW)
for (let i = 0; i < macd.length; i++) {
  macdStats.add(macd[i])
  
  if (i >= LOOKBACK_WINDOW) {
    // ✅ O(1) - 즉시 계산!
    const mean = macdStats.getMean()
    const stdDev = macdStats.getStdDev()
  }
}
```

**효과:**
- **연산 복잡도:** O(N × 1000) → O(N × 1) = **1000배 개선**
- **실행 시간:** 25% → **0.025%** (약 1000배 빨라짐)
- **체감:** 슬라이딩 윈도우 계산이 거의 즉시 완료

#### 1.2 SIMD (Single Instruction Multiple Data) 활용

**개념:**
- JavaScript TypedArray 사용
- 브라우저의 최적화된 메모리 연산 활용

**구현:**
```typescript
// ✅ 개선: TypedArray 사용
const macdArray = new Float64Array(candles.length)
const rsiArray = new Float64Array(candles.length)
// ...

// 메모리 정렬 및 캐시 효율성 향상
// 브라우저가 자동으로 SIMD 최적화 적용
```

**효과:**
- 메모리 사용량 **20% 절감**
- 캐시 히트율 향상으로 **10~15% 속도 개선**

---

### Phase 2: 병렬 처리 (우선순위: 중간)

#### 2.1 Multi-Worker 아키텍처

**개념:**
- Grid Simulation을 여러 Worker로 분산
- CPU 코어 수만큼 Worker 생성

**구현:**
```typescript
// ✅ 개선: Worker Pool 패턴
class WorkerPool {
  private workers: Worker[] = []
  private queue: Task[] = []
  private results: Result[] = []
  
  constructor(workerCount: number = navigator.hardwareConcurrency || 4) {
    for (let i = 0; i < workerCount; i++) {
      const worker = new Worker('/simulation-worker.js')
      worker.onmessage = (e) => this.handleResult(e)
      this.workers.push(worker)
    }
  }
  
  async runGridSimulation(data: SimulationData): Promise<Result[]> {
    // 40,401개 조합을 workerCount개로 분할
    const chunks = this.splitIntoChunks(data, this.workers.length)
    
    // 각 Worker에 청크 할당
    const promises = chunks.map((chunk, i) => 
      this.assignToWorker(this.workers[i], chunk)
    )
    
    // 모든 Worker 완료 대기
    const results = await Promise.all(promises)
    return results.flat()
  }
}

// 사용
const pool = new WorkerPool(4)  // 4개 Worker
const results = await pool.runGridSimulation(data)
```

**효과:**
- **실행 시간:** 60% → **15%** (4코어 기준, 4배 개선)
- **총 시뮬레이션 시간:** 5~10분 → **2~3분**

#### 2.2 청크 단위 처리

**구현:**
```typescript
// 40,401개를 4개 Worker로 분할
// Worker 1: buy 0.00~0.50 × sell -2.00~0.00 (10,100개)
// Worker 2: buy 0.51~1.00 × sell -2.00~0.00 (10,100개)
// Worker 3: buy 1.01~1.50 × sell -2.00~0.00 (10,100개)
// Worker 4: buy 1.51~2.00 × sell -2.00~0.00 (10,101개)
```

---

### Phase 3: 점진적 결과 표시 (우선순위: 높음)

#### 3.1 실시간 Best Result 업데이트

**개념:**
- 배치마다 현재까지의 최고 결과 표시
- 사용자는 기다리는 동안 실시간으로 개선되는 결과 확인

**구현:**
```typescript
// ✅ 개선: 배치마다 Best Result 전송
let bestResult = { totalReturn: -Infinity, ...initialResult }

for (let i = 0; i < results.length; i++) {
  const result = runTradingSimulation(...)
  
  // 더 좋은 결과 발견 시 즉시 업데이트
  if (result.totalReturn > bestResult.totalReturn) {
    bestResult = result
    
    // ✅ 즉시 UI 업데이트
    self.postMessage({
      type: 'BEST_RESULT_UPDATE',
      bestResult,
      progress: (i / results.length) * 100
    })
  }
  
  // 진행률 업데이트 (기존)
  if (i % BATCH_SIZE === 0) {
    self.postMessage({
      type: 'PROGRESS',
      progress: (i / results.length) * 100
    })
  }
}
```

**UI 구현:**
```typescript
// ✅ UI: 실시간 최고 결과 카드
<Card>
  <h3>현재 최고 결과 (진행 중...)</h3>
  <div className="animate-pulse">
    <p>수익률: {bestResult.totalReturn.toFixed(2)}%</p>
    <p>매수 임계값: {bestResult.buyThreshold}</p>
    <p>매도 임계값: {bestResult.sellThreshold}</p>
    <p>거래 횟수: {bestResult.tradeCount}회</p>
  </div>
  <Progress value={progress} />
  <p className="text-sm text-gray-500">
    계속해서 더 좋은 조합을 찾고 있습니다...
  </p>
</Card>
```

**효과:**
- **체감 속도:** 기다림이 지루하지 않음
- **사용자 신뢰:** 실제로 작동 중임을 확인
- **조기 종료 가능:** 만족스러운 결과 발견 시 중단 가능

#### 3.2 히트맵 점진적 렌더링

**구현:**
```typescript
// ✅ 개선: 청크 단위 히트맵 업데이트
const heatmapData = Array(201).fill(null).map(() => Array(201).fill(null))

// 100개마다 히트맵 업데이트
if (currentIteration % 100 === 0) {
  self.postMessage({
    type: 'HEATMAP_CHUNK',
    data: currentChunk,
    progress: (currentIteration / totalIterations) * 100
  })
}
```

**효과:**
- 히트맵이 **실시간으로 채워지는 모습** 확인
- 어느 영역이 좋은 결과를 내는지 **즉시 파악**

---

### Phase 4: 메모리 최적화 (우선순위: 낮음)

#### 4.1 데이터 압축

**구현:**
```typescript
// ✅ 개선: 필요한 데이터만 유지
interface CompactCandle {
  t: number  // timestamp
  c: number  // close만 유지 (대부분의 지표는 close만 사용)
}

// Float32Array 사용 (Float64 대신)
const closeArray = new Float32Array(candles.map(c => c.close))
```

**효과:**
- 메모리 사용량 **40% 절감**

#### 4.2 Lazy Evaluation

**구현:**
```typescript
// ✅ 개선: 필요할 때만 계산
class LazyIndicator {
  private cache = new Map<number, number>()
  
  getValue(index: number): number {
    if (!this.cache.has(index)) {
      this.cache.set(index, this.calculate(index))
    }
    return this.cache.get(index)!
  }
}
```

---

## 📊 성능 개선 목표

### Before (현재)

| 항목 | 시간 | 비율 |
|------|------|------|
| 데이터 로딩 | 30초 | 5% |
| 지표 계산 | 1분 | 10% |
| Ranking Value 계산 | 2.5분 | 25% |
| Grid Simulation | 6분 | 60% |
| **총 시간** | **10분** | **100%** |

### After (목표)

| 항목 | 시간 | 비율 | 개선율 |
|------|------|------|--------|
| 데이터 로딩 | 30초 | 16% | - |
| 지표 계산 | 1분 | 33% | - |
| Ranking Value 계산 | **2초** | 1% | **75배** ⚡ |
| Grid Simulation | **1분** | 33% | **6배** ⚡ |
| **총 시간** | **3분** | **100%** | **3.3배** ⚡ |

**핵심 개선:**
- 슬라이딩 윈도우: 2.5분 → 2초 (증분 통계)
- Grid Simulation: 6분 → 1분 (4-Worker 병렬화)

---

## 🏗️ 구현 계획

### Phase 0: Detail 캐시 공유 (3일) 🔥 **최우선!**

**Day 1:**
- [ ] Worker: `runGridSimulation`에서 `cachedIndicatorValues` 반환 추가
- [ ] Worker: `runDetailedSimulation`에 `cachedIndicatorValues` 파라미터 추가
- [ ] Worker: 캐시가 있으면 재사용, 없으면 계산하는 로직

**Day 2:**
- [ ] UI: `gridDataCache` State 추가
- [ ] UI: Grid 완료 시 캐시 저장 로직
- [ ] UI: Detail 클릭 시 캐시 확인 및 재사용 로직
- [ ] 기존 로직과 호환성 유지 (캐시 없으면 기존 방식)

**Day 3:**
- [ ] 테스트: 캐시 사용 시 결과가 기존과 동일한지 검증
- [ ] 성능 측정: 15~25초 → 0.5초 확인
- [ ] 에러 처리: 캐시 무효화 조건 처리
- [ ] 문서 업데이트

**검증:**
- Detail 클릭 시 즉시 (0.5초 이하) 결과 표시
- 캐시 사용 시와 미사용 시 결과 100% 일치
- 설정 변경 시 캐시 무효화 확인

**효과:**
- ⚡ Detail 속도: **50배 개선** (15~25초 → 0.5초)
- 🎯 **체감 속도 극대화**: Grid 완료 후 즉시 탐색 가능
- 💰 **비용 대비 효과 최고**: 3일 작업으로 50배 개선

---

### Phase 1: 증분 통계 (1주)

**Week 1:**
- [ ] `IncrementalStats` 클래스 구현
- [ ] 단위 테스트 작성
- [ ] `ranking.ts`에 적용
- [ ] `simulation-worker.js`에 적용
- [ ] 기존 결과와 일치 확인

**검증:**
- 기존 방식과 결과 100% 일치
- 실행 시간 측정 (2.5분 → 2초 확인)

---

### Phase 2: Worker Pool (1주)

**Week 2:**
- [ ] `WorkerPool` 클래스 구현
- [ ] 청크 분할 로직
- [ ] Worker 간 통신 프로토콜
- [ ] UI 연동
- [ ] 에러 핸들링

**검증:**
- 4개 Worker로 4배 속도 개선 확인
- 모든 Worker 정상 종료 확인

---

### Phase 3: 실시간 결과 표시 (3일)

**Week 3:**
- [ ] Best Result 실시간 업데이트
- [ ] 히트맵 점진적 렌더링
- [ ] UI 컴포넌트 개선
- [ ] 로딩 애니메이션

**검증:**
- UX 개선 확인 (사용자 피드백)

---

### Phase 4: 메모리 최적화 (선택)

**Week 4 (Optional):**
- [ ] TypedArray 적용
- [ ] 메모리 프로파일링
- [ ] 최적화

---

## 📈 측정 지표 (Metrics)

### 1. 성능 지표

```typescript
// 측정 코드
const startTime = performance.now()

// 슬라이딩 윈도우 계산
const rankingValues = calculateRankingValues(candles)

const endTime = performance.now()
console.log(`Ranking Value 계산: ${endTime - startTime}ms`)
```

**목표:**
- Ranking Value 계산: 150초 → **2초** (75배 개선)
- Grid Simulation: 360초 → **60초** (6배 개선)
- 총 시간: 600초 → **180초** (3.3배 개선)

### 2. 메모리 지표

```typescript
// Chrome DevTools Memory Profiler
// Heap Snapshot 비교

Before: 120MB
After: 80MB (30% 절감)
```

### 3. 사용자 경험 지표

- ✅ 실시간 결과 확인 가능
- ✅ 체감 대기 시간 감소
- ✅ 중간 결과 활용 가능

---

## ⚠️ 위험 요소 (Risks)

### 1. 기술적 위험

**A. 증분 통계의 정확도**
- **위험:** 부동소수점 오차 누적
- **완화:** 
  - 주기적으로 전체 재계산 (1000개마다)
  - 단위 테스트로 오차 범위 검증 (< 0.01%)

**B. Worker Pool 복잡도**
- **위험:** Worker 간 동기화 오류
- **완화:**
  - 철저한 에러 핸들링
  - Worker 상태 모니터링
  - 타임아웃 처리

**C. 브라우저 호환성**
- **위험:** 일부 브라우저에서 Worker 제한
- **완화:**
  - Feature Detection
  - Fallback to single Worker

### 2. 일정 위험

- Phase 1-2는 필수 (3주)
- Phase 3-4는 선택 (1주)
- 여유 버퍼: 1주

---

## 🎯 성공 기준 (Success Criteria)

### Must Have (필수)

1. ✅ **Detail Simulation 즉시 표시** (Phase 0) 🔥
   - Before: 15~25초 (데이터 재로드 + 지표 재계산)
   - After: 0.5초 이하 (캐시 재사용)
   - 개선율: **50배**

2. ✅ Grid Simulation 실행 시간 **50% 이상 단축**
   - Before: 5~10분
   - After: 2~5분

3. ✅ 기존 결과와 **100% 일치**
   - 동일한 입력 → 동일한 출력
   - 단위 테스트로 검증
   - 캐시 사용 시에도 동일한 결과

4. ✅ 안정성 유지
   - 에러율 0%
   - 모든 브라우저에서 정상 작동
   - 캐시 무효화 정상 작동

### Should Have (권장)

5. ✅ 실시간 Best Result 표시
   - 배치마다 업데이트
   - 사용자 체감 속도 향상

6. ✅ 메모리 사용량 **30% 절감**
   - Before: 120MB
   - After: 80MB

### Nice to Have (선택)

7. ⭕ 히트맵 점진적 렌더링
8. ⭕ 취소 후 이어서 실행 기능

---

## 📚 참고 자료

### 증분 통계 알고리즘
- [Welford's Online Algorithm](https://en.wikipedia.org/wiki/Algorithms_for_calculating_variance#Welford's_online_algorithm)
- [Incremental Statistics](https://www.johndcook.com/blog/standard_deviation/)

### Web Worker 최적화
- [MDN: Using Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers)
- [Worker Pool Pattern](https://developer.chrome.com/blog/worker-pool/)

### SIMD in JavaScript
- [TypedArray Performance](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Typed_arrays)
- [SIMD.js (experimental)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SIMD)

---

## 📝 부록

### A. 증분 통계 수학적 증명

**평균 (Mean):**
```
새 평균 = (이전 합 - 제거된 값 + 새 값) / 윈도우 크기
```

**분산 (Variance):**
```
새 분산 = (이전 제곱합 - 제거된 값² + 새 값²) / 윈도우 크기 - (새 평균)²
```

### B. Worker Pool 구현 예시

```typescript
class WorkerPool {
  private workers: Worker[] = []
  private taskQueue: Task[] = []
  private activeWorkers = 0
  
  constructor(size: number) {
    for (let i = 0; i < size; i++) {
      this.workers.push(this.createWorker())
    }
  }
  
  private createWorker(): Worker {
    const worker = new Worker('/simulation-worker.js')
    worker.onmessage = (e) => {
      this.handleResult(e.data)
      this.activeWorkers--
      this.processQueue()
    }
    return worker
  }
  
  async execute(tasks: Task[]): Promise<Result[]> {
    this.taskQueue = [...tasks]
    return new Promise((resolve) => {
      this.onComplete = resolve
      this.processQueue()
    })
  }
  
  private processQueue() {
    while (this.activeWorkers < this.workers.length && this.taskQueue.length > 0) {
      const task = this.taskQueue.shift()!
      const worker = this.workers[this.activeWorkers]
      worker.postMessage(task)
      this.activeWorkers++
    }
  }
}
```

---

## ✅ 체크리스트

### 개발 전
- [ ] PRD 검토 및 승인
- [ ] 성능 벤치마크 기준 설정
- [ ] 단위 테스트 계획 수립

### 개발 중
- [ ] 증분 통계 구현 및 테스트
- [ ] Worker Pool 구현 및 테스트
- [ ] UI 개선 및 테스트
- [ ] 성능 측정 및 비교

### 개발 후
- [ ] 코드 리뷰
- [ ] 크로스 브라우저 테스트
- [ ] 성능 목표 달성 확인
- [ ] 문서 업데이트
- [ ] 배포 및 모니터링

