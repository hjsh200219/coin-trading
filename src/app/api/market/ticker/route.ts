// 코인 시세 조회 API 엔드포인트

import { NextResponse } from 'next/server'
import { getAllTickers, BithumbAPIError } from '@/lib/bithumb/api'

export async function GET() {
  try {
    const data = await getAllTickers()
    return NextResponse.json(data)
  } catch (error) {
    if (error instanceof BithumbAPIError) {
      return NextResponse.json(
        { error: error.message, code: error.statusCode },
        { status: 500 },
      )
    }
    return NextResponse.json(
      { error: '시세 조회 중 오류가 발생했습니다' },
      { status: 500 },
    )
  }
}
