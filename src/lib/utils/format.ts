/**
 * 숫자/가격 포맷팅 유틸리티 함수들
 */

/**
 * 숫자를 천 단위 콤마로 포맷팅
 * @param price - 포맷팅할 가격 (문자열 또는 숫자)
 * @param decimals - 소수점 자리수 (기본값: 0)
 * @returns 포맷팅된 가격 문자열
 * 
 * @example
 * formatPrice('1234567') // "1,234,567"
 * formatPrice(1234.567, 2) // "1,234.57"
 */
export function formatPrice(price: string | number, decimals: number = 0): string {
  const num = typeof price === 'string' ? parseFloat(price) : price
  return num.toLocaleString('ko-KR', {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  })
}

/**
 * 변동률을 퍼센트 형식으로 포맷팅 (+/- 기호 포함)
 * @param rate - 변동률 (문자열 또는 숫자)
 * @param decimals - 소수점 자리수 (기본값: 2)
 * @returns 포맷팅된 변동률 문자열
 * 
 * @example
 * formatRate('5.23') // "+5.23%"
 * formatRate(-3.45) // "-3.45%"
 */
export function formatRate(rate: string | number, decimals: number = 2): string {
  const num = typeof rate === 'string' ? parseFloat(rate) : rate
  return num >= 0 ? `+${num.toFixed(decimals)}%` : `${num.toFixed(decimals)}%`
}

/**
 * 변동가를 포맷팅 (▲/▼ 화살표 포함)
 * @param change - 변동가 (문자열 또는 숫자)
 * @param isPositive - 상승 여부
 * @param currency - 통화 기호 (기본값: "₩")
 * @returns 포맷팅된 변동가 문자열
 * 
 * @example
 * formatChange('1500', true) // "▲ ₩1,500"
 * formatChange(-2000, false, '$') // "▼ $2,000"
 */
export function formatChange(
  change: string | number,
  isPositive: boolean,
  currency: string = '₩'
): string {
  const num = typeof change === 'string' ? parseFloat(change) : change
  const absValue = Math.abs(num).toLocaleString('ko-KR', { maximumFractionDigits: 0 })
  return isPositive ? `▲ ${currency}${absValue}` : `▼ ${currency}${absValue}`
}

/**
 * 거래량을 포맷팅
 * @param volume - 거래량 (문자열 또는 숫자)
 * @param decimals - 소수점 자리수 (기본값: 2)
 * @returns 포맷팅된 거래량 문자열
 * 
 * @example
 * formatVolume('1234.5678') // "1,234.57"
 */
export function formatVolume(volume: string | number, decimals: number = 2): string {
  const num = typeof volume === 'string' ? parseFloat(volume) : volume
  return num.toLocaleString('ko-KR', {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  })
}

/**
 * 차트용 시간 포맷팅 (KST 기준)
 * @param timestamp - Unix 타임스탬프 (밀리초)
 * @returns 포맷팅된 시간 문자열 (MM.DD HH:mm KST)
 * 
 * @example
 * formatChartTime(1704067200000) // "01.01 00:00"
 */
export function formatChartTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Seoul', // 명시적으로 KST 설정
  })
}

/**
 * 날짜/시간 포맷팅 (KST 기준, 커스텀 옵션 지원)
 * @param date - Date 객체 또는 타임스탬프
 * @param options - Intl.DateTimeFormatOptions
 * @returns 포맷팅된 날짜/시간 문자열
 * 
 * @example
 * formatDateTime(new Date(), { dateStyle: 'short', timeStyle: 'short' })
 */
export function formatDateTime(
  date: Date | number,
  options?: Intl.DateTimeFormatOptions
): string {
  const dateObj = typeof date === 'number' ? new Date(date) : date
  return dateObj.toLocaleString('ko-KR', {
    ...options,
    timeZone: 'Asia/Seoul', // 명시적으로 KST 설정
  })
}

/**
 * 숫자를 소수점 자리수와 함께 포맷팅
 * @param num - 포맷팅할 숫자
 * @param decimals - 소수점 자리수 (기본값: 2)
 * @returns 포맷팅된 숫자 문자열
 * 
 * @example
 * formatNumber(1234.567, 2) // "1,234.57"
 * formatNumber(1234567, 0) // "1,234,567"
 */
export function formatNumber(num: number, decimals = 2): string {
  return num.toLocaleString('ko-KR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/**
 * 심볼에 맞는 가격 포맷팅
 * @param price - 가격
 * @param symbol - 코인 심볼
 * @returns 포맷팅된 가격 문자열
 * 
 * @example
 * formatCoinPrice(1234567, 'BTC') // "1,234,567" (정수)
 * formatCoinPrice(1234.56, 'ETH') // "1,234.56" (2자리)
 */
export function formatCoinPrice(price: number, symbol: string): string {
  if (symbol === 'BTC') {
    return formatNumber(price, 0) // BTC는 정수
  }
  return formatNumber(price, 2) // 기본 2자리
}

/**
 * 거래량을 단위와 함께 축약 포맷팅 (K, M, B)
 * @param volume - 거래량
 * @returns 포맷팅된 거래량 문자열
 * 
 * @example
 * formatVolumeShort(1234567890) // "1.23B"
 * formatVolumeShort(1234567) // "1.23M"
 * formatVolumeShort(1234) // "1.23K"
 */
export function formatVolumeShort(volume: number): string {
  if (volume >= 1_000_000_000) {
    return `${formatNumber(volume / 1_000_000_000, 2)}B`
  }
  if (volume >= 1_000_000) {
    return `${formatNumber(volume / 1_000_000, 2)}M`
  }
  if (volume >= 1_000) {
    return `${formatNumber(volume / 1_000, 2)}K`
  }
  return formatNumber(volume, 2)
}

