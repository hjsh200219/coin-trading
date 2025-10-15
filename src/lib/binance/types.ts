// 바이낸스 API 타입 정의

export interface BinanceTicker {
  symbol: string // 거래쌍 (BTCUSDT)
  priceChange: string // 24시간 가격 변동
  priceChangePercent: string // 24시간 가격 변동률
  lastPrice: string // 최근 거래 가격
  highPrice: string // 24시간 최고가
  lowPrice: string // 24시간 최저가
  volume: string // 24시간 거래량 (코인)
  quoteVolume: string // 24시간 거래대금 (USDT)
  openPrice: string // 24시간 시작 가격
  openTime: number // 24시간 시작 시간
  closeTime: number // 24시간 종료 시간
}

// 바이낸스 캔들스틱 타입
export type BinanceKline = [
  number, // Open time
  string, // Open
  string, // High
  string, // Low
  string, // Close
  string, // Volume
  number, // Close time
  string, // Quote asset volume
  number, // Number of trades
  string, // Taker buy base asset volume
  string, // Taker buy quote asset volume
  string // Ignore
]

// 심볼 변환 헬퍼
export function toBinanceSymbol(coin: string): string {
  return `${coin}USDT`
}

// 바이낸스 심볼에서 코인 추출
export function fromBinanceSymbol(symbol: string): string {
  return symbol.replace('USDT', '')
}

