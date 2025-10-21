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
        fiveMinCandles,
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
        fiveMinCandles,
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
        fiveMinCandles,
        buyConditionCount,
        sellConditionCount,
        buyThreshold,
        sellThreshold,
        indicators,
        initialPosition,
        baseDate,
        period
      } = data

      // 상세 내역 생성
      const result = runDetailedSimulation(
        mainCandles,
        fiveMinCandles,
        buyConditionCount,
        sellConditionCount,
        buyThreshold,
        sellThreshold,
        indicators,
        initialPosition,
        baseDate,
        period
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

// ===== 유틸리티 함수들 =====

function generateCandleData(mainCandles, fiveMinCandles) {
  if (fiveMinCandles && fiveMinCandles.length > 0) {
    return fiveMinCandles
  }
  return []
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
 * 활성화된 지표들을 계산하여 합산
 * Ranking Value 방식과 동일하게 처리
 */
function calculateRankingValue(candles, indicators) {
  if (candles.length === 0) return 0
  
  let totalValue = 0
  let activeCount = 0
  
  try {
    // 각 지표 계산 및 합산
    if (indicators.macd) {
      const macdValue = calculateMACD(candles)
      totalValue += macdValue
      activeCount++
    }
    
    if (indicators.rsi) {
      const rsiValue = calculateRSI(candles)
      // RSI를 -50 ~ +50 범위로 변환 (중심을 0으로)
      totalValue += (rsiValue - 50)
      activeCount++
    }
    
    if (indicators.ao) {
      const aoValue = calculateAO(candles)
      totalValue += aoValue
      activeCount++
    }
    
    if (indicators.DP) {
      const DPValue = calculateDP(candles, 20)
      totalValue += DPValue
      activeCount++
    }
    
    if (indicators.rti) {
      const rtiValue = calculateRTI(candles)
      // RTI도 -50 ~ +50 범위로 변환
      totalValue += (rtiValue - 50)
      activeCount++
    }
    
    // 활성화된 지표가 없으면 0 반환
    if (activeCount === 0) return 0
    
    return totalValue
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
  twoHourCandles,
  fiveMinCandles,
  config,
  cachedIndicatorValues,
  initialPosition = 'cash'
) {
  const trades = []
  const fiveMin = generateCandleData(twoHourCandles, fiveMinCandles)
  
  if (fiveMin.length === 0) {
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
    const firstPrice = fiveMin[0].close
    holdings = balance / firstPrice
    balance = 0
    buyPrice = firstPrice
  }

  const indicatorValues = cachedIndicatorValues || []

  const startIndex = Math.max(config.buyConditionCount, config.sellConditionCount)

  for (let i = startIndex; i < fiveMin.length; i++) {
    const indicatorValue = indicatorValues[i]
    const currentPrice = fiveMin[i].close

    // 매수 조건 체크
    if (position === 0 && i >= config.buyConditionCount) {
      // 현재 값을 제외한 직전 N개 (엑셀 로직)
      const recentValues = indicatorValues.slice(i - config.buyConditionCount, i)
      const { min } = calculateMinMax(recentValues)
      const buyCondition = min + (Math.abs(min) * config.buyThreshold)

      if (indicatorValue >= buyCondition) {
        holdings = balance / currentPrice
        buyPrice = currentPrice
        balance = 0
        position = 1
        trades.push({ 
          timestamp: fiveMin[i].timestamp, 
          action: 'buy', 
          price: currentPrice, 
          minValue: min, 
          threshold: config.buyThreshold 
        })
      }
    }

    // 매도 조건 체크
    if (position === 1 && i >= config.sellConditionCount) {
      // 현재 값을 제외한 직전 N개 (엑셀 로직)
      const recentValues = indicatorValues.slice(i - config.sellConditionCount, i)
      const { max } = calculateMinMax(recentValues)
      const sellCondition = max - (Math.abs(max) * config.sellThreshold)

      if (indicatorValue <= sellCondition) {
        balance = holdings * currentPrice
        holdings = 0
        position = 0
        trades.push({ 
          timestamp: fiveMin[i].timestamp, 
          action: 'sell', 
          price: currentPrice, 
          maxValue: max, 
          threshold: config.sellThreshold 
        })
      }
    }
  }

  const finalPrice = fiveMin[fiveMin.length - 1].close
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
  twoHourCandles,
  fiveMinCandles,
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
  
  const fiveMin = generateCandleData(twoHourCandles, fiveMinCandles)
  
  if (fiveMin.length === 0) {
    self.postMessage({
      type: 'ERROR',
      error: '5분봉 데이터가 없습니다.'
    })
    return
  }
  
  const cachedIndicatorValues = []
  const totalCandles = fiveMin.length
  
  for (let i = 0; i < fiveMin.length; i++) {
    const lookbackPeriod = Math.min(120, i + 1)
    const candlesForIndicator = fiveMin.slice(Math.max(0, i - lookbackPeriod + 1), i + 1)
    const indicatorValue = calculateRankingValue(candlesForIndicator, indicators) // indicators 사용 ✨
    cachedIndicatorValues.push(indicatorValue)
    
    // 지표 캐싱 진행률 (10% 단위로)
    if (i % Math.max(1, Math.floor(totalCandles / 10)) === 0 || i === totalCandles - 1) {
      const cacheProgress = ((i + 1) / totalCandles) * 100 * 0.1 // 전체의 10%까지
      self.postMessage({
        type: 'PROGRESS',
        progress: cacheProgress,
        message: `지표 계산 중... ${Math.floor((i + 1) / totalCandles * 100)}%`
      })
    }
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
        twoHourCandles,
        fiveMin,
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
  
  // 완료
  self.postMessage({
    type: 'COMPLETE',
    results: results,
    buyThresholds: buyThresholds,
    sellThresholds: sellThresholds
  })
}

/**
 * 상세 거래 내역 생성
 */
function runDetailedSimulation(
  twoHourCandles,
  fiveMinCandles,
  buyConditionCount,
  sellConditionCount,
  buyThreshold,
  sellThreshold,
  indicators,
  initialPosition = 'cash',
  baseDate = null,
  period = null
) {
  const fiveMin = generateCandleData(twoHourCandles, fiveMinCandles)
  
  if (fiveMin.length === 0) {
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
  let analysisStartPrice = fiveMin[0].close
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
    for (let i = 0; i < fiveMin.length; i++) {
      if (fiveMin[i].timestamp >= analysisStartTimestamp) {
        analysisStartPrice = fiveMin[i].close
        analysisStartIndex = i
        break
      }
    }
  }
  
  const firstPrice = fiveMin[0].close
  const initialPrice = analysisStartPrice  // 홀드 수익률 계산용
  
  // 코인 보유로 시작하는 경우
  if (initialPosition === 'coin') {
    holdings = balance / firstPrice
    balance = 0
    buyPrice = firstPrice
  }

  // 지표 값 저장 배열
  const indicatorValues = []

  // 각 5분 캔들마다 순회
  for (let i = 0; i < fiveMin.length; i++) {
    const currentCandle = fiveMin[i]
    
    // 지표 계산 (runGridSimulation과 동일한 lookback 로직 사용)
    const lookbackPeriod = Math.min(120, i + 1)
    const candlesForIndicator = fiveMin.slice(Math.max(0, i - lookbackPeriod + 1), i + 1)
    
    const rankingValue = calculateRankingValue(candlesForIndicator, indicators)
    indicatorValues.push(rankingValue)

    let decision = 'hold'
    const currentPrice = currentCandle.close
    
    // 분석 시작 시점 이전 데이터는 details에 포함하지 않음 (거래는 진행)
    const shouldIncludeInDetails = i >= analysisStartIndex

    // 매수/매도 판단 (runTradingSimulation과 동일한 로직)
    if (i >= config.buyConditionCount && position === 0) {
      // 현재 값을 제외한 직전 N개
      const recentValues = indicatorValues.slice(i - config.buyConditionCount, i)
      const minValue = Math.min(...recentValues)
      
      // 매수 조건: min + (|min| * threshold)
      const buyCondition = minValue + (Math.abs(minValue) * config.buyThreshold)
      
      if (rankingValue >= buyCondition) {
        // 매수
        holdings = balance / currentPrice
        balance = 0
        buyPrice = currentPrice
        position = 1
        decision = 'buy'
      }
    } else if (i >= config.sellConditionCount && position === 1) {
      // 현재 값을 제외한 직전 N개
      const recentValues = indicatorValues.slice(i - config.sellConditionCount, i)
      const maxValue = Math.max(...recentValues)
      
      // 매도 조건: max - (|max| * threshold)
      const sellCondition = maxValue - (Math.abs(maxValue) * config.sellThreshold)
      
      if (rankingValue <= sellCondition) {
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

      // 홀드 수익률 계산 (분석 시작 가격 기준)
      const holdReturn = ((currentPrice - initialPrice) / initialPrice) * 100

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
    analysisStartTimestamp: fiveMin[analysisStartIndex]?.timestamp || fiveMin[0].timestamp
  }
}
