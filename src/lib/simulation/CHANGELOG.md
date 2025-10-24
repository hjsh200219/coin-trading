# 시뮬레이션 로직 변경 내역

## 📅 2025-10-24

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
  
