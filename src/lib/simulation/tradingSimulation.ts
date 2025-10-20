/**
 * Trading Simulation Logic
 * 2시간 봉 기반의 5분 간격 매매 시뮬레이션
 */

import { calculateRSI, calculateMACD, calculateAO, calculateDP, calculateRTI } from '@/lib/indicators/calculator'
import type { Candle } from '@/lib/bithumb/types'

export interface CandleData {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
}

export interface SimulationConfig {
  buyConditionCount: number // 매수 조건 개수 (예: 3)
  buyThreshold: number // 매수 임계값 (예: 0.7)
  sellConditionCount: number // 매도 조건 개수 (예: 3)
  sellThreshold: number // 매도 임계값 (예: 0.46)
}

export interface TradeRecord {
  timestamp: number
  action: 'buy' | 'sell'
  price: number
  minValue?: number
  maxValue?: number
  threshold?: number
}

export interface SimulationResult {
  totalReturn: number // 총 수익률 (%)
  tradeCount: number
  trades: TradeRecord[]
  finalBalance: number
}

/**
 * 5분 간격 시뮬레이션용 캔들 데이터 생성
 * 실제 5분봉 데이터 사용
 */
export function generate5MinCandles(
  twoHourCandles: CandleData[],
  fiveMinCandles: CandleData[]
): CandleData[] {
  // 실제 5분봉 데이터 사용
  if (fiveMinCandles && fiveMinCandles.length > 0) {
    return fiveMinCandles
  }

  // 5분봉 데이터가 없으면 빈 배열 반환 (시뮬레이션 불가)
  return []
}

/**
 * 실제 보조지표 계산
 * indicators/calculator.ts의 함수를 사용
 */
export function calculateIndicatorValue(
  candles: CandleData[],
  indicatorType: 'RTI' | 'AO' | 'MACD' | 'RSI' | 'DP'
): number {
  if (candles.length === 0) return 0

  // CandleData를 Candle 형식으로 변환
  const candleData: Candle[] = candles.map(c => ({
    timestamp: c.timestamp,
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
    volume: 0 // 볼륨은 시뮬레이션에 사용하지 않음
  }))

  try {
    switch (indicatorType) {
      case 'RSI': {
        const rsiValues = calculateRSI(candleData, 14)
        return rsiValues && rsiValues.length > 0 ? rsiValues[rsiValues.length - 1] : 0
      }
      case 'MACD': {
        const macdResult = calculateMACD(candleData)
        return macdResult && macdResult.histogram.length > 0 
          ? macdResult.histogram[macdResult.histogram.length - 1] 
          : 0
      }
      case 'AO': {
        const aoValues = calculateAO(candleData)
        return aoValues && aoValues.length > 0 ? aoValues[aoValues.length - 1] : 0
      }
      case 'DP': {
        const DPResult = calculateDP(candleData)
        return DPResult && DPResult.values.length > 0 
          ? DPResult.values[DPResult.values.length - 1] 
          : 0
      }
      case 'RTI': {
        const rtiResult = calculateRTI(candleData)
        return rtiResult && rtiResult.rti.length > 0 
          ? rtiResult.rti[rtiResult.rti.length - 1] 
          : 0
      }
      default:
        return 0
    }
  } catch {
    // 에러 발생 시 0 반환 (그리드 시뮬레이션 중 로그 과다 방지)
    return 0
  }
}

/**
 * Min/Max 값 계산
 */
export function calculateMinMax(values: number[]): { min: number; max: number } {
  if (values.length === 0) return { min: 0, max: 0 }
  
  return {
    min: Math.min(...values),
    max: Math.max(...values)
  }
}

/**
 * 매매 시뮬레이션 실행
 * @param cachedIndicatorValues - 미리 계산된 지표 값 배열 (성능 최적화용)
 */
export function runTradingSimulation(
  twoHourCandles: CandleData[],
  fiveMinCandles: CandleData[],
  config: SimulationConfig,
  cachedIndicatorValues?: number[]
): SimulationResult {
  const trades: TradeRecord[] = []
  let position = 0 // 0: 보유 없음, 1: 매수 상태
  let balance = 1000000 // 초기 자본 100만원
  let holdings = 0 // 보유 코인 수량
  let buyPrice = 0

  // 5분봉 데이터 생성
  const fiveMin = generate5MinCandles(twoHourCandles, fiveMinCandles)
  
  // 데이터 검증
  if (fiveMin.length === 0) {
    return {
      totalReturn: 0,
      tradeCount: 0,
      trades: [],
      finalBalance: balance
    }
  }
  
  // 지표 값 (캐시가 있으면 사용, 없으면 계산)
  const indicatorValues: number[] = cachedIndicatorValues || []
  
  // 캐시가 없을 경우에만 지표 계산
  if (!cachedIndicatorValues) {
    for (let i = 0; i < fiveMin.length; i++) {
      const lookbackPeriod = Math.min(120, i + 1)
      const candlesForIndicator = fiveMin.slice(Math.max(0, i - lookbackPeriod + 1), i + 1)
      const indicatorValue = calculateIndicatorValue(candlesForIndicator, 'RTI')
      indicatorValues.push(indicatorValue)
    }
  }
  
  // 시작 인덱스 자동 계산: max(buyConditionCount, sellConditionCount) 이후부터
  const startIndex = Math.max(config.buyConditionCount, config.sellConditionCount)
  
  // 시작 인덱스부터 시뮬레이션
  for (let i = startIndex; i < fiveMin.length; i++) {
    const indicatorValue = indicatorValues[i]
    const currentPrice = fiveMin[i].close
    
    // 매수 조건 체크
    if (position === 0 && i >= config.buyConditionCount) {
      // 현재 값을 제외한 직전 N개 (엑셀 로직)
      const recentValues = indicatorValues.slice(i - config.buyConditionCount, i)
      const { min } = calculateMinMax(recentValues)
      
      // 매수 조건: 현재 값이 min 대비 buyThreshold 이상
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
      
      // 현재 값이 max 대비 sellThreshold 이하면 매도
      if (indicatorValue <= max - (Math.abs(max) * config.sellThreshold)) {
        balance = holdings * currentPrice
        const profit = balance - (holdings * buyPrice)
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
  
  // 마지막에 포지션이 있으면 청산
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

/**
 * 매수/매도 임계값 범위(0.300~0.800)에 대한 전체 시뮬레이션
 */
export interface GridSimulationResult {
  buyThreshold: number
  sellThreshold: number
  totalReturn: number
  tradeCount: number
}

export async function runGridSimulation(
  twoHourCandles: CandleData[],
  fiveMinCandles: CandleData[],
  buyConditionCount: number,
  sellConditionCount: number,
  buyThresholdMin: number,
  buyThresholdMax: number,
  sellThresholdMin: number,
  sellThresholdMax: number,
  onProgress?: (progress: number) => void,
  shouldCancel?: () => boolean
): Promise<GridSimulationResult[][] | null> {
  const results: GridSimulationResult[][] = []
  const buyThresholds: number[] = []
  const sellThresholds: number[] = []
  
  // 매수 임계값 배열 생성 (사용자 지정 범위, 0.01 단위)
  for (let t = buyThresholdMin; t <= buyThresholdMax; t += 0.01) {
    buyThresholds.push(Math.round(t * 100) / 100)
  }
  
  // 매도 임계값 배열 생성 (사용자 지정 범위, 0.01 단위)
  for (let t = sellThresholdMin; t <= sellThresholdMax; t += 0.01) {
    sellThresholds.push(Math.round(t * 100) / 100)
  }
  
  const totalIterations = buyThresholds.length * sellThresholds.length
  let currentIteration = 0
  
  console.log('그리드 시뮬레이션 시작:', {
    buyThresholds: buyThresholds.length,
    sellThresholds: sellThresholds.length,
    totalIterations
  })
  
  // ⚡ 성능 최적화: 지표를 한 번만 계산하고 캐싱
  const fiveMin = generate5MinCandles(twoHourCandles, fiveMinCandles)
  
  if (fiveMin.length === 0) {
    console.error('5분봉 데이터가 없습니다.')
    return null
  }
  
  console.log('지표 캐싱 시작...', { candleCount: fiveMin.length })
  const cachedIndicatorValues: number[] = []
  
  for (let i = 0; i < fiveMin.length; i++) {
    const lookbackPeriod = Math.min(120, i + 1)
    const candlesForIndicator = fiveMin.slice(Math.max(0, i - lookbackPeriod + 1), i + 1)
    const indicatorValue = calculateIndicatorValue(candlesForIndicator, 'RTI')
    cachedIndicatorValues.push(indicatorValue)
  }
  
  console.log('지표 캐싱 완료!', { values: cachedIndicatorValues.length })
  
  // 배치 크기 (한 번에 처리할 개수)
  const BATCH_SIZE = 10
  
  // 각 매수/매도 임계값 조합에 대해 시뮬레이션
  for (let i = 0; i < buyThresholds.length; i++) {
    const buyThreshold = buyThresholds[i]
    const row: GridSimulationResult[] = []
    
    for (let j = 0; j < sellThresholds.length; j++) {
      // 취소 확인
      if (shouldCancel && shouldCancel()) {
        console.log('시뮬레이션이 사용자에 의해 취소되었습니다.')
        return null
      }
      
      const sellThreshold = sellThresholds[j]
      
      const config: SimulationConfig = {
        buyConditionCount,
        buyThreshold,
        sellConditionCount,
        sellThreshold
      }
      
      // 캐시된 지표 값을 사용하여 시뮬레이션 (매우 빠름!)
      const result = runTradingSimulation(
        twoHourCandles,
        fiveMinCandles,
        config,
        cachedIndicatorValues // 캐시된 값 전달
      )
      
      row.push({
        buyThreshold,
        sellThreshold,
        totalReturn: result.totalReturn,
        tradeCount: result.tradeCount
      })
      
      // 진행률 보고 및 배치 처리
      currentIteration++
      
      // 배치마다 UI 업데이트 시간 확보
      if (currentIteration % BATCH_SIZE === 0) {
        const progress = (currentIteration / totalIterations) * 100
        if (onProgress) {
          onProgress(progress)
        }
        // 브라우저가 UI를 업데이트할 시간 제공 (10ms = 약 100fps)
        await new Promise(resolve => setTimeout(resolve, 10))
      }
    }
    
    results.push(row)
  }
  
  // 최종 진행률
  if (onProgress) {
    onProgress(100)
  }
  
  console.log('그리드 시뮬레이션 완료:', {
    결과수: results.length * (results[0]?.length || 0),
    매수범위: `${buyThresholdMin} ~ ${buyThresholdMax}`,
    매도범위: `${sellThresholdMin} ~ ${sellThresholdMax}`
  })
  
  return results
}

