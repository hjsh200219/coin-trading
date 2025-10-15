// 차트 관련 공통 타입 정의

export type TimeFrame = '30m' | '1h' | '2h' | '4h' | '1d'
export type Period = '1M' | '3M' | '6M' | '1Y' | '2Y' | '3Y'

export interface ChartControlsConfig {
  timeFrame: TimeFrame
  period: Period
  baseDate: Date
}

