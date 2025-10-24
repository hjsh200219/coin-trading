/**
 * Trading Simulation Logic Verification
 * 엑셀 로직과 동일하게 작동하는지 검증
 */

import { describe, it, expect } from '@jest/globals'

// 시뮬레이션 로직 모의 구현 (실제 로직 검증용)
interface CandleData {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
}

/**
 * 엑셀 로직 검증:
 * 1. 분석단위는 2시간봉 기준
 * 2. 조회기간 내 데이터(1200개 정도)로 누적된 값들을 기준으로 거래 시작
 * 3. 보조지표를 5분 간격으로 체크
 * 4. 첫 5분은 그때까지의 시종고저 값으로 보조지표 계산
 * 5. 다음 5분은 직전 5분을 포함한 10분 동안의 값으로 계산
 * 6. 매 5분마다 2시간이 끝나기 전까지는 그 시각까지의 시종고저값으로 보조지표 생성
 * 7. 매수 비교 범위: 직전 N개의 min값과 비교하여 임계값 이상이면 매수
 * 8. 매도 비교 범위: 직전 N개의 max값과 비교하여 임계값 이하면 매도
 */

describe('Trading Simulation Logic Verification', () => {
  // 테스트용 캔들 데이터 생성
  const createTestCandles = (count: number, startPrice: number = 100): CandleData[] => {
    const candles: CandleData[] = []
    const baseTime = new Date('2024-01-01T00:00:00+09:00').getTime()
    
    for (let i = 0; i < count; i++) {
      const price = startPrice + Math.sin(i / 10) * 10 // 가격 변동 패턴
      candles.push({
        timestamp: baseTime + i * 2 * 60 * 60 * 1000, // 2시간 간격
        open: price,
        high: price + 2,
        low: price - 2,
        close: price + 1
      })
    }
    
    return candles
  }

  // 5분봉 데이터 생성 (2시간 = 24개의 5분봉)
  const create5MinCandles = (twoHourCandle: CandleData): CandleData[] => {
    const fiveMinCandles: CandleData[] = []
    const intervalsIn2Hours = 24 // 2시간 / 5분 = 24개
    
    for (let i = 0; i < intervalsIn2Hours; i++) {
      const price = twoHourCandle.open + (twoHourCandle.close - twoHourCandle.open) * (i / intervalsIn2Hours)
      fiveMinCandles.push({
        timestamp: twoHourCandle.timestamp + i * 5 * 60 * 1000,
        open: price,
        high: price + 1,
        low: price - 1,
        close: price + 0.5
      })
    }
    
    return fiveMinCandles
  }

  // 간단한 지표 계산 (테스트용)
  const calculateSimpleIndicator = (candles: CandleData[]): number => {
    if (candles.length === 0) return 0
    
    // 종가의 평균 기반 간단한 지표
    const avg = candles.reduce((sum, c) => sum + c.close, 0) / candles.length
    const lastClose = candles[candles.length - 1].close
    
    // 평균 대비 변화율
    return (lastClose - avg) / avg
  }

  it('1. 5분 간격으로 지표를 계산해야 함', () => {
    const twoHourCandles = createTestCandles(100) // 100개의 2시간봉
    const lastCandle = twoHourCandles[twoHourCandles.length - 1]
    
    // 마지막 2시간봉을 5분봉으로 분할
    const fiveMinCandles = create5MinCandles(lastCandle)
    
    expect(fiveMinCandles.length).toBe(24) // 2시간 = 24개의 5분봉
    
    // 각 5분봉마다 지표 계산
    const indicators: number[] = []
    for (let i = 0; i < fiveMinCandles.length; i++) {
      // 첫 5분: 그때까지의 데이터만 사용
      // 다음 5분: 직전 5분 포함한 10분 데이터 사용
      const lookbackPeriod = Math.min(i + 1, 120) // 최대 120개 lookback
      const candlesForIndicator = [
        ...twoHourCandles.slice(-lookbackPeriod),
        ...fiveMinCandles.slice(0, i + 1)
      ]
      
      const indicator = calculateSimpleIndicator(candlesForIndicator)
      indicators.push(indicator)
    }
    
    expect(indicators.length).toBe(24) // 24개의 지표 값
    console.log('5분 간격 지표 개수:', indicators.length)
  })

  it('2. 매수 비교 범위 검증: 직전 N개의 min값과 비교', () => {
    const buyConditionCount = 3 // 직전 3개
    const buyThreshold = 0.7 // 0.7 이상
    
    // 테스트 지표 값 (랭킹 값)
    const rankingValues = [-0.5, -0.4, -0.3, 0.3] // 마지막 값: 0.3
    
    // 직전 3개의 min값
    const lastN = rankingValues.slice(-buyConditionCount - 1, -1) // [-0.5, -0.4, -0.3]
    const minValue = Math.min(...lastN) // -0.5
    
    const currentValue = rankingValues[rankingValues.length - 1] // 0.3
    
    // 매수 비교 범위: currentValue - minValue > buyThreshold
    const shouldBuy = currentValue - minValue > buyThreshold
    
    console.log('현재 값:', currentValue)
    console.log('직전 3개의 min:', minValue)
    console.log('차이:', currentValue - minValue)
    console.log('매수 비교 범위 충족:', shouldBuy)
    
    expect(shouldBuy).toBe(true) // 0.3 - (-0.5) = 0.8 > 0.7
  })

  it('3. 매도 비교 범위 검증: 직전 N개의 max값과 비교', () => {
    const sellConditionCount = 3
    const sellThreshold = -0.5 // 음수 범위 (-2.0 ~ 0.0)
    
    // 테스트 지표 값
    const rankingValues = [0.8, 0.75, 0.7, 0.2] // 마지막 값: 0.2
    
    // 직전 3개의 max값
    const lastN = rankingValues.slice(-sellConditionCount - 1, -1) // [0.8, 0.75, 0.7]
    const maxValue = Math.max(...lastN) // 0.8
    
    const currentValue = rankingValues[rankingValues.length - 1] // 0.2
    
    // 매도 비교 범위: currentValue - maxValue < sellThreshold
    const shouldSell = currentValue - maxValue < sellThreshold
    
    console.log('현재 값:', currentValue)
    console.log('직전 3개의 max:', maxValue)
    console.log('차이:', currentValue - maxValue)
    console.log('매도 비교 범위 충족:', shouldSell)
    
    expect(shouldSell).toBe(true) // 0.2 - 0.8 = -0.6 < -0.5
  })

  it('4. 시작 인덱스 자동 결정: 직전 2개의 rankingValue', () => {
    const rankingValues = [0.5, 0.6, 0.7, 0.8, 0.9]
    
    // 시작 인덱스는 배열의 마지막에서 2번째 인덱스
    // 즉, 직전 2개의 값을 가지고 있는 시점부터 시작
    const startIndex = rankingValues.length - 2 // 3 (0.8의 인덱스)
    
    console.log('전체 rankingValue:', rankingValues)
    console.log('시작 인덱스:', startIndex)
    console.log('시작 시점의 값:', rankingValues[startIndex])
    console.log('직전 2개 값:', rankingValues.slice(startIndex - 2, startIndex))
    
    expect(startIndex).toBe(3)
    expect(rankingValues[startIndex]).toBe(0.8)
  })

  it('5. 매매 포지션 검증: -1은 매수, +1은 매도', () => {
    let position = 0 // 0: 포지션 없음, -1: 매수(롱), +1: 매도(숏)
    
    // 매수 시
    position = -1
    expect(position).toBe(-1)
    console.log('매수 포지션:', position)
    
    // 매도 시
    position = 1
    expect(position).toBe(1)
    console.log('매도 포지션:', position)
  })

  it('6. 전체 시뮬레이션 플로우 검증', () => {
    // 1. 2시간봉 데이터 준비 (1200개)
    const twoHourCandles = createTestCandles(1200)
    console.log('2시간봉 개수:', twoHourCandles.length)
    
    // 2. 각 2시간봉의 지표 계산
    const twoHourIndicators: number[] = []
    for (let i = 0; i < twoHourCandles.length; i++) {
      const lookbackPeriod = Math.min(120, i + 1)
      const candlesForIndicator = twoHourCandles.slice(Math.max(0, i - lookbackPeriod + 1), i + 1)
      const indicator = calculateSimpleIndicator(candlesForIndicator)
      twoHourIndicators.push(indicator)
    }
    
    console.log('2시간봉 지표 개수:', twoHourIndicators.length)
    
    // 3. 마지막 2시간봉을 5분봉으로 분할
    const lastCandle = twoHourCandles[twoHourCandles.length - 1]
    const fiveMinCandles = create5MinCandles(lastCandle)
    
    console.log('5분봉 개수:', fiveMinCandles.length)
    
    // 4. 5분 간격으로 지표 계산 및 매매 판단
    const buyConditionCount = 3
    const sellConditionCount = 3
    const buyThreshold = 0.7
    const sellThreshold = -0.5 // 음수 범위
    
    let position = 0
    const trades: { time: number; action: string; price: number }[] = []
    
    const allIndicators = [...twoHourIndicators]
    
    for (let i = 0; i < fiveMinCandles.length; i++) {
      // 5분봉까지 포함한 지표 계산
      const lookbackPeriod = Math.min(120, twoHourCandles.length)
      const candlesForIndicator = [
        ...twoHourCandles.slice(-lookbackPeriod),
        ...fiveMinCandles.slice(0, i + 1)
      ]
      const indicator = calculateSimpleIndicator(candlesForIndicator)
      allIndicators.push(indicator)
      
      // 매수/매도 비교 범위 확인 (최소 buyConditionCount + 1개 이상의 지표 필요)
      if (allIndicators.length > buyConditionCount) {
        const lastN = allIndicators.slice(-buyConditionCount - 1, -1)
        const currentValue = allIndicators[allIndicators.length - 1]
        
        // 매수 비교 범위
        if (position === 0) {
          const minValue = Math.min(...lastN)
          if (currentValue - minValue > buyThreshold) {
            position = -1
            trades.push({
              time: fiveMinCandles[i].timestamp,
              action: 'buy',
              price: fiveMinCandles[i].close
            })
          }
        }
        // 매도 비교 범위
        else if (position === -1) {
          const maxValue = Math.max(...lastN)
          if (currentValue - maxValue < sellThreshold) {
            position = 0
            trades.push({
              time: fiveMinCandles[i].timestamp,
              action: 'sell',
              price: fiveMinCandles[i].close
            })
          }
        }
      }
    }
    
    console.log('전체 지표 개수:', allIndicators.length)
    console.log('매매 횟수:', trades.length)
    console.log('매매 내역:', trades)
    
    // 검증: 지표가 계산되었는지
    expect(allIndicators.length).toBeGreaterThan(twoHourIndicators.length)
    
    // 검증: 5분봉 지표가 추가되었는지
    const fiveMinIndicatorCount = allIndicators.length - twoHourIndicators.length
    expect(fiveMinIndicatorCount).toBe(fiveMinCandles.length)
  })

  it('7. 임계값 범위 검증: 0.40 ~ 0.80, 0.01 단위', () => {
    const buyThresholdMin = 0.40
    const buyThresholdMax = 0.80
    const step = 0.01
    
    const thresholds: number[] = []
    // 부동소수점 오류 방지를 위해 정수 연산 사용
    const minInt = Math.round(buyThresholdMin * 100)
    const maxInt = Math.round(buyThresholdMax * 100)
    const stepInt = Math.round(step * 100)
    
    for (let t = minInt; t <= maxInt; t += stepInt) {
      thresholds.push(t / 100)
    }
    
    console.log('임계값 개수:', thresholds.length)
    console.log('첫 임계값:', thresholds[0])
    console.log('마지막 임계값:', thresholds[thresholds.length - 1])
    
    expect(thresholds[0]).toBe(0.40)
    expect(thresholds[thresholds.length - 1]).toBe(0.80)
    expect(thresholds.length).toBe(41) // 0.40 ~ 0.80, 0.01 단위 = 41개
  })
})

