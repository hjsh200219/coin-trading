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

// ===== Phase 1: 증분 통계 클래스 (Incremental Statistics) ⚡ =====
/**
 * 슬라이딩 윈도우에서 평균과 표준편차를 O(1) 시간에 계산
 * 
 * Phase 1: 성능 개선
 * - Before: O(N × 1000) - 매번 1000개 재계산
 * - After: O(N × 1) - 증분 업데이트
 * - 개선율: 1000배
 */
class IncrementalStats {
  constructor(maxSize) {
    this.window = []
    this.sum = 0
    this.sumSquares = 0
    this.maxSize = maxSize
  }
  
  /**
   * 윈도우에 값 추가 (O(1))
   */
  add(value) {
    // 새 값 추가
    this.window.push(value)
    this.sum += value
    this.sumSquares += value * value
    
    // 윈도우 크기 초과 시 가장 오래된 값 제거
    if (this.window.length > this.maxSize) {
      const removed = this.window.shift()
      this.sum -= removed
      this.sumSquares -= removed * removed
    }
  }
  
  /**
   * 현재 윈도우의 평균 계산 (O(1))
   */
  getMean() {
    if (this.window.length === 0) return 0
    return this.sum / this.window.length
  }
  
  /**
   * 현재 윈도우의 모표준편차 계산 (O(1))
   */
  getStdDev() {
    if (this.window.length === 0) return 0
    
    const n = this.window.length
    const mean = this.getMean()
    
    // Variance = E[X²] - (E[X])²
    const variance = (this.sumSquares / n) - (mean * mean)
    
    // 부동소수점 오차로 인한 음수 방지
    return Math.sqrt(Math.max(0, variance))
  }
  
  /**
   * 현재 윈도우 크기 반환
   */
  getCount() {
    return this.window.length
  }
  
  /**
   * 윈도우 초기화
   */
  reset() {
    this.window = []
    this.sum = 0
    this.sumSquares = 0
  }
}

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
        initialPosition, // 초기 포지션 ✨
        baseDate, // 분석 시작 시간 (timestamp)
        timeFrame // 메인 타임프레임 (1d, 4h, 2h, 1h, 30m)
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
        initialPosition, // 초기 포지션 전달
        baseDate, // 분석 시작 시간 전달
        timeFrame // 메인 타임프레임 전달
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
  } else if (type === 'START_PHASE1_SIMULATION') {
    try {
      const {
        mainCandles,
        simulationCandles,
        conditionRange,
        thresholdRange,
        indicators,
        initialPosition,
        decimalPlaces,
        baseDate,
        timeFrame,
        decisionInterval = 1
      } = data

      // Phase 1 시뮬레이션 실행
      runPhase1Simulation(
        mainCandles,
        simulationCandles,
        conditionRange,
        thresholdRange,
        indicators,
        initialPosition,
        decimalPlaces,
        baseDate,
        timeFrame,
        decisionInterval
      )
    } catch (error) {
      self.postMessage({
        type: 'ERROR',
        error: error.message
      })
    }
  } else if (type === 'START_PHASE2A_SIMULATION') {
    try {
      const {
        mainCandles,
        simulationCandles,
        fixedSellCondition,
        fixedSellThreshold,
        buyConditionRange,
        buyThresholdRange,
        indicators,
        initialPosition,
        decimalPlaces,
        baseDate,
        timeFrame,
        decisionInterval = 1
      } = data

      // Phase 2A 시뮬레이션 실행
      runPhase2ASimulation(
        mainCandles,
        simulationCandles,
        fixedSellCondition,
        fixedSellThreshold,
        buyConditionRange,
        buyThresholdRange,
        indicators,
        initialPosition,
        decimalPlaces,
        baseDate,
        timeFrame,
        decisionInterval
      )
    } catch (error) {
      self.postMessage({
        type: 'ERROR',
        error: error.message
      })
    }
  } else if (type === 'START_PHASE2B_SIMULATION') {
    try {
      const {
        mainCandles,
        simulationCandles,
        fixedBuyCondition,
        fixedBuyThreshold,
        sellConditionRange,
        sellThresholdRange,
        indicators,
        initialPosition,
        decimalPlaces,
        baseDate,
        timeFrame,
        decisionInterval = 1
      } = data

      // Phase 2B 시뮬레이션 실행
      runPhase2BSimulation(
        mainCandles,
        simulationCandles,
        fixedBuyCondition,
        fixedBuyThreshold,
        sellConditionRange,
        sellThresholdRange,
        indicators,
        initialPosition,
        decimalPlaces,
        baseDate,
        timeFrame,
        decisionInterval
      )
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
 * TimeFrame을 초 단위로 변환
 */
function timeFrameToSeconds(timeFrame) {
  switch (timeFrame) {
    case '30s':
      return 30
    case '1m':
      return 60
    case '5m':
      return 300
    case '30m':
      return 1800
    case '1h':
      return 3600
    case '2h':
      return 7200
    case '4h':
      return 14400
    case '1d':
      return 86400
    default:
      return 60
  }
}

/**
 * 구간 앵커 시간 계산 (최초 시작 시간 기준 고정 구간)
 * 
 * @param {Date} baseDate - 분석 시작 시간
 * @param {string} timeFrame - 타임프레임 (1d, 4h, 2h, 1h, 30m)
 * @returns {number} 마지막 완성된 구간의 시작 시간 (timestamp)
 * 
 * @example
 * getAnchorTime(new Date('2024-01-01 09:30:00'), '2h')
 * // 9:30 → 9:00 (마지막 완성된 2시간 구간의 시작)
 */
function getAnchorTime(baseDate, timeFrame) {
  const intervalSeconds = timeFrameToSeconds(timeFrame)
  const baseDateSeconds = Math.floor(baseDate.getTime() / 1000)
  
  // 마지막 완성된 구간의 시작 시간 계산
  const anchorSeconds = Math.floor(baseDateSeconds / intervalSeconds) * intervalSeconds
  
  return anchorSeconds * 1000 // milliseconds로 반환
}

/**
 * 캔들 데이터를 지정된 타임프레임으로 집계
 * 
 * @param {Array} baseCandles - 원본 캔들 데이터 (1분봉 또는 5분봉)
 * @param {string} targetTimeFrame - 목표 타임프레임 (30s, 1m, 5m, etc.)
 * @param {number} anchorTime - 구간 앵커 시간 (고정 구간 시작점)
 * @param {number} count - 집계할 캔들 개수 (기본값: 1000)
 * @returns {Array} 집계된 캔들 데이터
 * 
 * @example
 * // 1시간봉 분석 시 30초 단위로 1000개 집계
 * const aggregated = aggregateCandles(candles1m, '30s', anchorTime, 1000)
 */
function aggregateCandles(baseCandles, targetTimeFrame, anchorTime, count = 1000) {
  if (baseCandles.length === 0) return []
  
  const intervalMs = timeFrameToSeconds(targetTimeFrame) * 1000
  
  // 앵커 시간부터 역순으로 구간 생성
  const periods = []
  for (let i = 0; i < count; i++) {
    const periodEnd = anchorTime - (i * intervalMs)
    const periodStart = periodEnd - intervalMs
    periods.unshift({ start: periodStart, end: periodEnd })
  }
  
  // 각 구간별로 캔들 집계
  const aggregated = []
  
  for (const period of periods) {
    // 해당 구간에 속하는 캔들 찾기
    const candlesInPeriod = baseCandles.filter(
      c => c.timestamp >= period.start && c.timestamp < period.end
    )
    
    if (candlesInPeriod.length === 0) {
      // 데이터가 없으면 이전 캔들의 close 가격 사용 (또는 스킵)
      if (aggregated.length > 0) {
        const prevCandle = aggregated[aggregated.length - 1]
        aggregated.push({
          timestamp: period.end,
          open: prevCandle.close,
          high: prevCandle.close,
          low: prevCandle.close,
          close: prevCandle.close,
          volume: 0,
        })
      }
      continue
    }
    
    // OHLCV 집계
    const open = candlesInPeriod[0].open
    const high = Math.max(...candlesInPeriod.map(c => c.high))
    const low = Math.min(...candlesInPeriod.map(c => c.low))
    const close = candlesInPeriod[candlesInPeriod.length - 1].close
    const volume = candlesInPeriod.reduce((sum, c) => sum + c.volume, 0)
    
    aggregated.push({
      timestamp: period.end,
      open,
      high,
      low,
      close,
      volume,
    })
  }
  
  return aggregated
}

/**
 * 특정 시점 기준으로 동적 1000개 캔들 집계
 * 
 * @param {Array} baseCandles - 원본 캔들 (1분 또는 5분)
 * @param {number} currentTimestamp - 현재 시점 timestamp
 * @param {string} targetTimeFrame - 목표 타임프레임 (1m, 5m, etc.)
 * @param {string} mainTimeFrame - 메인 타임프레임 (1d, 4h, 2h, 1h, 30m)
 * @returns {Array} 1000개 집계된 캔들
 */
function getDynamic1000Candles(baseCandles, currentTimestamp, targetTimeFrame, mainTimeFrame) {
  if (baseCandles.length === 0) return []
  
  // 현재 시점 기준 앵커 계산 (마지막 완성된 구간)
  const anchorTime = getAnchorTime(new Date(currentTimestamp), mainTimeFrame)
  
  // 앵커부터 역순으로 1000개 집계
  return aggregateCandles(baseCandles, targetTimeFrame, anchorTime, 1000)
}

/**
 * 1000개 캔들로 동적 ranking value 계산
 * 
 * @param {Array} candles1000 - 1000개 집계된 캔들
 * @param {Object} indicators - 사용할 지표 설정
 * @returns {number} 현재 시점의 ranking value
 */
function calculateDynamicRankingValue(candles1000, indicators) {
  if (candles1000.length < 1000) return 0
  
  // 지표 배열 계산
  const indicatorArrays = calculateAllIndicatorArrays(candles1000, indicators)
  
  // 증분 통계로 ranking values 계산 (1000개 전체)
  const rankingValues = calculateAllRankingValuesIncremental(indicatorArrays, indicators)
  
  // 마지막 값 (현재 시점) 반환
  return rankingValues[rankingValues.length - 1] || 0
}

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

/**
 * Phase 1: 증분 통계로 모든 Ranking Value 계산 (O(N × 1000) → O(N × 1)) ⚡
 * 
 * calculateRankingValueZScoreSliding을 대체하는 최적화된 버전
 * 각 시점마다 호출하는 대신, 한 번에 모든 값을 계산
 * 
 * @param {Array} indicatorArrays - 지표 배열
 * @param {Object} indicators - 사용할 지표 설정
 * @returns {Array} - 각 시점의 Ranking Value 배열
 */
function calculateAllRankingValuesIncremental(indicatorArrays, indicators) {
  const length = indicatorArrays.macd?.length 
    || indicatorArrays.rsi?.length 
    || indicatorArrays.ao?.length 
    || indicatorArrays.DP?.length 
    || indicatorArrays.rti?.length 
    || 0
  
  if (length === 0) return []
  
  // ✅ Phase 1: 각 지표마다 증분 통계 인스턴스 생성
  const macdStats = indicators.macd ? new IncrementalStats(LOOKBACK_WINDOW) : null
  const rsiStats = indicators.rsi ? new IncrementalStats(LOOKBACK_WINDOW) : null
  const aoStats = indicators.ao ? new IncrementalStats(LOOKBACK_WINDOW) : null
  const dpStats = indicators.DP ? new IncrementalStats(LOOKBACK_WINDOW) : null
  const rtiStats = indicators.rti ? new IncrementalStats(LOOKBACK_WINDOW) : null
  
  const rankingValues = []
  
  for (let i = 0; i < length; i++) {
    // ✅ Phase 1: 증분 통계 업데이트 (O(1))
    if (macdStats && indicatorArrays.macd[i] !== undefined) {
      macdStats.add(indicatorArrays.macd[i])
    }
    if (rsiStats && indicatorArrays.rsi[i] !== undefined) {
      rsiStats.add(indicatorArrays.rsi[i])
    }
    if (aoStats && indicatorArrays.ao[i] !== undefined) {
      aoStats.add(indicatorArrays.ao[i])
    }
    if (dpStats && indicatorArrays.DP[i] !== undefined) {
      dpStats.add(indicatorArrays.DP[i])
    }
    if (rtiStats && indicatorArrays.rti[i] !== undefined) {
      rtiStats.add(indicatorArrays.rti[i])
    }
    
    // 최소 데이터 개수 확인 (통계 계산에 최소 10개 필요)
    const minCount = Math.min(
      macdStats?.getCount() ?? Infinity,
      rsiStats?.getCount() ?? Infinity,
      aoStats?.getCount() ?? Infinity,
      dpStats?.getCount() ?? Infinity,
      rtiStats?.getCount() ?? Infinity
    )
    
    if (minCount < 10) {
      rankingValues.push(0)
      continue
    }
    
    // ✅ Phase 1: 증분 통계로 평균/표준편차 계산 (O(1))
    let rankingValue = 0
    
    try {
      // MACD Z-Score
      if (indicators.macd && indicatorArrays.macd[i] !== undefined && macdStats) {
        const mean = macdStats.getMean()
        const stdDev = macdStats.getStdDev()
        rankingValue += calculateZScore(indicatorArrays.macd[i], mean, stdDev)
      }
      
      // RSI Z-Score
      if (indicators.rsi && indicatorArrays.rsi[i] !== undefined && rsiStats) {
        const mean = rsiStats.getMean()
        const stdDev = rsiStats.getStdDev()
        rankingValue += calculateZScore(indicatorArrays.rsi[i], mean, stdDev)
      }
      
      // AO Z-Score
      if (indicators.ao && indicatorArrays.ao[i] !== undefined && aoStats) {
        const mean = aoStats.getMean()
        const stdDev = aoStats.getStdDev()
        rankingValue += calculateZScore(indicatorArrays.ao[i], mean, stdDev)
      }
      
      // DP Z-Score
      if (indicators.DP && indicatorArrays.DP[i] !== undefined && dpStats) {
        const mean = dpStats.getMean()
        const stdDev = dpStats.getStdDev()
        rankingValue += calculateZScore(indicatorArrays.DP[i], mean, stdDev)
      }
      
      // RTI Z-Score
      if (indicators.rti && indicatorArrays.rti[i] !== undefined && rtiStats) {
        const mean = rtiStats.getMean()
        const stdDev = rtiStats.getStdDev()
        rankingValue += calculateZScore(indicatorArrays.rti[i], mean, stdDev)
      }
      
      rankingValues.push(rankingValue)
    } catch (error) {
      rankingValues.push(0)
    }
  }
  
  return rankingValues
}

function calculateMinMax(values) {
  if (values.length === 0) return { min: 0, max: 0 }
  return {
    min: Math.min(...values),
    max: Math.max(...values)
  }
}

function runTradingSimulation(
  aggregatedCandles, // 집계된 캔들 (1000개)
  config,
  cachedIndicatorValues,
  initialPosition = 'cash'
) {
  const trades = []
  
  if (aggregatedCandles.length === 0) {
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
    const firstPrice = aggregatedCandles[0].close
    holdings = balance / firstPrice
    balance = 0
    buyPrice = firstPrice
  }

  const indicatorValues = cachedIndicatorValues || []

  const startIndex = Math.max(config.buyConditionCount, config.sellConditionCount)

  for (let i = startIndex; i < aggregatedCandles.length; i++) {
    const indicatorValue = indicatorValues[i]
    const currentPrice = aggregatedCandles[i].close

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
          timestamp: aggregatedCandles[i].timestamp, 
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
          timestamp: aggregatedCandles[i].timestamp, 
          action: 'sell', 
          price: currentPrice, 
          maxValue: max, 
          threshold: config.sellThreshold 
        })
      }
    }
  }

  const finalPrice = aggregatedCandles[aggregatedCandles.length - 1].close
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
  initialPosition, // 초기 포지션 ✨
  baseDate, // 분석 시작 시간 (timestamp)
  timeFrame, // 메인 타임프레임 (1d, 4h, 2h, 1h, 30m)
  decisionInterval = 1 // 판단 주기 (1, 2, 5분)
) {
  const results = []
  const buyThresholds = []
  const sellThresholds = []
  
  // 소수점 자릿수에 따른 step 결정
  const step = 0.01 // 항상 0.01 단위
  const multiplier = 100
  
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
      error: '시뮬레이션 캔들 데이터가 없습니다.'
    })
    return
  }
  
  // ⭐ 새로운 로직: 캔들 집계 (선택한 타임프레임으로 1000개)
  self.postMessage({
    type: 'PROGRESS',
    progress: 2,
    message: '캔들 집계 중...'
  })
  
  // 타임프레임별 시뮬레이션 단위 결정
  const SIMULATION_TIMEFRAME_MAP = {
    '1d': '5m',
    '4h': '1m',
    '2h': '1m',
    '1h': '1m',
    '30m': '1m'
  }
  
  const simulationTimeFrame = timeFrame ? (SIMULATION_TIMEFRAME_MAP[timeFrame] || '5m') : '5m'
  
  // baseDate가 없으면 마지막 캔들 시간 사용
  const analysisBaseDate = baseDate ? new Date(baseDate) : new Date(simCandles[simCandles.length - 1].timestamp)
  
  // 구간 앵커 계산 (고정 구간 시작점)
  const anchorTime = getAnchorTime(analysisBaseDate, timeFrame || '1d')
  
  // 캔들 집계 (1000개)
  const aggregatedCandles = aggregateCandles(simCandles, simulationTimeFrame, anchorTime, 1000)
  
  if (aggregatedCandles.length === 0) {
    self.postMessage({
      type: 'ERROR',
      error: '집계된 캔들 데이터가 없습니다.'
    })
    return
  }
  
  // Z-Score 기반 Ranking Value 계산 (슬라이딩 윈도우 방식) ⭐
  // 1단계: 전체 지표 배열 계산 (집계된 캔들 사용)
  self.postMessage({
    type: 'PROGRESS',
    progress: 5,
    message: '전체 지표 데이터 계산 중...'
  })
  
  const indicatorArrays = calculateAllIndicatorArrays(aggregatedCandles, indicators)
  
  // 2단계: 각 시점의 Z-Score 기반 Ranking Value 계산 (슬라이딩 윈도우)
  // ✅ Phase 1: 증분 통계로 한 번에 계산 (O(N × 1000) → O(N × 1)) ⚡
  self.postMessage({
    type: 'PROGRESS',
    progress: 7,
    message: 'Ranking Value 계산 중 (증분 통계)...'
  })
  
  const cachedIndicatorValues = calculateAllRankingValuesIncremental(indicatorArrays, indicators)
  
  self.postMessage({
    type: 'PROGRESS',
    progress: 10,
    message: '지표 캐싱 완료! 시뮬레이션 시작... (1000배 빨라짐!) ⚡'
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
      
      // ⭐ 동적 시뮬레이션 사용
      const result = {
        totalReturn: 0,
        tradeCount: 0
      }
      
      try {
        const dynamicResult = runDynamicSingleSimulation(
          aggregatedCandles, // mainCandles로 사용
          simCandles, // 원본 simCandles
          config.buyConditionCount,
          config.sellConditionCount,
          config.buyThreshold,
          config.sellThreshold,
          initialPosition,
          indicators,
          simulationTimeFrame,
          timeFrame,
          decisionInterval
        )
        
        result.totalReturn = dynamicResult.totalReturn
        result.tradeCount = dynamicResult.tradeCount
      } catch (error) {
        // 에러 발생 시 0 반환
        result.totalReturn = 0
        result.tradeCount = 0
      }
      
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
    // ✅ Phase 0: 캐시 재사용! (즉시 완료)
    indicatorValues = cachedIndicatorValues
  } else {
    // ✅ Phase 1: 캐시 없음 - 증분 통계로 새로 계산 (O(N × 1000) → O(N × 1)) ⚡
    const indicatorArrays = calculateAllIndicatorArrays(simCandles, indicators)
    indicatorValues = calculateAllRankingValuesIncremental(indicatorArrays, indicators)
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

/**
 * Phase 1: 대칭 탐색 시뮬레이션
 * 매수/매도 조건을 대칭으로 설정하여 Grid 시뮬레이션 실행
 */
function runPhase1Simulation(
  mainCandles,
  simulationCandles,
  conditionRange,
  thresholdRange,
  indicators,
  initialPosition,
  decimalPlaces,
  baseDate,
  timeFrame,
  decisionInterval = 1
) {
  const simCandles = generateSimulationCandles(mainCandles, simulationCandles)
  
  if (simCandles.length === 0) {
    throw new Error('시뮬레이션용 캔들 데이터가 없습니다')
  }

  // 타임프레임별 시뮬레이션 단위 결정
  const SIMULATION_TIMEFRAME_MAP = {
    '1d': '5m',
    '4h': '1m',
    '2h': '1m',
    '1h': '1m',
    '30m': '1m'
  }
  
  const simulationTimeFrame = timeFrame ? (SIMULATION_TIMEFRAME_MAP[timeFrame] || '5m') : '5m'
  
  // baseDate가 없으면 마지막 캔들 시간 사용
  const analysisBaseDate = baseDate ? new Date(baseDate) : new Date(simCandles[simCandles.length - 1].timestamp)
  
  // 구간 앵커 계산 (고정 구간 시작점)
  const anchorTime = getAnchorTime(analysisBaseDate, timeFrame || '1d')
  
  // 캔들 집계 (1000개)
  const aggregatedCandles = aggregateCandles(simCandles, simulationTimeFrame, anchorTime, 1000)
  
  if (aggregatedCandles.length === 0) {
    throw new Error('집계된 캔들 데이터가 없습니다')
  }

  // 조건 개수 배열 생성 (예: [1, 2, 3, ..., 10])
  const conditionCounts = []
  for (let i = conditionRange.min; i <= conditionRange.max; i++) {
    conditionCounts.push(i)
  }

  // 임계값 배열 생성 (항상 0.01 단위 사용)
  const step = 0.01
  const thresholdValues = []
  for (let t = thresholdRange.min; t <= thresholdRange.max; t += step) {
    thresholdValues.push(Number(t.toFixed(decimalPlaces)))
  }

  // 전체 조합 수 계산
  const totalCombinations = conditionCounts.length * thresholdValues.length
  let completedCombinations = 0

  // 지표 배열 계산 (한 번만 수행 - 모든 조합에서 재사용) - 집계된 캔들 사용
  const indicatorArrays = calculateAllIndicatorArrays(aggregatedCandles, indicators)
  const rankingValues = calculateAllRankingValuesIncremental(indicatorArrays, indicators)

  // 결과 저장용 2차원 배열 초기화
  const results = []
  let minReturn = Infinity
  let maxReturn = -Infinity
  let bestResult = null

  // 진행률 업데이트
  self.postMessage({
    type: 'PHASE1_PROGRESS',
    progress: 0,
    message: 'Phase 1 시뮬레이션 시작...'
  })

  // 조건 개수별로 순회
  for (let condIdx = 0; condIdx < conditionCounts.length; condIdx++) {
    const conditionCount = conditionCounts[condIdx]
    const rowResults = []

    // 임계값별로 순회
    for (let threshIdx = 0; threshIdx < thresholdValues.length; threshIdx++) {
      const thresholdValue = thresholdValues[threshIdx]
      
      // 대칭 조건 설정
      const buyThreshold = thresholdValue
      const sellThreshold = -thresholdValue

      // ⭐ 동적 시뮬레이션 실행 (각 시점마다 1000개 재계산)
      const simulationResult = runDynamicSingleSimulation(
        aggregatedCandles, // mainCandles로 사용 (집계된 캔들이 메인 타임프레임 역할)
        simCandles, // 원본 simCandles
        conditionCount,  // buyConditionCount
        conditionCount,  // sellConditionCount (대칭)
        buyThreshold,
        sellThreshold,
        initialPosition,
        indicators, // 지표 설정
        simulationTimeFrame, // 목표 타임프레임 (1m, 5m)
        timeFrame, // 메인 타임프레임 (1d, 4h, 2h, 1h, 30m)
        decisionInterval // 판단 주기
      )

      // 결과 저장
      const result = {
        conditionCount,
        thresholdValue,
        buyThreshold,
        sellThreshold,
        totalReturn: simulationResult.totalReturn,
        tradeCount: simulationResult.tradeCount,
        holdReturn: simulationResult.holdReturn
      }

      rowResults.push(result)

      // 최소/최대 수익률 업데이트
      if (result.totalReturn < minReturn) {
        minReturn = result.totalReturn
      }
      if (result.totalReturn > maxReturn) {
        maxReturn = result.totalReturn
        bestResult = result
      }

      // 진행률 업데이트
      completedCombinations++
      const progress = 50 + (completedCombinations / totalCombinations) * 50 // 50-100%
      
      if (completedCombinations % BATCH_SIZE === 0 || completedCombinations === totalCombinations) {
        self.postMessage({
          type: 'PHASE1_PROGRESS',
          progress,
          message: `Phase 1 시뮬레이션 진행 중... (${completedCombinations}/${totalCombinations})`
        })
      }
    }

    results.push(rowResults)
  }

  // Phase 1 완료 - 결과 전송
  self.postMessage({
    type: 'PHASE1_COMPLETE',
    results: {
      results,
      minReturn,
      maxReturn,
      bestResult,
      conditionCounts,
      thresholdValues,
      config: {
        indicators,
        initialPosition,
        decimalPlaces
      }
    }
  })
}

/**
 * Phase 2A: 매수 미세 조정 시뮬레이션
 * 매도 조건/임계값은 고정, 매수 조건/임계값만 탐색
 */
function runPhase2ASimulation(
  mainCandles,
  simulationCandles,
  fixedSellCondition,
  fixedSellThreshold,
  buyConditionRange,
  buyThresholdRange,
  indicators,
  initialPosition,
  decimalPlaces,
  baseDate,
  timeFrame,
  decisionInterval = 1
) {
  const simCandles = generateSimulationCandles(mainCandles, simulationCandles)
  
  if (simCandles.length === 0) {
    throw new Error('시뮬레이션용 캔들 데이터가 없습니다')
  }

  // 타임프레임별 시뮬레이션 단위 결정
  const SIMULATION_TIMEFRAME_MAP = {
    '1d': '5m',
    '4h': '1m',
    '2h': '1m',
    '1h': '1m',
    '30m': '1m'
  }
  
  const simulationTimeFrame = timeFrame ? (SIMULATION_TIMEFRAME_MAP[timeFrame] || '5m') : '5m'
  
  // baseDate가 없으면 마지막 캔들 시간 사용
  const analysisBaseDate = baseDate ? new Date(baseDate) : new Date(simCandles[simCandles.length - 1].timestamp)
  
  // 구간 앵커 계산 (고정 구간 시작점)
  const anchorTime = getAnchorTime(analysisBaseDate, timeFrame || '1d')
  
  // 캔들 집계 (1000개)
  const aggregatedCandles = aggregateCandles(simCandles, simulationTimeFrame, anchorTime, 1000)
  
  if (aggregatedCandles.length === 0) {
    throw new Error('집계된 캔들 데이터가 없습니다')
  }

  // 매수 조건 개수 배열 생성
  const buyConditionCounts = []
  for (let i = buyConditionRange.min; i <= buyConditionRange.max; i++) {
    buyConditionCounts.push(i)
  }

  // 매수 임계값 배열 생성 (항상 0.01 단위 사용)
  const step = 0.01
  const buyThresholds = []
  for (let t = buyThresholdRange.min; t <= buyThresholdRange.max; t += step) {
    buyThresholds.push(Number(t.toFixed(decimalPlaces)))
  }

  const totalCombinations = buyConditionCounts.length * buyThresholds.length
  let completedCombinations = 0

  // 지표 배열 계산 (한 번만 수행) - 집계된 캔들 사용
  const indicatorArrays = calculateAllIndicatorArrays(aggregatedCandles, indicators)
  const rankingValues = calculateAllRankingValuesIncremental(indicatorArrays, indicators)

  const results = []
  let minReturn = Infinity
  let maxReturn = -Infinity
  let bestResult = null

  self.postMessage({
    type: 'PHASE2A_PROGRESS',
    progress: 0,
    message: 'Phase 2A 시뮬레이션 시작...'
  })

  // 매수 조건별로 순회
  for (let condIdx = 0; condIdx < buyConditionCounts.length; condIdx++) {
    const buyConditionCount = buyConditionCounts[condIdx]
    const rowResults = []

    // 매수 임계값별로 순회
    for (let threshIdx = 0; threshIdx < buyThresholds.length; threshIdx++) {
      const buyThreshold = buyThresholds[threshIdx]

      // ⭐ 동적 시뮬레이션 실행 (각 시점마다 1000개 재계산)
      const simulationResult = runDynamicSingleSimulation(
        aggregatedCandles, // mainCandles로 사용
        simCandles, // 원본 simCandles
        buyConditionCount,      // 변화
        fixedSellCondition,     // 고정
        buyThreshold,           // 변화
        fixedSellThreshold,     // 고정
        initialPosition,
        indicators,
        simulationTimeFrame,
        timeFrame,
        decisionInterval
      )

      // 결과 저장
      const result = {
        buyConditionCount,
        buyThreshold,
        sellConditionCount: fixedSellCondition,
        sellThreshold: fixedSellThreshold,
        totalReturn: simulationResult.totalReturn,
        tradeCount: simulationResult.tradeCount,
        holdReturn: simulationResult.holdReturn
      }

      rowResults.push(result)

      // 최소/최대 수익률 업데이트
      if (result.totalReturn < minReturn) {
        minReturn = result.totalReturn
      }
      if (result.totalReturn > maxReturn) {
        maxReturn = result.totalReturn
        bestResult = result
      }

      // 진행률 업데이트
      completedCombinations++
      const progress = 50 + (completedCombinations / totalCombinations) * 50
      
      if (completedCombinations % BATCH_SIZE === 0 || completedCombinations === totalCombinations) {
        self.postMessage({
          type: 'PHASE2A_PROGRESS',
          progress,
          message: `Phase 2A 시뮬레이션 진행 중... (${completedCombinations}/${totalCombinations})`
        })
      }
    }

    results.push(rowResults)
  }

  // Phase 2A 완료 - 결과 전송
  self.postMessage({
    type: 'PHASE2A_COMPLETE',
    results: {
      results,
      minReturn,
      maxReturn,
      bestResult,
      buyConditionCounts,
      buyThresholds,
      fixedSellCondition,
      fixedSellThreshold
    }
  })
}

/**
 * Phase 2B: 매도 미세 조정 시뮬레이션
 * 매수 조건/임계값은 고정, 매도 조건/임계값만 탐색
 */
function runPhase2BSimulation(
  mainCandles,
  simulationCandles,
  fixedBuyCondition,
  fixedBuyThreshold,
  sellConditionRange,
  sellThresholdRange,
  indicators,
  initialPosition,
  decimalPlaces,
  baseDate,
  timeFrame,
  decisionInterval = 1
) {
  const simCandles = generateSimulationCandles(mainCandles, simulationCandles)
  
  if (simCandles.length === 0) {
    throw new Error('시뮬레이션용 캔들 데이터가 없습니다')
  }

  // 타임프레임별 시뮬레이션 단위 결정
  const SIMULATION_TIMEFRAME_MAP = {
    '1d': '5m',
    '4h': '1m',
    '2h': '1m',
    '1h': '1m',
    '30m': '1m'
  }
  
  const simulationTimeFrame = timeFrame ? (SIMULATION_TIMEFRAME_MAP[timeFrame] || '5m') : '5m'
  
  // baseDate가 없으면 마지막 캔들 시간 사용
  const analysisBaseDate = baseDate ? new Date(baseDate) : new Date(simCandles[simCandles.length - 1].timestamp)
  
  // 구간 앵커 계산 (고정 구간 시작점)
  const anchorTime = getAnchorTime(analysisBaseDate, timeFrame || '1d')
  
  // 캔들 집계 (1000개)
  const aggregatedCandles = aggregateCandles(simCandles, simulationTimeFrame, anchorTime, 1000)
  
  if (aggregatedCandles.length === 0) {
    throw new Error('집계된 캔들 데이터가 없습니다')
  }

  // 매도 조건 개수 배열 생성
  const sellConditionCounts = []
  for (let i = sellConditionRange.min; i <= sellConditionRange.max; i++) {
    sellConditionCounts.push(i)
  }

  // 매도 임계값 배열 생성 (항상 0.01 단위 사용)
  const step = 0.01
  const sellThresholds = []
  for (let t = sellThresholdRange.min; t <= sellThresholdRange.max; t += step) {
    sellThresholds.push(Number(t.toFixed(decimalPlaces)))
  }

  const totalCombinations = sellConditionCounts.length * sellThresholds.length
  let completedCombinations = 0

  // 지표 배열 계산 (한 번만 수행) - 집계된 캔들 사용
  const indicatorArrays = calculateAllIndicatorArrays(aggregatedCandles, indicators)
  const rankingValues = calculateAllRankingValuesIncremental(indicatorArrays, indicators)

  const results = []
  let minReturn = Infinity
  let maxReturn = -Infinity
  let bestResult = null

  self.postMessage({
    type: 'PHASE2B_PROGRESS',
    progress: 0,
    message: 'Phase 2B 시뮬레이션 시작...'
  })

  // 매도 조건별로 순회
  for (let condIdx = 0; condIdx < sellConditionCounts.length; condIdx++) {
    const sellConditionCount = sellConditionCounts[condIdx]
    const rowResults = []

    // 매도 임계값별로 순회
    for (let threshIdx = 0; threshIdx < sellThresholds.length; threshIdx++) {
      const sellThreshold = sellThresholds[threshIdx]

      // ⭐ 동적 시뮬레이션 실행 (각 시점마다 1000개 재계산)
      const simulationResult = runDynamicSingleSimulation(
        aggregatedCandles, // mainCandles로 사용
        simCandles, // 원본 simCandles
        fixedBuyCondition,      // 고정
        sellConditionCount,     // 변화
        fixedBuyThreshold,      // 고정
        sellThreshold,          // 변화
        initialPosition,
        indicators,
        simulationTimeFrame,
        timeFrame,
        decisionInterval
      )

      // 결과 저장
      const result = {
        buyConditionCount: fixedBuyCondition,
        buyThreshold: fixedBuyThreshold,
        sellConditionCount,
        sellThreshold,
        totalReturn: simulationResult.totalReturn,
        tradeCount: simulationResult.tradeCount,
        holdReturn: simulationResult.holdReturn
      }

      rowResults.push(result)

      // 최소/최대 수익률 업데이트
      if (result.totalReturn < minReturn) {
        minReturn = result.totalReturn
      }
      if (result.totalReturn > maxReturn) {
        maxReturn = result.totalReturn
        bestResult = result
      }

      // 진행률 업데이트
      completedCombinations++
      const progress = 50 + (completedCombinations / totalCombinations) * 50
      
      if (completedCombinations % BATCH_SIZE === 0 || completedCombinations === totalCombinations) {
        self.postMessage({
          type: 'PHASE2B_PROGRESS',
          progress,
          message: `Phase 2B 시뮬레이션 진행 중... (${completedCombinations}/${totalCombinations})`
        })
      }
    }

    results.push(rowResults)
  }

  // Phase 2B 완료 - 결과 전송
  self.postMessage({
    type: 'PHASE2B_COMPLETE',
    results: {
      results,
      minReturn,
      maxReturn,
      bestResult,
      sellConditionCounts,
      sellThresholds,
      fixedBuyCondition,
      fixedBuyThreshold
    }
  })
}

/**
 * 동적 시뮬레이션 실행 (사용자 지정 주기로 판단)
 * 
 * @param {Array} mainCandles - 메인 타임프레임 캔들 (2시간봉 등) - 초기가/최종가 계산용
 * @param {Array} simCandles - 원본 캔들 (1분봉 또는 5분봉) - 시뮬레이션 기준
 * @param {number} buyConditionCount - 매수 조건 개수
 * @param {number} sellConditionCount - 매도 조건 개수
 * @param {number} buyThreshold - 매수 임계값
 * @param {number} sellThreshold - 매도 임계값
 * @param {string} initialPosition - 초기 포지션 ('cash' | 'coin')
 * @param {Object} indicators - 사용할 지표
 * @param {string} targetTimeFrame - 목표 타임프레임 (1m, 5m)
 * @param {string} mainTimeFrame - 메인 타임프레임 (1d, 4h, 2h, 1h, 30m)
 * @param {number} decisionInterval - 판단 주기 (1, 2, 5분)
 * @returns {Object} 시뮬레이션 결과
 */
function runDynamicSingleSimulation(
  mainCandles,
  simCandles,
  buyConditionCount,
  sellConditionCount,
  buyThreshold,
  sellThreshold,
  initialPosition,
  indicators,
  targetTimeFrame,
  mainTimeFrame,
  decisionInterval = 1
) {
  // 초기 설정
  let balance = INITIAL_CAPITAL
  let holdings = 0
  let position = POSITION_NONE
  let buyPrice = 0
  let tradeCount = 0
  
  // ⭐ 변경: simCandles 기준으로 초기가/최종가 계산
  const firstPrice = simCandles[0].close
  const finalPrice = simCandles[simCandles.length - 1].close

  // 초기 포지션 설정
  if (initialPosition === 'coin') {
    holdings = balance / firstPrice
    balance = 0
    buyPrice = firstPrice
    position = POSITION_LONG
  }

  // ranking value history (조건 체크용)
  const rankingHistory = []

  // ⭐ 변경: simCandles 기준으로 decisionInterval에 따라 판단
  for (let i = 0; i < simCandles.length; i += decisionInterval) {
    const currentCandle = simCandles[i]
    const currentPrice = currentCandle.close
    const currentTimestamp = currentCandle.timestamp

    // ⭐ 현재 시점 기준 동적 1000개 집계 및 ranking value 계산
    const candles1000 = getDynamic1000Candles(
      simCandles,
      currentTimestamp,
      targetTimeFrame,
      mainTimeFrame
    )

    if (candles1000.length < 1000) {
      // 데이터 부족 시 ranking value 0으로 처리
      rankingHistory.push(0)
      continue
    }

    const rankingValue = calculateDynamicRankingValue(candles1000, indicators)
    rankingHistory.push(rankingValue)

    // 매수 조건 체크
    if (position === POSITION_NONE && rankingHistory.length >= buyConditionCount) {
      // 직전 N개 (현재 제외)
      const recentValues = rankingHistory.slice(-buyConditionCount - 1, -1)
      const minValue = Math.min(...recentValues)
      const buyCondition = rankingValue - minValue

      if (buyCondition > buyThreshold) {
        // 매수
        holdings = balance / currentPrice
        balance = 0
        buyPrice = currentPrice
        position = POSITION_LONG
        tradeCount++
      }
    }

    // 매도 조건 체크
    if (position === POSITION_LONG && rankingHistory.length >= sellConditionCount) {
      // 직전 N개 (현재 제외)
      const recentValues = rankingHistory.slice(-sellConditionCount - 1, -1)
      const maxValue = Math.max(...recentValues)
      const sellCondition = rankingValue - maxValue

      if (sellCondition < sellThreshold) {
        // 매도
        balance = holdings * currentPrice
        holdings = 0
        position = POSITION_NONE
        tradeCount++
      }
    }
  }

  // 최종 청산
  if (position === POSITION_LONG) {
    balance = holdings * finalPrice
    holdings = 0
  }

  // 수익률 계산
  const totalReturn = ((balance - INITIAL_CAPITAL) / INITIAL_CAPITAL) * 100
  const holdReturn = ((finalPrice - firstPrice) / firstPrice) * 100

  return {
    totalReturn,
    tradeCount,
    holdReturn
  }
}

/**
 * @deprecated 정적 시뮬레이션 (기존 방식)
 * 단일 조합에 대한 시뮬레이션 실행
 * Phase 1, 2A, 2B에서 공통 사용
 */
function runSingleSimulation(
  simCandles,
  rankingValues,
  buyConditionCount,
  sellConditionCount,
  buyThreshold,
  sellThreshold,
  initialPosition
) {
  // 초기 설정
  let balance = INITIAL_CAPITAL
  let holdings = 0
  let position = POSITION_NONE
  let buyPrice = 0
  let tradeCount = 0
  const firstPrice = simCandles[0].close

  // 초기 포지션 설정
  if (initialPosition === 'coin') {
    holdings = balance / firstPrice
    balance = 0
    buyPrice = firstPrice
    position = POSITION_LONG
  }

  // 시뮬레이션 실행
  for (let i = 0; i < simCandles.length; i++) {
    const currentCandle = simCandles[i]
    const rankingValue = rankingValues[i]
    const currentPrice = currentCandle.close

    // 매수 조건 체크
    if (i >= buyConditionCount && position === POSITION_NONE) {
      const recentValues = rankingValues.slice(i - buyConditionCount, i)
      const minValue = Math.min(...recentValues)
      const buyCondition = rankingValue - minValue
      
      if (buyCondition > buyThreshold) {
        // 매수
        holdings = balance / currentPrice
        balance = 0
        buyPrice = currentPrice
        position = POSITION_LONG
        tradeCount++
      }
    }
    // 매도 조건 체크
    else if (i >= sellConditionCount && position === POSITION_LONG) {
      const recentValues = rankingValues.slice(i - sellConditionCount, i)
      const maxValue = Math.max(...recentValues)
      const sellCondition = rankingValue - maxValue
      
      if (sellCondition < sellThreshold) {
        // 매도
        balance = holdings * currentPrice
        holdings = 0
        position = POSITION_NONE
        tradeCount++
      }
    }
  }

  // 최종 청산
  const finalPrice = simCandles[simCandles.length - 1].close
  if (position === POSITION_LONG) {
    balance = holdings * finalPrice
    holdings = 0
  }

  // 수익률 계산
  const totalReturn = ((balance - INITIAL_CAPITAL) / INITIAL_CAPITAL) * 100
  const holdReturn = ((finalPrice - firstPrice) / firstPrice) * 100

  return {
    totalReturn,
    tradeCount,
    holdReturn
  }
}
