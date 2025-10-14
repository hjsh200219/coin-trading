// 빗썸 API 타입 정의

export interface BithumbTicker {
  opening_price: string // 최근 24시간 내 시작 거래금액
  closing_price: string // 최근 24시간 내 마지막 거래금액
  min_price: string // 최근 24시간 내 최저 거래금액
  max_price: string // 최근 24시간 내 최고 거래금액
  units_traded: string // 최근 24시간 내 Currency 거래량
  acc_trade_value: string // 최근 24시간 내 Currency 누적 거래금액
  prev_closing_price: string // 전일 종가
  units_traded_24H: string // 최근 24시간 내 Currency 거래량
  acc_trade_value_24H: string // 최근 24시간 내 Currency 누적 거래금액
  fluctate_24H: string // 최근 24시간 내 변동금액
  fluctate_rate_24H: string // 최근 24시간 내 변동률
  date: string // 타임스탬프
}

export interface BithumbTickerResponse {
  status: string // 결과 상태 코드 (정상: 0000, 그 외 에러)
  data: {
    [key: string]: BithumbTicker
  }
}

export interface CoinDisplayInfo {
  symbol: string // 코인 심볼 (BTC, ETH 등)
  name: string // 코인 한글 이름
  color: string // 차트/UI 표시 색상
}

// 주요 코인 정보
export const MAJOR_COINS: CoinDisplayInfo[] = [
  { symbol: 'BTC', name: '비트코인', color: '#F7931A' },
  { symbol: 'ETH', name: '이더리움', color: '#627EEA' },
  { symbol: 'XRP', name: '리플', color: '#23292F' },
  { symbol: 'ADA', name: '에이다', color: '#0033AD' },
  { symbol: 'SOL', name: '솔라나', color: '#9945FF' },
  { symbol: 'DOGE', name: '도지코인', color: '#C2A633' },
  { symbol: 'TRX', name: '트론', color: '#FF0013' },
  { symbol: 'MATIC', name: '폴리곤', color: '#8247E5' },
  { symbol: 'DOT', name: '폴카닷', color: '#E6007A' },
  { symbol: 'AVAX', name: '아발란체', color: '#E84142' },
]
