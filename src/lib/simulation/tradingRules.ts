/**
 * Trading Rules - 매수/매도 로직 중앙 관리
 * 
 * ⚠️ 중요: 이 파일의 로직은 public/simulation-worker.js와 동일해야 합니다
 * Worker는 독립 실행되므로 이 파일을 import할 수 없지만, 로직은 동일하게 유지해야 합니다.
 */

import { POSITION_NONE, POSITION_LONG, INITIAL_CAPITAL } from './constants'

// ===== 타입 정의 =====

export interface TradingPosition {
  position: typeof POSITION_NONE | typeof POSITION_LONG
  balance: number
  holdings: number
  buyPrice: number
}

export interface BuyCondition {
  shouldBuy: boolean
  minValue: number
  buyCondition: number
  currentValue: number
}

export interface SellCondition {
  shouldSell: boolean
  maxValue: number
  sellCondition: number
  currentValue: number
}

// ===== Min/Max 계산 =====

/**
 * 배열에서 최소값과 최대값을 계산
 */
export function calculateMinMax(values: number[]): { min: number; max: number } {
  if (values.length === 0) return { min: 0, max: 0 }
  
  return {
    min: Math.min(...values),
    max: Math.max(...values)
  }
}

// ===== 매수 조건 판단 =====

/**
 * 매수 조건 체크
 * 
 * 로직:
 * 1. 직전 N개의 지표 값에서 최소값(min) 구하기
 * 2. 매수 기준값 = min + (|min| * buyThreshold)
 * 3. 현재 지표 값 >= 매수 기준값이면 매수
 * 
 * @param recentValues - 직전 N개의 지표 값 (현재 값 제외)
 * @param currentValue - 현재 지표 값
 * @param buyThreshold - 매수 임계값 (0.0 ~ 1.0)
 * @returns 매수 조건 판단 결과
 */
export function checkBuyCondition(
  recentValues: number[],
  currentValue: number,
  buyThreshold: number
): BuyCondition {
  const { min } = calculateMinMax(recentValues)
  
  // 매수 조건: min + (|min| * threshold)
  const buyCondition = min + (Math.abs(min) * buyThreshold)
  
  return {
    shouldBuy: currentValue >= buyCondition,
    minValue: min,
    buyCondition,
    currentValue
  }
}

// ===== 매도 조건 판단 =====

/**
 * 매도 조건 체크
 * 
 * 로직:
 * 1. 직전 N개의 지표 값에서 최대값(max) 구하기
 * 2. 매도 기준값 = max - (|max| * sellThreshold)
 * 3. 현재 지표 값 <= 매도 기준값이면 매도
 * 
 * @param recentValues - 직전 N개의 지표 값 (현재 값 제외)
 * @param currentValue - 현재 지표 값
 * @param sellThreshold - 매도 임계값 (0.0 ~ 1.0)
 * @returns 매도 조건 판단 결과
 */
export function checkSellCondition(
  recentValues: number[],
  currentValue: number,
  sellThreshold: number
): SellCondition {
  const { max } = calculateMinMax(recentValues)
  
  // 매도 조건: max - (|max| * threshold)
  const sellCondition = max - (Math.abs(max) * sellThreshold)
  
  return {
    shouldSell: currentValue <= sellCondition,
    maxValue: max,
    sellCondition,
    currentValue
  }
}

// ===== 매수 실행 =====

/**
 * 매수 실행
 * 
 * @param position - 현재 포지션 상태
 * @param currentPrice - 현재 가격
 * @returns 업데이트된 포지션 상태
 */
export function executeBuy(
  position: TradingPosition,
  currentPrice: number
): TradingPosition {
  return {
    position: POSITION_LONG,
    balance: 0,
    holdings: position.balance / currentPrice,
    buyPrice: currentPrice
  }
}

// ===== 매도 실행 =====

/**
 * 매도 실행
 * 
 * @param position - 현재 포지션 상태
 * @param currentPrice - 현재 가격
 * @returns 업데이트된 포지션 상태
 */
export function executeSell(
  position: TradingPosition,
  currentPrice: number
): TradingPosition {
  return {
    position: POSITION_NONE,
    balance: position.holdings * currentPrice,
    holdings: 0,
    buyPrice: 0
  }
}

// ===== 수익률 계산 =====

/**
 * 총 수익률 계산
 * 
 * @param initialCapital - 초기 자본
 * @param finalBalance - 최종 잔액
 * @param holdings - 보유 코인 수량
 * @param currentPrice - 현재 가격
 * @returns 수익률 (%)
 */
export function calculateTotalReturn(
  initialCapital: number,
  finalBalance: number,
  holdings: number,
  currentPrice: number
): number {
  const totalValue = finalBalance + (holdings * currentPrice)
  return ((totalValue - initialCapital) / initialCapital) * 100
}

// ===== 홀드 수익률 계산 =====

/**
 * 홀드(보유) 수익률 계산
 * 
 * @param startPrice - 시작 가격
 * @param currentPrice - 현재 가격
 * @returns 홀드 수익률 (%)
 */
export function calculateHoldReturn(
  startPrice: number,
  currentPrice: number
): number {
  return ((currentPrice - startPrice) / startPrice) * 100
}

// ===== 초기 포지션 설정 =====

/**
 * 초기 포지션 생성
 * 
 * @param type - 'cash' (현금) 또는 'coin' (코인)
 * @param initialPrice - 초기 가격 (코인으로 시작할 경우)
 * @returns 초기 포지션 상태
 */
export function createInitialPosition(
  type: 'cash' | 'coin',
  initialPrice: number
): TradingPosition {
  if (type === 'coin') {
    return {
      position: POSITION_LONG,
      balance: 0,
      holdings: INITIAL_CAPITAL / initialPrice,
      buyPrice: initialPrice
    }
  }
  
  return {
    position: POSITION_NONE,
    balance: INITIAL_CAPITAL,
    holdings: 0,
    buyPrice: 0
  }
}

// ===== 포지션 청산 =====

/**
 * 포지션 청산 (시뮬레이션 종료 시)
 * 
 * @param position - 현재 포지션
 * @param finalPrice - 최종 가격
 * @returns 청산된 포지션 (모든 코인을 현금으로 전환)
 */
export function liquidatePosition(
  position: TradingPosition,
  finalPrice: number
): TradingPosition {
  if (position.position === POSITION_LONG) {
    return {
      position: POSITION_NONE,
      balance: position.holdings * finalPrice,
      holdings: 0,
      buyPrice: 0
    }
  }
  
  return position
}

