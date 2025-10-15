// 업비트 API 타입 정의

/**
 * 업비트 시세 정보
 * 업비트 API 응답 필드명을 그대로 사용
 */
export interface UpbitTicker {
  market: string // 마켓 코드 (KRW-BTC)
  trade_date: string // 최근 거래 일자(UTC) (yyyyMMdd)
  trade_time: string // 최근 거래 시각(UTC) (HHmmss)
  trade_date_kst: string // 최근 거래 일자(KST) (yyyyMMdd)
  trade_time_kst: string // 최근 거래 시각(KST) (HHmmss)
  trade_timestamp: number // 최근 거래 타임스탬프 (ms)
  opening_price: number // 시가
  high_price: number // 고가
  low_price: number // 저가
  trade_price: number // 종가(현재가)
  prev_closing_price: number // 전일 종가
  change: 'RISE' | 'EVEN' | 'FALL' // 전일 대비 (RISE: 상승, EVEN: 보합, FALL: 하락)
  change_price: number // 전일 대비 값
  change_rate: number // 전일 대비 등락률
  signed_change_price: number // 부호가 있는 전일 대비 값
  signed_change_rate: number // 부호가 있는 전일 대비 등락률
  trade_volume: number // 가장 최근 거래량
  acc_trade_price: number // 누적 거래대금(UTC 0시 기준)
  acc_trade_price_24h: number // 24시간 누적 거래대금
  acc_trade_volume: number // 누적 거래량(UTC 0시 기준)
  acc_trade_volume_24h: number // 24시간 누적 거래량
  highest_52_week_price: number // 52주 최고가
  highest_52_week_date: string // 52주 최고가 달성일
  lowest_52_week_price: number // 52주 최저가
  lowest_52_week_date: string // 52주 최저가 달성일
  timestamp: number // 타임스탬프 (ms)
}

/**
 * 업비트 마켓 정보
 */
export interface UpbitMarket {
  market: string // 업비트에서 제공중인 시장 정보
  korean_name: string // 거래 대상 암호화폐 한글명
  english_name: string // 거래 대상 암호화폐 영문명
}

/**
 * 업비트 캔들 데이터 (분봉)
 */
export interface UpbitMinuteCandle {
  market: string // 마켓명
  candle_date_time_utc: string // 캔들 기준 시각(UTC)
  candle_date_time_kst: string // 캔들 기준 시각(KST)
  opening_price: number // 시가
  high_price: number // 고가
  low_price: number // 저가
  trade_price: number // 종가
  timestamp: number // 타임스탬프(ms)
  candle_acc_trade_price: number // 누적 거래 금액
  candle_acc_trade_volume: number // 누적 거래량
  unit: number // 분 단위
}

/**
 * 업비트 캔들 데이터 (일봉)
 */
export interface UpbitDayCandle {
  market: string // 마켓명
  candle_date_time_utc: string // 캔들 기준 시각(UTC)
  candle_date_time_kst: string // 캔들 기준 시각(KST)
  opening_price: number // 시가
  high_price: number // 고가
  low_price: number // 저가
  trade_price: number // 종가
  timestamp: number // 타임스탬프(ms)
  candle_acc_trade_price: number // 누적 거래 금액
  candle_acc_trade_volume: number // 누적 거래량
  prev_closing_price: number // 전일 종가
  change_price: number // 전일 대비
  change_rate: number // 전일 대비 등락률
}

/**
 * 공통 Candle 타입으로 변환
 */
export interface Candle {
  timestamp: number
  open: number
  close: number
  high: number
  low: number
  volume: number
}

// 빗썸 MAJOR_COINS를 업비트 마켓 코드로 변환
import { MAJOR_COINS } from '@/lib/bithumb/types'

/**
 * 업비트 심볼 매핑 (빗썸과 다른 경우)
 * 예: 빗썸의 MATIC은 업비트에서 POL로 거래됨
 */
const UPBIT_SYMBOL_MAP: Record<string, string> = {
  MATIC: 'POL', // Polygon 리브랜딩
}

/**
 * 업비트 마켓 코드 생성
 * @param symbol 코인 심볼 (BTC, ETH 등)
 * @returns 업비트 마켓 코드 (KRW-BTC)
 */
export function getUpbitMarketCode(symbol: string): string {
  const upbitSymbol = UPBIT_SYMBOL_MAP[symbol] || symbol
  return `KRW-${upbitSymbol}`
}

/**
 * 업비트에서 조회할 주요 코인 마켓 코드 목록
 */
export const UPBIT_MAJOR_MARKETS = MAJOR_COINS.map((coin) =>
  getUpbitMarketCode(coin.symbol)
)

