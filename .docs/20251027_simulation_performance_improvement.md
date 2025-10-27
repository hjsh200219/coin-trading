# Simulation Performance Improvement PRD

**문서 버전:** 1.0  
**작성일:** 2025-10-27  
**상태:** Draft

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

#### 3. 사용자 경험 문제

- ❌ 5~10분 대기 후 한 번에 결과 표시
- ❌ 진행률만 표시 (실제 결과는 모름)
- ❌ 중간에 좋은 결과가 나와도 끝까지 기다려야 함
- ❌ 취소 후 재시작 시 처음부터 다시 시작

---

## 💡 해결 방안 (Solution)

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

1. ✅ Grid Simulation 실행 시간 **50% 이상 단축**
   - Before: 5~10분
   - After: 2~5분

2. ✅ 기존 결과와 **100% 일치**
   - 동일한 입력 → 동일한 출력
   - 단위 테스트로 검증

3. ✅ 안정성 유지
   - 에러율 0%
   - 모든 브라우저에서 정상 작동

### Should Have (권장)

4. ✅ 실시간 Best Result 표시
   - 배치마다 업데이트
   - 사용자 체감 속도 향상

5. ✅ 메모리 사용량 **30% 절감**
   - Before: 120MB
   - After: 80MB

### Nice to Have (선택)

6. ⭕ 히트맵 점진적 렌더링
7. ⭕ 취소 후 이어서 실행 기능

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

