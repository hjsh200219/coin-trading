// 빗썸 API 클라이언트

import { BithumbTickerResponse } from './types'

const BITHUMB_API_BASE_URL = 'https://api.bithumb.com/public'

/**
 * 빗썸 API 에러
 */
export class BithumbAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: string,
  ) {
    super(message)
    this.name = 'BithumbAPIError'
  }
}

/**
 * 모든 코인의 현재 시세 조회
 * @returns 전체 코인 시세 데이터
 */
export async function getAllTickers(): Promise<BithumbTickerResponse> {
  try {
    const response = await fetch(`${BITHUMB_API_BASE_URL}/ticker/ALL_KRW`, {
      next: { revalidate: 10 }, // 10초마다 재검증
    })

    if (!response.ok) {
      throw new BithumbAPIError(
        `API 요청 실패: ${response.status} ${response.statusText}`,
        response.status.toString(),
      )
    }

    const data: BithumbTickerResponse = await response.json()

    if (data.status !== '0000') {
      throw new BithumbAPIError(
        `빗썸 API 에러: ${data.status}`,
        data.status,
      )
    }

    return data
  } catch (error) {
    if (error instanceof BithumbAPIError) {
      throw error
    }
    throw new BithumbAPIError(
      '빗썸 API 호출 중 오류가 발생했습니다',
    )
  }
}

/**
 * 특정 코인의 현재 시세 조회
 * @param symbol 코인 심볼 (예: BTC, ETH)
 * @returns 해당 코인의 시세 데이터
 */
export async function getTicker(symbol: string): Promise<BithumbTickerResponse> {
  try {
    const response = await fetch(
      `${BITHUMB_API_BASE_URL}/ticker/${symbol}_KRW`,
      {
        next: { revalidate: 10 }, // 10초마다 재검증
      },
    )

    if (!response.ok) {
      throw new BithumbAPIError(
        `API 요청 실패: ${response.status} ${response.statusText}`,
        response.status.toString(),
      )
    }

    const data: BithumbTickerResponse = await response.json()

    if (data.status !== '0000') {
      throw new BithumbAPIError(
        `빗썸 API 에러: ${data.status}`,
        data.status,
      )
    }

    return data
  } catch (error) {
    if (error instanceof BithumbAPIError) {
      throw error
    }
    throw new BithumbAPIError(
      '빗썸 API 호출 중 오류가 발생했습니다',
    )
  }
}
