/* eslint-disable */
/**
 * Trading Simulation Web Worker
 * 백그라운드 스레드에서 시뮬레이션 계산 실행
 * 
 * ⚠️ 중요: 이 파일의 로직은 src/lib/simulation/ 파일들과 동기화되어야 합니다
 * 
 * 중앙 관리 파일:
 * - src/lib/simulation/constants.ts      → 상수 정의
 * - src/lib/simulation/tradingRules.ts   → 매수/매도 로직
 * - src/lib/simulation/README.md         → 전체 문서
 * 
 * Worker는 ES Module import를 사용할 수 없으므로,
 * 로직 변경 시 이 파일도 수동으로 업데이트해야 합니다.
 */

// 메시지 수신
self.onmessage = function(e) {
  const { type, data } = e.data

  if (type === 'START_SIMULATION') {
    try {
      const {
        mainCandles,
        simulationCandles, // 변경: simCandlesCandles → simulationCandles
        buyConditionCount,
        sellConditionCount,
        buyThresholdMin,
        buyThresholdMax,
        sellThresholdMin,
        sellThresholdMax,
        indicators, // 지표 설정 ✨
        decimalPlaces, // 소수점 자릿수 ✨
      initialPosition // 초기 포지션 ✨
    } = data

    // 시뮬레이션 실행
      runGridSimulation(
        mainCandles,
        simulationCandles, // 변경: simCandlesCandles → simulationCandles
        buyConditionCount,
        sellConditionCount,
        buyThresholdMin,
        buyThresholdMax,
        sellThresholdMin,
        sellThresholdMax,
        indicators, // 지표 설정 전달
        decimalPlaces, // 소수점 자릿수 전달
        initialPosition // 초기 포지션 전달
      )
    } catch (error) {
      self.postMessage({
        type: 'ERROR',
        error: error.message
      })
    }
  } else if (type === 'GET_DETAIL') {
    try {
      const {
        mainCandles,
        simulationCandles, // 변경: simCandlesCandles → simulationCandles
        buyConditionCount,
        sellConditionCount,
        buyThreshold,
        sellThreshold,
        indicators,
        initialPosition,
        baseDate,
        period,
        cachedIndicatorValues  // ⚡ Phase 0: 캐시 추가
      } = data
      
      // 상세 내역 생성 (cachedIndicatorValues 전달 - Phase 0) ⚡
      const result = runDetailedSimulation(
        mainCandles,
        simulationCandles, // 변경: simCandlesCandles → simulationCandles
        buyConditionCount,
        sellConditionCount,
        buyThreshold,
        sellThreshold,
        indicators,
        initialPosition,
        baseDate,
        period,
        cachedIndicatorValues  // ⚡ 캐시 전달
      )

      self.postMessage({
        type: 'DETAIL_COMPLETE',
        details: result.details,
        analysisStartPrice: result.analysisStartPrice,
        analysisStartTimestamp: result.analysisStartTimestamp
      })
    } catch (error) {
      self.postMessage({
        type: 'ERROR',
        error: error.message
      })
    }
  }
}

// ===== 상수 정의 (src/lib/simulation/constants.ts와 동기화) =====

/**
 * ⚠️ 주의: 이 상수들은 src/lib/simulation/constants.ts와 동일하게 유지해야 합니다
 */

const INITIAL_CAPITAL = 1000000        // 초기 자본 (100만원)
const MAX_LOOKBACK_PERIOD = 120        // 최대 lookback 기간 (캔들 개수)
const BATCH_SIZE = 10                  // 배치 처리 크기 (진행률 업데이트 간격)
const UI_UPDATE_DELAY = 10             // UI 업데이트 딜레이 (ms)
const THRESHOLD_STEP = 0.01            // 임계값 단위 (0.01 = 1%)
const POSITION_NONE = 0                // 포지션 없음
const POSITION_LONG = 1                // 매수 포지션

// ===== Ranking Value 계산 =====
const LOOKBACK_WINDOW = 1000           // Z-Score 계산용 슬라이딩 윈도우 크기
// 4시간봉: 1000개 = 약 168일
// 2시간봉: 1000개 = 약 84일
// 1시간봉: 1000개 = 약 42일
// 30분봉: 1000개 = 약 21일

// ===== 유틸리티 함수들 =====

/**
 * 시뮬레이션용 캔들 데이터 생성
 * 
 * 타임프레임에 따라 적절한 세밀도의 캔들 데이터 사용:
 * - 1일봉 → 5분봉 시뮬레이션
 * - 4시간봉 → 1분봉 시뮬레이션
 * - 2시간봉 → 1분봉 시뮬레이션
 * - 1시간봉 → 1분봉 시뮬레이션
 * - 30분봉 → 1분봉 시뮬레이션
 */
function generateSimulationCandles(mainCandles, simulationCandles) {
  if (simulationCandles && simulationCandles.length > 0) {
    return simulationCandles
  }
  return []
}

// @deprecated - generateCandleData는 generateSimulationCandles로 대체됨
function generateCandleData(mainCandles, simCandlesCandles) {
  return generateSimulationCandles(mainCandles, simCandlesCandles)
}

// ===== 지표 계산 함수들 =====

/**
 * RSI 계산 (Relative Strength Index)
 */
function calculateRSI(candles) {
  if (candles.length < 15) return 0
  
  try {
    const closes = candles.map(c => c.close)
    const length = closes.length
    
    // 최근 14개의 종가 변화율 계산
    let gains = 0
    let losses = 0
    
    for (let i = length - 14; i < length; i++) {
      const change = closes[i] - closes[i - 1]
      if (change > 0) gains += change
      else losses += Math.abs(change)
    }
    
    const avgGain = gains / 14
    const avgLoss = losses / 14
    
    if (avgLoss === 0) return 100
    
    const rs = avgGain / avgLoss
    const rsi = 100 - (100 / (1 + rs))
    
    return rsi
  } catch (error) {
    return 0
  }
}

/**
 * MACD 히스토그램 계산
 */
function calculateMACD(candles) {
  if (candles.length < 26) return 0
  
  try {
    const closes = candles.map(c => c.close)
    
    // EMA 계산 헬퍼
    function calculateEMA(data, period) {
      const k = 2 / (period + 1)
      let ema = data[0]
      
      for (let i = 1; i < data.length; i++) {
        ema = data[i] * k + ema * (1 - k)
      }
      
      return ema
    }
    
    const ema12 = calculateEMA(closes, 12)
    const ema26 = calculateEMA(closes, 26)
    const macdLine = ema12 - ema26
    
    // 단순화: Signal line을 MACD line의 9-period EMA로 근사
    const signalLine = macdLine * 0.9 // 간단한 근사
    const histogram = macdLine - signalLine
    
    return histogram
  } catch (error) {
    return 0
  }
}

/**
 * AO 계산 (Awesome Oscillator)
 */
function calculateAO(candles) {
  if (candles.length < 34) return 0
  
  try {
    // 중간 가격 계산
    const midPrices = candles.map(c => (c.high + c.low) / 2)
    
    // 5-period SMA
    let sum5 = 0
    for (let i = midPrices.length - 5; i < midPrices.length; i++) {
      sum5 += midPrices[i]
    }
    const sma5 = sum5 / 5
    
    // 34-period SMA
    let sum34 = 0
    for (let i = midPrices.length - 34; i < midPrices.length; i++) {
      sum34 += midPrices[i]
    }
    const sma34 = sum34 / 34
    
    return sma5 - sma34
  } catch (error) {
    return 0
  }
}

/**
 * DP 계산
 */
function calculateDP(candles, period = 20) {
  if (candles.length < period) return 0
  
  try {
    const closes = candles.map(c => c.close)
    const currentPrice = closes[closes.length - 1]
    
    // MA 계산
    let sum = 0
    for (let i = closes.length - period; i < closes.length; i++) {
      sum += closes[i]
    }
    const ma = sum / period
    
    // DP = ((현재가 - MA) / MA) * 100
    const DP = ((currentPrice - ma) / ma) * 100
    
    return DP
  } catch (error) {
    return 0
  }
}

/**
 * RTI 계산 (RTI = RSI로 간소화)
 */
function calculateRTI(candles) {
  return calculateRSI(candles) // RTI는 RSI와 유사하게 처리
}

/**
 * 평균 계산
 */
function calculateAverage(values) {
  if (values.length === 0) return 0
  return values.reduce((sum, val) => sum + val, 0) / values.length
}

/**
 * 표준편차 계산 (STDEV.P - 모집단 표준편차)
 */
function calculateStdDevP(values) {
  if (values.length === 0) return 0
  
  const mean = calculateAverage(values)
  const squaredDiffs = values.map(val => Math.pow(val - mean, 2))
  const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length
  
  return Math.sqrt(variance)
}

/**
 * Z-Score 계산 (표준점수)
 * z-score = (값 - 평균) / 표준편차
 */
function calculateZScore(value, mean, stdDev) {
  if (stdDev === 0) return 0
  return (value - mean) / stdDev
}

/**
 * 전체 캔들 데이터에서 각 지표의 값 배열 계산
 * 엑셀 공식처럼 전체 열(I:I, J:J 등)의 데이터를 생성
 * 
 * ⚠️ 중요: 각 시점의 지표는 "처음부터 해당 시점까지"의 전체 데이터로 계산
 * (최근 N개만 사용하는 lookback 방식이 아님)
 */
function calculateAllIndicatorArrays(candles, indicators) {
  const arrays = {
    macd: [],
    rsi: [],
    ao: [],
    DP: [],
    rti: []
  }
  
  // 각 시점마다 처음부터 현재까지의 데이터로 지표 계산
  for (let i = 0; i < candles.length; i++) {
    // 처음(index 0)부터 현재(index i)까지의 모든 캔들 사용
    const candlesUpToNow = candles.slice(0, i + 1)
    
    if (indicators.macd) {
      arrays.macd.push(calculateMACD(candlesUpToNow))
    }
    if (indicators.rsi) {
      arrays.rsi.push(calculateRSI(candlesUpToNow))
    }
    if (indicators.ao) {
      arrays.ao.push(calculateAO(candlesUpToNow))
    }
    if (indicators.DP) {
      arrays.DP.push(calculateDP(candlesUpToNow, 20))
    }
    if (indicators.rti) {
      arrays.rti.push(calculateRTI(candlesUpToNow))
    }
  }
  
  return arrays
}

/**
 * 각 지표 배열의 통계 계산 (평균, 표준편차)
 */
function calculateIndicatorStats(indicatorArrays, indicators) {
  const stats = {}
  
  if (indicators.macd && indicatorArrays.macd.length > 0) {
    stats.macd = {
      mean: calculateAverage(indicatorArrays.macd),
      stdDev: calculateStdDevP(indicatorArrays.macd)
    }
  }
  
  if (indicators.rsi && indicatorArrays.rsi.length > 0) {
    stats.rsi = {
      mean: calculateAverage(indicatorArrays.rsi),
      stdDev: calculateStdDevP(indicatorArrays.rsi)
    }
  }
  
  if (indicators.ao && indicatorArrays.ao.length > 0) {
    stats.ao = {
      mean: calculateAverage(indicatorArrays.ao),
      stdDev: calculateStdDevP(indicatorArrays.ao)
    }
  }
  
  if (indicators.DP && indicatorArrays.DP.length > 0) {
    stats.DP = {
      mean: calculateAverage(indicatorArrays.DP),
      stdDev: calculateStdDevP(indicatorArrays.DP)
    }
  }
  
  if (indicators.rti && indicatorArrays.rti.length > 0) {
    stats.rti = {
      mean: calculateAverage(indicatorArrays.rti),
      stdDev: calculateStdDevP(indicatorArrays.rti)
    }
  }
  
  return stats
}

/**
 * Z-Score 기반 Ranking Value 계산 (전체 기간 통계 사용 - 구버전)
 * ⚠️ 주의: 이 함수는 하위 호환성을 위해 유지됩니다
 * 새로운 시뮬레이션은 calculateRankingValueZScoreSliding을 사용하세요
 */
function calculateRankingValueZScore(index, indicatorArrays, stats, indicators) {
  let rankingValue = 0
  
  try {
    if (indicators.macd && indicatorArrays.macd[index] !== undefined && stats.macd) {
      rankingValue += calculateZScore(
        indicatorArrays.macd[index],
        stats.macd.mean,
        stats.macd.stdDev
      )
    }
    
    if (indicators.rsi && indicatorArrays.rsi[index] !== undefined && stats.rsi) {
      rankingValue += calculateZScore(
        indicatorArrays.rsi[index],
        stats.rsi.mean,
        stats.rsi.stdDev
      )
    }
    
    if (indicators.ao && indicatorArrays.ao[index] !== undefined && stats.ao) {
      rankingValue += calculateZScore(
        indicatorArrays.ao[index],
        stats.ao.mean,
        stats.ao.stdDev
      )
    }
    
    if (indicators.DP && indicatorArrays.DP[index] !== undefined && stats.DP) {
      rankingValue += calculateZScore(
        indicatorArrays.DP[index],
        stats.DP.mean,
        stats.DP.stdDev
      )
    }
    
    if (indicators.rti && indicatorArrays.rti[index] !== undefined && stats.rti) {
      rankingValue += calculateZScore(
        indicatorArrays.rti[index],
        stats.rti.mean,
        stats.rti.stdDev
      )
    }
    
    return rankingValue
  } catch (error) {
    return 0
  }
}

/**
 * Z-Score 기반 Ranking Value 계산 (슬라이딩 윈도우 방식) ⭐ NEW
 * 
 * 각 시점마다 이전 LOOKBACK_WINDOW(1000개) 데이터로 평균/표준편차 계산
 * ⚠️ 중요: 미래 데이터를 사용하지 않음 (No Look-Ahead Bias)
 * 
 * @param {number} index - 현재 시점 인덱스
 * @param {object} indicatorArrays - 전체 지표 배열 {macd: [], rsi: [], ...}
 * @param {object} indicators - 사용할 지표 설정 {macd: true, rsi: true, ...}
 * @returns {number} - Ranking Value (Z-Score 합산)
 */
function calculateRankingValueZScoreSliding(index, indicatorArrays, indicators) {
  let rankingValue = 0
  
  try {
    // 슬라이딩 윈도우 범위 계산 (현재 시점 이전 LOOKBACK_WINDOW개)
    const windowStart = Math.max(0, index - LOOKBACK_WINDOW)
    const windowSize = index - windowStart
    
    // 최소 데이터 개수 확인 (통계 계산에 최소 10개 필요)
    if (windowSize < 10) {
      return 0
    }
    
    // MACD Z-Score
    if (indicators.macd && indicatorArrays.macd[index] !== undefined) {
      const macdWindow = indicatorArrays.macd.slice(windowStart, index)
      const macdMean = calculateAverage(macdWindow)
      const macdStd = calculateStdDevP(macdWindow)
      
      rankingValue += calculateZScore(
        indicatorArrays.macd[index],
        macdMean,
        macdStd
      )
    }
    
    // RSI Z-Score
    if (indicators.rsi && indicatorArrays.rsi[index] !== undefined) {
      const rsiWindow = indicatorArrays.rsi.slice(windowStart, index)
      const rsiMean = calculateAverage(rsiWindow)
      const rsiStd = calculateStdDevP(rsiWindow)
      
      rankingValue += calculateZScore(
        indicatorArrays.rsi[index],
        rsiMean,
        rsiStd
      )
    }
    
    // AO Z-Score
    if (indicators.ao && indicatorArrays.ao[index] !== undefined) {
      const aoWindow = indicatorArrays.ao.slice(windowStart, index)
      const aoMean = calculateAverage(aoWindow)
      const aoStd = calculateStdDevP(aoWindow)
      
      rankingValue += calculateZScore(
        indicatorArrays.ao[index],
        aoMean,
        aoStd
      )
    }
    
    // DP Z-Score
    if (indicators.DP && indicatorArrays.DP[index] !== undefined) {
      const DPWindow = indicatorArrays.DP.slice(windowStart, index)
      const DPMean = calculateAverage(DPWindow)
      const DPStd = calculateStdDevP(DPWindow)
      
      rankingValue += calculateZScore(
        indicatorArrays.DP[index],
        DPMean,
        DPStd
      )
    }
    
    // RTI Z-Score
    if (indicators.rti && indicatorArrays.rti[index] !== undefined) {
      const rtiWindow = indicatorArrays.rti.slice(windowStart, index)
      const rtiMean = calculateAverage(rtiWindow)
      const rtiStd = calculateStdDevP(rtiWindow)
      
      rankingValue += calculateZScore(
        indicatorArrays.rti[index],
        rtiMean,
        rtiStd
      )
    }
    
    return rankingValue
  } catch (error) {
    return 0
  }
}

function calculateMinMax(values) {
  if (values.length === 0) return { min: 0, max: 0 }
  return {
    min: Math.min(...values),
    max: Math.max(...values)
  }
}

function runTradingSimulation(
  mainCandles,
  simulationCandles,
  config,
  cachedIndicatorValues,
  initialPosition = 'cash'
) {
  const trades = []
  const simCandles = generateSimulationCandles(mainCandles, simulationCandles)
  
  if (simCandles.length === 0) {
    return {
      totalReturn: 0,
      tradeCount: 0,
      trades: [],
      finalBalance: 1000000
    }
  }

  // 초기 포지션 설정
  let position = initialPosition === 'coin' ? 1 : 0
  let balance = 1000000
  let holdings = 0
  let buyPrice = 0
  
  // 코인 보유로 시작하는 경우
  if (initialPosition === 'coin') {
    const firstPrice = simCandles[0].close
    holdings = balance / firstPrice
    balance = 0
    buyPrice = firstPrice
  }

  const indicatorValues = cachedIndicatorValues || []

  const startIndex = Math.max(config.buyConditionCount, config.sellConditionCount)

  for (let i = startIndex; i < simCandles.length; i++) {
    const indicatorValue = indicatorValues[i]
    const currentPrice = simCandles[i].close

    // 매수 비교 범위 체크
    if (position === 0 && i >= config.buyConditionCount) {
      // 현재 값을 제외한 직전 N개 (엑셀 로직)
      const recentValues = indicatorValues.slice(i - config.buyConditionCount, i)
      const { min } = calculateMinMax(recentValues)
      const buyCondition = indicatorValue - min

      if (buyCondition > config.buyThreshold) {
        holdings = balance / currentPrice
        buyPrice = currentPrice
        balance = 0
        position = 1
        trades.push({ 
          timestamp: simCandles[i].timestamp, 
          action: 'buy', 
          price: currentPrice, 
          minValue: min, 
          threshold: config.buyThreshold 
        })
      }
    }

    // 매도 비교 범위 체크
    if (position === 1 && i >= config.sellConditionCount) {
      // 현재 값을 제외한 직전 N개 (엑셀 로직)
      const recentValues = indicatorValues.slice(i - config.sellConditionCount, i)
      const { max } = calculateMinMax(recentValues)
      const sellCondition = indicatorValue - max

      if (sellCondition < config.sellThreshold) {
        balance = holdings * currentPrice
        holdings = 0
        position = 0
        trades.push({ 
          timestamp: simCandles[i].timestamp, 
          action: 'sell', 
          price: currentPrice, 
          maxValue: max, 
          threshold: config.sellThreshold 
        })
      }
    }
  }

  const finalPrice = simCandles[simCandles.length - 1].close
  if (position === 1) {
    balance = holdings * finalPrice
    holdings = 0
  }
  
  const totalReturn = ((balance - 1000000) / 1000000) * 100
  
  return {
    totalReturn,
    tradeCount: trades.length,
    trades,
    finalBalance: balance
  }
}

function runGridSimulation(
  mainCandles,
  simulationCandles,
  buyConditionCount,
  sellConditionCount,
  buyThresholdMin,
  buyThresholdMax,
  sellThresholdMin,
  sellThresholdMax,
  indicators, // 지표 설정 ✨
  decimalPlaces, // 소수점 자릿수 ✨
  initialPosition // 초기 포지션 ✨
) {
  const results = []
  const buyThresholds = []
  const sellThresholds = []
  
  // 소수점 자릿수에 따른 step 결정
  const step = decimalPlaces === 3 ? 0.001 : 0.01
  const multiplier = decimalPlaces === 3 ? 1000 : 100
  
  // 정수 연산으로 부동소수점 오차 방지
  const buyMinInt = Math.round(buyThresholdMin * multiplier)
  const buyMaxInt = Math.round(buyThresholdMax * multiplier)
  const sellMinInt = Math.round(sellThresholdMin * multiplier)
  const sellMaxInt = Math.round(sellThresholdMax * multiplier)
  const stepInt = Math.round(step * multiplier)
  
  for (let t = buyMinInt; t <= buyMaxInt; t += stepInt) {
    buyThresholds.push(t / multiplier)
  }
  
  for (let t = sellMinInt; t <= sellMaxInt; t += stepInt) {
    sellThresholds.push(t / multiplier)
  }
  
  const totalIterations = buyThresholds.length * sellThresholds.length
  let currentIteration = 0
  
  // 진행 상황 전송
  self.postMessage({
    type: 'PROGRESS',
    progress: 0,
    message: '데이터 준비 중...'
  })
  
  const simCandles = generateSimulationCandles(mainCandles, simulationCandles)
  
  if (simCandles.length === 0) {
    self.postMessage({
      type: 'ERROR',
      error: '5분봉 데이터가 없습니다.'
    })
    return
  }
  
  // Z-Score 기반 Ranking Value 계산 (슬라이딩 윈도우 방식) ⭐
  // 1단계: 전체 지표 배열 계산
  self.postMessage({
    type: 'PROGRESS',
    progress: 5,
    message: '전체 지표 데이터 계산 중...'
  })
  
  const indicatorArrays = calculateAllIndicatorArrays(simCandles, indicators)
  
  // 2단계: 각 시점의 Z-Score 기반 Ranking Value 계산 (슬라이딩 윈도우)
  // 각 시점마다 이전 LOOKBACK_WINDOW(1000개) 데이터로 평균/표준편차 계산
  self.postMessage({
    type: 'PROGRESS',
    progress: 7,
    message: 'Ranking Value 계산 중 (슬라이딩 윈도우)...'
  })
  
  const cachedIndicatorValues = []
  for (let i = 0; i < simCandles.length; i++) {
    const rankingValue = calculateRankingValueZScoreSliding(i, indicatorArrays, indicators)
    cachedIndicatorValues.push(rankingValue)
  }
  
  self.postMessage({
    type: 'PROGRESS',
    progress: 10,
    message: '지표 캐싱 완료! 시뮬레이션 시작...'
  })
  
  // 그리드 시뮬레이션
  for (let i = 0; i < buyThresholds.length; i++) {
    const buyThreshold = buyThresholds[i]
    const row = []
    
    for (let j = 0; j < sellThresholds.length; j++) {
      const sellThreshold = sellThresholds[j]
      
      const config = {
        buyConditionCount,
        buyThreshold,
        sellConditionCount,
        sellThreshold
      }
      
      const result = runTradingSimulation(
        mainCandles,
        simulationCandles,
        config,
        cachedIndicatorValues,
        initialPosition
      )
      
      row.push({
        buyThreshold,
        sellThreshold,
        totalReturn: result.totalReturn,
        tradeCount: result.tradeCount
      })
      
      currentIteration++
    }
    
    results.push(row)
    
    // 각 행(buyThreshold) 완료 시 진행률 전송 (10% ~ 100%)
    const progress = 10 + (currentIteration / totalIterations) * 90
    self.postMessage({
      type: 'PROGRESS',
      progress: progress,
      message: `시뮬레이션 진행 중... ${Math.floor((currentIteration / totalIterations) * 100)}%`
    })
  }
  
  // 완료 (cachedIndicatorValues도 함께 전송 - Phase 0) ⚡
  self.postMessage({
    type: 'COMPLETE',
    results: results,
    buyThresholds: buyThresholds,
    sellThresholds: sellThresholds,
    cachedIndicatorValues: cachedIndicatorValues  // ⚡ 캐시 전송
  })
}

/**
 * 상세 거래 내역 생성
 * 
 * @param {Array} cachedIndicatorValues - 캐시된 지표 값 (Phase 0 추가) ⚡
 *   Grid Simulation에서 계산한 결과를 재사용하여 15~25초 → 0.5초로 개선
 */
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
  cachedIndicatorValues = null  // ⚡ Phase 0: 캐시 파라미터 추가
) {
  const simCandles = generateSimulationCandles(mainCandles, simulationCandles)
  
  if (simCandles.length === 0) {
    return []
  }

  const config = {
    buyConditionCount,
    buyThreshold,
    sellConditionCount,
    sellThreshold
  }

  const details = []
  
  // 초기 포지션 설정
  let position = initialPosition === 'coin' ? 1 : 0
  let balance = 1000000
  let holdings = 0
  let buyPrice = 0
  
  // 분석 시작 시점의 가격과 인덱스 찾기
  let analysisStartPrice = simCandles[0].close
  let analysisStartTimestamp = 0
  let analysisStartIndex = 0
  
  if (baseDate && period) {
    // baseDate와 period로 분석 시작 timestamp 계산
    const baseDateObj = new Date(baseDate + 'T23:59:59+09:00')
    const periodDays = {
      '1M': 30,
      '3M': 90,
      '6M': 180,
      '1Y': 365
    }[period] || 90
    
    analysisStartTimestamp = baseDateObj.getTime() - (periodDays * 24 * 60 * 60 * 1000)
    
    // 분석 시작 시점에 가장 가까운 캔들 찾기
    for (let i = 0; i < simCandles.length; i++) {
      if (simCandles[i].timestamp >= analysisStartTimestamp) {
        analysisStartPrice = simCandles[i].close
        analysisStartIndex = i
        break
      }
    }
  }
  
  const firstPrice = simCandles[0].close
  
  // 홀드 수익률 계산용 기준 가격
  // - 초기 포지션이 코인이면: 시뮬레이션 시작 시점 가격
  // - 초기 포지션이 현금이면: 첫 매수 시점 가격
  let holdBasePrice = null
  
  // 코인 보유로 시작하는 경우
  if (initialPosition === 'coin') {
    holdings = balance / firstPrice
    balance = 0
    buyPrice = firstPrice
    holdBasePrice = analysisStartPrice  // 시뮬레이션 시작 시점 가격 기준
  }

  // Z-Score 기반 지표 값 계산 (슬라이딩 윈도우 방식) ⭐
  // Phase 0: 캐시가 있으면 재사용, 없으면 계산 (15~25초 → 0.5초 개선!) ⚡
  let indicatorValues
  
  if (cachedIndicatorValues && cachedIndicatorValues.length === simCandles.length) {
    // ✅ 캐시 재사용! (즉시 완료)
    indicatorValues = cachedIndicatorValues
  } else {
    // ❌ 캐시 없음 - 새로 계산 (기존 로직)
    const indicatorArrays = calculateAllIndicatorArrays(simCandles, indicators)
    indicatorValues = []
    for (let i = 0; i < simCandles.length; i++) {
      const rankingValue = calculateRankingValueZScoreSliding(i, indicatorArrays, indicators)
      indicatorValues.push(rankingValue)
    }
  }

  // 각 5분 캔들마다 순회
  for (let i = 0; i < simCandles.length; i++) {
    const currentCandle = simCandles[i]
    const rankingValue = indicatorValues[i]

    let decision = 'hold'
    const currentPrice = currentCandle.close
    
    // 분석 시작 시점 이전 데이터는 details에 포함하지 않음 (거래는 진행)
    const shouldIncludeInDetails = i >= analysisStartIndex

    // 매수/매도 판단 (runTradingSimulation과 동일한 로직)
    if (i >= config.buyConditionCount && position === 0) {
      // 현재 값을 제외한 직전 N개
      const recentValues = indicatorValues.slice(i - config.buyConditionCount, i)
      const minValue = Math.min(...recentValues)
      
      // 매수 비교 범위: currentValue - min > buyThreshold
      const buyCondition = rankingValue - minValue
      
      if (buyCondition > config.buyThreshold) {
        // 매수
        holdings = balance / currentPrice
        balance = 0
        buyPrice = currentPrice
        position = 1
        decision = 'buy'
        
        // 초기 포지션이 현금인 경우, 첫 매수 시점 가격을 홀드 기준 가격으로 설정
        if (holdBasePrice === null) {
          holdBasePrice = currentPrice
        }
      }
    } else if (i >= config.sellConditionCount && position === 1) {
      // 현재 값을 제외한 직전 N개
      const recentValues = indicatorValues.slice(i - config.sellConditionCount, i)
      const maxValue = Math.max(...recentValues)
      
      // 매도 비교 범위: currentValue - max < sellThreshold
      const sellCondition = rankingValue - maxValue
      
      if (sellCondition < config.sellThreshold) {
        // 매도
        balance = holdings * currentPrice
        holdings = 0
        position = 0
        decision = 'sell'
      }
    }

    // 분석 시작 시점 이후 데이터만 details에 추가
    if (shouldIncludeInDetails) {
      // 현재 수익률 계산
      let currentBalance = balance
      if (position === 1) {
        currentBalance = holdings * currentPrice
      }
      const cumulativeReturn = ((currentBalance - 1000000) / 1000000) * 100

      // 홀드 수익률 계산
      // - holdBasePrice가 설정되지 않았으면 (아직 매수 안함) 0%
      // - holdBasePrice가 설정되었으면 해당 가격 기준으로 계산
      let holdReturn = 0
      if (holdBasePrice !== null) {
        holdReturn = ((currentPrice - holdBasePrice) / holdBasePrice) * 100
      }

      details.push({
        timestamp: currentCandle.timestamp,
        rankingValue,
        decision,
        price: currentPrice,
        cumulativeReturn,
        holdReturn
      })
    }
  }

  return {
    details,
    analysisStartPrice,
    analysisStartTimestamp: simCandles[analysisStartIndex]?.timestamp || simCandles[0].timestamp
  }
}
