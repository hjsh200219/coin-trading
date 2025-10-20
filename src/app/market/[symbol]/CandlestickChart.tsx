'use client'

import { useEffect, useRef, useState } from 'react'
import { 
  createChart, 
  ColorType, 
  CandlestickSeries,
  LineSeries,
  type IChartApi, 
  type ISeriesApi,
  type Time
} from 'lightweight-charts'
import type { Candle } from '@/lib/bithumb/types'
import { Card } from '@/components/ui/Card'
import { calculateMultipleMA } from '@/lib/indicators/calculator'

interface CandlestickChartProps {
  data: Candle[]
  isLoading?: boolean
  symbol: string
}

export default function CandlestickChart({
  data,
  isLoading,
  symbol,
}: CandlestickChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const maSeriesRefs = useRef<ISeriesApi<'Line'>[]>([])
  const priceLineRefs = useRef<any[]>([])

  // MA 표시 상태 (기본값: 모두 off)
  const [showMA5, setShowMA5] = useState(false)
  const [showMA20, setShowMA20] = useState(false)
  const [showMA60, setShowMA60] = useState(false)
  const [showMA120, setShowMA120] = useState(false)

  // 자간(letter-spacing) 100% 효과: 글자 사이에 공백 추가
  const applyLetterSpacing = (text: string) => text.split('').join(' ')
  // 라벨/숫자 자간을 더 넓게 (두 칸 공백)
  const applyWideLetterSpacing = (text: string) => text.split('').join('  ')
  const applyWideNumberSpacing = (numText: string) => numText.split('').join('  ')

  useEffect(() => {
    if (!chartContainerRef.current || isLoading) return

    // 차트 생성
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#181818' },
        textColor: '#ededed',
      },
      grid: {
        vertLines: { color: '#2e2e2e' },
        horzLines: { color: '#2e2e2e' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: '#2e2e2e',
      },
      rightPriceScale: {
        visible: false, // y축 숨김
      },
      crosshair: {
        mode: 1, // 마그넷 모드
        vertLine: {
          width: 1,
          color: '#758696',
          style: 3, // 점선
          labelBackgroundColor: '#3ecf8e',
        },
        horzLine: {
          width: 1,
          color: '#758696',
          style: 3, // 점선
          labelBackgroundColor: '#3ecf8e',
        },
      },
      localization: {
        timeFormatter: (timestamp: number) => {
          // Unix 타임스탬프(초)를 KST로 변환하여 표시 + 자간 적용
          const base = new Date(timestamp * 1000).toLocaleString('ko-KR', {
            timeZone: 'Asia/Seoul',
            hour: '2-digit',
            minute: '2-digit',
            month: '2-digit',
            day: '2-digit',
          })
          return applyLetterSpacing(base)
        },
      },
    })

    chartRef.current = chart

    // 캔들스틱 시리즈 추가 (v5 API)
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#ef4444',
      downColor: '#3b82f6',
      borderUpColor: '#ef4444',
      borderDownColor: '#3b82f6',
      wickUpColor: '#ef4444',
      wickDownColor: '#3b82f6',
    })

    candlestickSeriesRef.current = candlestickSeries

    // 반응형 처리
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        try {
          chartRef.current.applyOptions({
            width: chartContainerRef.current.clientWidth,
          })
        } catch (error) {
          // 차트가 이미 제거된 경우 무시
        }
      }
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      
      // ref 초기화 (disposed 객체 접근 방지)
      candlestickSeriesRef.current = null
      maSeriesRefs.current = []
      chartRef.current = null
      priceLineRefs.current = []
      
      // 차트 제거
      chart.remove()
    }
  }, [isLoading])

  // 데이터 업데이트
  useEffect(() => {
    const series = candlestickSeriesRef.current
    const chart = chartRef.current
    
    if (!series || !chart || !data || data.length === 0) return

    try {
      // 기존 MA 시리즈 제거
      maSeriesRefs.current.forEach((maSeries) => {
        try {
          chart.removeSeries(maSeries)
        } catch {
          // 이미 제거된 경우 무시
        }
      })
      maSeriesRefs.current = []

      // 기존 price line 제거
      priceLineRefs.current.forEach((priceLine) => {
        try {
          series.removePriceLine(priceLine)
        } catch {
          // 이미 제거된 경우 무시
        }
      })
      priceLineRefs.current = []

      const formattedData = data.map((candle) => {
        const timestamp = Math.floor(candle.timestamp / 1000)
        return {
          time: timestamp as Time,
          open: parseFloat(candle.open.toString()),
          high: parseFloat(candle.high.toString()),
          low: parseFloat(candle.low.toString()),
          close: parseFloat(candle.close.toString()),
        }
      })

      // 시간순 정렬 (오름차순)
      formattedData.sort((a, b) => (a.time as number) - (b.time as number))

      series.setData(formattedData)

      // 이동평균선 계산 및 추가 (활성화된 것만)
      const maPeriods = [
        { period: 5, show: showMA5, color: '#fbbf24' },
        { period: 20, show: showMA20, color: '#3ecf8e' },
        { period: 60, show: showMA60, color: '#8b5cf6' },
        { period: 120, show: showMA120, color: '#ec4899' },
      ]

      const activeMAPeriods = maPeriods.filter(ma => ma.show).map(ma => ma.period)
      
      if (activeMAPeriods.length > 0) {
        const maData = calculateMultipleMA(data, activeMAPeriods)

        maPeriods.forEach((maConfig, configIndex) => {
          if (!maConfig.show) return

          // activeMAPeriods에서의 인덱스 찾기
          const dataIndex = activeMAPeriods.indexOf(maConfig.period)
          if (dataIndex === -1) return

          const ma = maData[dataIndex]
          const maSeries = chart.addSeries(LineSeries, {
            color: maConfig.color,
            lineWidth: 2,
            priceLineVisible: false,
            lastValueVisible: false,
          })

          // MA 데이터 포맷팅 (offset 고려)
          const offset = data.length - ma.values.length
          const maFormattedData = ma.values.map((value, i) => {
            const candleIndex = offset + i
            const timestamp = Math.floor(data[candleIndex].timestamp / 1000)
            return {
              time: timestamp as Time,
              value: value,
            }
          })

          maSeries.setData(maFormattedData)
          maSeriesRefs.current.push(maSeries)
        })
      }
      
      // 최고가와 최저가 찾기
      const maxPrice = Math.max(...formattedData.map(d => d.high))
      const minPrice = Math.min(...formattedData.map(d => d.low))
      
      // 최고가 수평선 추가 (라벨/숫자 자간 더 넓게 적용)
      const maxPriceLine = series.createPriceLine({
        price: maxPrice,
        color: '#ef4444',
        lineWidth: 1,
        lineStyle: 2, // 점선
        axisLabelVisible: true,
        title: `${applyWideLetterSpacing('최고가')}: ${applyWideNumberSpacing(maxPrice.toLocaleString())}`,
      })
      priceLineRefs.current.push(maxPriceLine)
      
      // 최저가 수평선 추가 (라벨/숫자 자간 더 넓게 적용)
      const minPriceLine = series.createPriceLine({
        price: minPrice,
        color: '#3b82f6',
        lineWidth: 1,
        lineStyle: 2, // 점선
        axisLabelVisible: true,
        title: `${applyWideLetterSpacing('최저가')}: ${applyWideNumberSpacing(minPrice.toLocaleString())}`,
      })
      priceLineRefs.current.push(minPriceLine)
      
      // 차트를 데이터에 맞게 조정
      chart.timeScale().fitContent()
    } catch (error) {
      // disposed 에러 등 무시
      if (error instanceof Error && !error.message.includes('disposed')) {
        // 에러 무시 (프로덕션)
      }
    }
  }, [data, showMA5, showMA20, showMA60, showMA120])

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">
          <div className="h-[400px] bg-surface-75 rounded"></div>
        </div>
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Card className="p-6">
        <div className="h-[400px] flex items-center justify-center">
          <p className="text-foreground/60">차트 데이터가 없습니다</p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-xl font-bold text-foreground">{symbol} 가격 차트</h2>
          <div className="flex gap-3 items-center flex-wrap">
            <div className="flex gap-2 text-xs">
              <button
                onClick={() => setShowMA5(!showMA5)}
                className={`flex items-center gap-1 px-2 py-1 rounded transition ${
                  showMA5
                    ? 'bg-[#fbbf24]/20 text-[#fbbf24]'
                    : 'text-foreground/40 hover:text-foreground/60'
                }`}
              >
                <div className={`w-3 h-0.5 ${showMA5 ? 'bg-[#fbbf24]' : 'bg-foreground/40'}`} />
                <span>MA5</span>
              </button>
              <button
                onClick={() => setShowMA20(!showMA20)}
                className={`flex items-center gap-1 px-2 py-1 rounded transition ${
                  showMA20
                    ? 'bg-[#3ecf8e]/20 text-[#3ecf8e]'
                    : 'text-foreground/40 hover:text-foreground/60'
                }`}
              >
                <div className={`w-3 h-0.5 ${showMA20 ? 'bg-[#3ecf8e]' : 'bg-foreground/40'}`} />
                <span>MA20</span>
              </button>
              <button
                onClick={() => setShowMA60(!showMA60)}
                className={`flex items-center gap-1 px-2 py-1 rounded transition ${
                  showMA60
                    ? 'bg-[#8b5cf6]/20 text-[#8b5cf6]'
                    : 'text-foreground/40 hover:text-foreground/60'
                }`}
              >
                <div className={`w-3 h-0.5 ${showMA60 ? 'bg-[#8b5cf6]' : 'bg-foreground/40'}`} />
                <span>MA60</span>
              </button>
              <button
                onClick={() => setShowMA120(!showMA120)}
                className={`flex items-center gap-1 px-2 py-1 rounded transition ${
                  showMA120
                    ? 'bg-[#ec4899]/20 text-[#ec4899]'
                    : 'text-foreground/40 hover:text-foreground/60'
                }`}
              >
                <div className={`w-3 h-0.5 ${showMA120 ? 'bg-[#ec4899]' : 'bg-foreground/40'}`} />
                <span>MA120</span>
              </button>
            </div>
            <p className="text-sm text-foreground/60">캔들: {data.length}개</p>
          </div>
        </div>
        <div ref={chartContainerRef} className="w-full" />
      </div>
    </Card>
  )
}

