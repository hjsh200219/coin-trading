// 차트 관련 공통 타입 정의

export type TimeFrame = '1m' | '5m' | '10m' | '30m' | '1h' | '2h' | '4h' | '1d' | '1w'
export type Period = '1M' | '3M' | '6M' | '1Y' | '2Y' | '3Y'
export type Exchange = 'bithumb' | 'upbit' | 'binance'

export interface ChartControlsConfig {
  timeFrame: TimeFrame
  period: Period
  baseDate: Date
}

// 시뮬레이션 Ranking Value 타입
export interface RankingDataPoint {
  timestamp: number // KST 기준 시작 시간
  macd: number | null // MACD 값
  rsi: number | null // RSI 값
  ao: number | null // Awesome Oscillator 값
  DP: number | null // DP 값
  rti: number | null // RTI 값
  rankingValue: number // 계산된 랭킹 값
}

// 보조지표 활성화 설정
export interface IndicatorConfig {
  macd: boolean
  rsi: boolean
  ao: boolean
  DP: boolean
  rti: boolean
}

export interface RankingAnalysisConfig {
  period: Period // 분석 기간
  timeFrame: TimeFrame // 분석 단위
  exchange: Exchange // 거래소
}

