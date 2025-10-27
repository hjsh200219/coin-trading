/**
 * Trading Simulation Constants
 * 시뮬레이션 관련 모든 상수를 중앙 관리
 */

// ===== 초기 설정 =====
export const INITIAL_CAPITAL = 1000000 // 초기 자본 (100만원)

// ===== 지표 계산 =====
export const MAX_LOOKBACK_PERIOD = 120 // 최대 lookback 기간 (캔들 개수)
export const RSI_PERIOD = 14 // RSI 계산 기간

// ===== Ranking Value 계산 =====
export const LOOKBACK_WINDOW = 1000 // Z-Score 계산용 슬라이딩 윈도우 크기
// 4시간봉: 1000개 = 약 168일
// 2시간봉: 1000개 = 약 84일
// 1시간봉: 1000개 = 약 42일
// 30분봉: 1000개 = 약 21일

// ===== 시뮬레이션 성능 =====
export const BATCH_SIZE = 10 // 배치 처리 크기 (진행률 업데이트 간격)
export const UI_UPDATE_DELAY = 10 // UI 업데이트 딜레이 (ms)

// ===== 임계값 설정 =====
export const THRESHOLD_STEP = 0.01 // 임계값 단위 (0.01 = 1%)
export const DEFAULT_BUY_THRESHOLD_MIN = 0.0
export const DEFAULT_BUY_THRESHOLD_MAX = 2.0
export const DEFAULT_SELL_THRESHOLD_MIN = -2.0
export const DEFAULT_SELL_THRESHOLD_MAX = 0.0

// ===== 거래 포지션 =====
export const POSITION_NONE = 0 // 포지션 없음
export const POSITION_LONG = 1 // 매수 포지션

// ===== 지표 타입 =====
export const INDICATOR_TYPES = ['RSI', 'MACD', 'AO', 'DP', 'RTI'] as const
export type IndicatorType = typeof INDICATOR_TYPES[number]

// ===== 기본 지표 설정 =====
export const DEFAULT_INDICATOR = 'RTI' as IndicatorType

