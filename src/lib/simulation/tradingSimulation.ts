/**
 * Trading Simulation Logic
 * 2시간 봉 기반의 5분 간격 매매 시뮬레이션
 * 
 * 매수/매도 로직은 @/lib/simulation/tradingRules에 정의되어 있습니다
 * 상수는 @/lib/simulation/constants에 정의되어 있습니다
 */

import { calculateRSI, calculateMACD, calculateAO, calculateDP, calculateRTI } from '@/lib/indicators/calculator'
import type { Candle } from '@/lib/bithumb/types'
import {
  INITIAL_CAPITAL,
  MAX_LOOKBACK_PERIOD,
  BATCH_SIZE,
  UI_UPDATE_DELAY,
  THRESHOLD_STEP,
  POSITION_NONE,
  POSITION_LONG,
} from './constants'
import {
  checkBuyCondition,
  checkSellCondition,
  executeBuy,
  executeSell,
  calculateTotalReturn,
  liquidatePosition,
  createInitialPosition,
  type TradingPosition,
} from './tradingRules'

export interface CandleData {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
}

export interface SimulationConfig {
  buyConditionCount: number // 매수 비교 범위 개수 (예: 3)
  buyThreshold: number // 매수 임계값 (0.0 ~ 2.0)
  sellConditionCount: number // 매도 비교 범위 개수 (예: 3)
  sellThreshold: number // 매도 임계값 (-2.0 ~ 0.0, 음수 범위)
  initialPosition?: 'cash' | 'coin' // 초기 포지션 (기본값: 'cash')
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

// calculateMinMax는 tradingRules에서 import하여 사용
export { calculateMinMax } from './tradingRules'

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
  
  // 5분봉 데이터 생성
  const fiveMin = generate5MinCandles(twoHourCandles, fiveMinCandles)
  
  // 데이터 검증
  if (fiveMin.length === 0) {
    return {
      totalReturn: 0,
      tradeCount: 0,
      trades: [],
      finalBalance: INITIAL_CAPITAL
    }
  }
  
  // 초기 포지션 설정 (createInitialPosition 사용)
  const initialPrice = fiveMin[0].close
  let tradingPosition: TradingPosition = createInitialPosition(
    config.initialPosition || 'cash',
    initialPrice
  )
  
  // 지표 값 (캐시가 있으면 사용, 없으면 계산)
  const indicatorValues: number[] = cachedIndicatorValues || []
  
  // 캐시가 없을 경우에만 지표 계산 (MAX_LOOKBACK_PERIOD 사용)
  if (!cachedIndicatorValues) {
    for (let i = 0; i < fiveMin.length; i++) {
      const lookbackPeriod = Math.min(MAX_LOOKBACK_PERIOD, i + 1)
      const candlesForIndicator = fiveMin.slice(Math.max(0, i - lookbackPeriod + 1), i + 1)
      const indicatorValue = calculateIndicatorValue(candlesForIndicator, 'RTI')
      indicatorValues.push(indicatorValue)
    }
  }
  
  // 시작 인덱스 자동 계산: max(buyConditionCount, sellConditionCount) 이후부터
  const startIndex = Math.max(config.buyConditionCount, config.sellConditionCount)
  
  // 시작 인덱스부터 시뮬레이션 (중앙화된 tradingRules 사용)
  for (let i = startIndex; i < fiveMin.length; i++) {
    const indicatorValue = indicatorValues[i]
    const currentPrice = fiveMin[i].close
    
    // 매수 비교 범위 체크 (tradingRules.checkBuyCondition 사용)
    if (tradingPosition.position === POSITION_NONE && i >= config.buyConditionCount) {
      // 현재 값을 제외한 직전 N개 (엑셀 로직)
      const recentValues = indicatorValues.slice(i - config.buyConditionCount, i)
      const buyCheck = checkBuyCondition(recentValues, indicatorValue, config.buyThreshold)
      
      if (buyCheck.shouldBuy) {
        // tradingRules.executeBuy 사용
        tradingPosition = executeBuy(tradingPosition, currentPrice)
        
        trades.push({
          timestamp: fiveMin[i].timestamp,
          action: 'buy',
          price: currentPrice,
          minValue: buyCheck.minValue,
          threshold: config.buyThreshold
        })
      }
    }
    
    // 매도 비교 범위 체크 (tradingRules.checkSellCondition 사용)
    if (tradingPosition.position === POSITION_LONG && i >= config.sellConditionCount) {
      // 현재 값을 제외한 직전 N개 (엑셀 로직)
      const recentValues = indicatorValues.slice(i - config.sellConditionCount, i)
      const sellCheck = checkSellCondition(recentValues, indicatorValue, config.sellThreshold)
      
      if (sellCheck.shouldSell) {
        // tradingRules.executeSell 사용
        tradingPosition = executeSell(tradingPosition, currentPrice)
        
        trades.push({
          timestamp: fiveMin[i].timestamp,
          action: 'sell',
          price: currentPrice,
          maxValue: sellCheck.maxValue,
          threshold: config.sellThreshold
        })
      }
    }
  }
  
  // 마지막에 포지션이 있으면 청산 (tradingRules.liquidatePosition 사용)
  const finalPrice = fiveMin[fiveMin.length - 1].close
  tradingPosition = liquidatePosition(tradingPosition, finalPrice)
  
  // 수익률 계산 (tradingRules.calculateTotalReturn 사용)
  const totalReturn = calculateTotalReturn(
    INITIAL_CAPITAL,
    tradingPosition.balance,
    tradingPosition.holdings,
    finalPrice
  )
  
  return {
    totalReturn,
    tradeCount: trades.length,
    trades,
    finalBalance: tradingPosition.balance
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
  
  // 매수 임계값 배열 생성 (사용자 지정 범위, THRESHOLD_STEP 단위)
  for (let t = buyThresholdMin; t <= buyThresholdMax; t += THRESHOLD_STEP) {
    buyThresholds.push(Math.round(t * 100) / 100)
  }
  
  // 매도 임계값 배열 생성 (사용자 지정 범위, THRESHOLD_STEP 단위)
  for (let t = sellThresholdMin; t <= sellThresholdMax; t += THRESHOLD_STEP) {
    sellThresholds.push(Math.round(t * 100) / 100)
  }
  
  const totalIterations = buyThresholds.length * sellThresholds.length
  let currentIteration = 0
  
  // ⚡ 성능 최적화: 지표를 한 번만 계산하고 캐싱
  const fiveMin = generate5MinCandles(twoHourCandles, fiveMinCandles)
  
  if (fiveMin.length === 0) {
    return null
  }
  
  const cachedIndicatorValues: number[] = []
  
  // MAX_LOOKBACK_PERIOD 사용하여 지표 계산
  for (let i = 0; i < fiveMin.length; i++) {
    const lookbackPeriod = Math.min(MAX_LOOKBACK_PERIOD, i + 1)
    const candlesForIndicator = fiveMin.slice(Math.max(0, i - lookbackPeriod + 1), i + 1)
    const indicatorValue = calculateIndicatorValue(candlesForIndicator, 'RTI')
    cachedIndicatorValues.push(indicatorValue)
  }
  
  // 각 매수/매도 임계값 조합에 대해 시뮬레이션 (BATCH_SIZE는 constants에서 import)
  for (let i = 0; i < buyThresholds.length; i++) {
    const buyThreshold = buyThresholds[i]
    const row: GridSimulationResult[] = []
    
    for (let j = 0; j < sellThresholds.length; j++) {
      // 취소 확인
      if (shouldCancel && shouldCancel()) {
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
        // 브라우저가 UI를 업데이트할 시간 제공 (UI_UPDATE_DELAY)
        await new Promise(resolve => setTimeout(resolve, UI_UPDATE_DELAY))
      }
    }
    
    results.push(row)
  }
  
  // 최종 진행률
  if (onProgress) {
    onProgress(100)
  }
  
  return results
}

