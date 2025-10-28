/**
 * 단계별 시뮬레이션 타입 정의
 * Progressive Simulation Strategy Types
 */

import type { Exchange, Period, TimeFrame, IndicatorConfig } from './chart'

// ===== Phase 1: 대칭 탐색 =====

export interface Phase1Result {
  conditionCount: number  // 1~10
  thresholdValue: number  // 0.2~2.0
  buyThreshold: number    // thresholdValue
  sellThreshold: number   // -thresholdValue
  totalReturn: number     // 수익률 (%)
  tradeCount: number      // 거래 횟수
  holdReturn: number      // 홀드 수익률 (%)
}

export interface Phase1Config {
  exchange: Exchange
  period: Period
  timeFrame: TimeFrame
  baseDate: string
  indicators: IndicatorConfig
  initialPosition: 'cash' | 'coin'
  decimalPlaces: 2 | 3
}

export interface Phase1Grid {
  results: Phase1Result[][]  // [조건 개수][임계값] 2차원 배열
  minReturn: number
  maxReturn: number
  bestResult: Phase1Result   // 최고 수익률 결과
  conditionCounts: number[]  // 조건 개수 배열 (예: [1,2,3,...,10])
  thresholdValues: number[]  // 임계값 배열 (예: [0.20, 0.25, ..., 2.00])
  config: Phase1Config
}

// ===== Phase 2A: 매수 미세 조정 =====

export interface Phase2AResult {
  buyConditionCount: number   // 탐색 범위 내
  buyThreshold: number        // 탐색 범위 내
  sellConditionCount: number  // Phase 1 고정값
  sellThreshold: number       // Phase 1 고정값
  totalReturn: number
  tradeCount: number
  holdReturn: number
}

export interface Phase2AGrid {
  results: Phase2AResult[][]  // [매수 조건][매수 임계값] 2차원 배열
  minReturn: number
  maxReturn: number
  bestResult: Phase2AResult
  buyConditionCounts: number[]
  buyThresholds: number[]
  fixedSellCondition: number
  fixedSellThreshold: number
  phase1Baseline: Phase1Result  // 비교 기준
  config: Phase1Config
}

// ===== Phase 2B: 매도 미세 조정 =====

export interface Phase2BResult {
  buyConditionCount: number   // Phase 1 고정값
  buyThreshold: number        // Phase 1 고정값
  sellConditionCount: number  // 탐색 범위 내
  sellThreshold: number       // 탐색 범위 내
  totalReturn: number
  tradeCount: number
  holdReturn: number
}

export interface Phase2BGrid {
  results: Phase2BResult[][]  // [매도 조건][매도 임계값] 2차원 배열
  minReturn: number
  maxReturn: number
  bestResult: Phase2BResult
  sellConditionCounts: number[]
  sellThresholds: number[]
  fixedBuyCondition: number
  fixedBuyThreshold: number
  phase1Baseline: Phase1Result
  config: Phase1Config
}

// ===== 캐싱 =====

export interface SimulationCache {
  // Phase 1 완료 후 캐시
  phase1: {
    mainCandles: { timestamp: number; open: number; high: number; low: number; close: number; volume: number }[]
    simulationCandles: { timestamp: number; open: number; high: number; low: number; close: number; volume: number }[]
    indicatorValues: number[]  // 계산된 지표 값 (중요!)
    config: Phase1Config
    results: Phase1Grid
  }
  
  // Phase 2A 완료 후 캐시
  phase2a?: {
    results: Phase2AGrid
    timestamp: number
  }
  
  // Phase 2B 완료 후 캐시
  phase2b?: {
    results: Phase2BGrid
    timestamp: number
  }
}

// ===== 시뮬레이션 Phase =====

export type SimulationPhase = 'phase1' | 'phase2a' | 'phase2b' | null

// ===== 저장된 조건 =====

export interface SavedCondition {
  id: string
  name: string
  buyConditionCount: number
  buyThreshold: number
  sellConditionCount: number
  sellThreshold: number
  expectedReturn: number
  tradeCount: number
  source: 'phase1' | 'phase2a' | 'phase2b'
  createdAt: number
  memo?: string
}

export interface SavedConditionsList {
  conditions: SavedCondition[]
}

// ===== 거래 내역 =====

export interface Trade {
  timestamp: number
  type: 'buy' | 'sell'
  price: number
  position: 'cash' | 'coin'
  balance: number
  profit?: number
  profitRate?: number
}

export interface TradeDetail {
  buyConditionCount: number
  buyThreshold: number
  sellConditionCount: number
  sellThreshold: number
  totalReturn: number
  tradeCount: number
  holdReturn: number
  trades: Trade[]
  priceData: {
    timestamp: number
    price: number
  }[]
}

