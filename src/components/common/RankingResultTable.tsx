'use client'

import { formatChartTime, formatNumber } from '@/lib/utils/format'
import { TableBody, TableRow, TableCell } from '@/components/ui'
import type { RankingDataPoint } from '@/types/chart'

interface RankingResultTableProps {
  data: RankingDataPoint[]
  symbol: string
}

export default function RankingResultTable({ data }: RankingResultTableProps) {
  // 시간 순서로 오름차순 정렬
  const sortedData = [...data].sort((a, b) => a.timestamp - b.timestamp)

  // 색상 클래스 결정 헬퍼
  const getValueColorClass = (value: number | null): string => {
    if (value === null) return 'text-foreground/30'
    if (value > 0) return 'text-brand'
    if (value < 0) return 'text-red-500'
    return 'text-foreground/70'
  }

  // 최고/최저 Ranking Value 계산
  const maxRankingValue = Math.max(...sortedData.map((d) => d.rankingValue))
  const minRankingValue = Math.min(...sortedData.map((d) => d.rankingValue))

  // 활성화된 지표 개수 계산
  const activeIndicators = sortedData.length > 0
    ? [
        sortedData[0].macd !== null,
        sortedData[0].rsi !== null,
        sortedData[0].ao !== null,
        sortedData[0].DP !== null,
        sortedData[0].rti !== null,
      ].filter(Boolean).length
    : 0

  if (data.length === 0) {
    return (
      <div className="p-8 text-center text-foreground/60 bg-surface border border-border rounded-lg">
        분석할 데이터가 없습니다. 설정을 변경하고 다시 시도해주세요.
      </div>
    )
  }

  return (
    <div className="bg-surface border border-border rounded-lg overflow-hidden">
      {/* 테이블 컨테이너 - 스크롤 영역 */}
      <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
        <table className="w-full">
          <thead className="sticky top-0 z-10 bg-surface">
            <TableRow hover={false}>
              <TableCell header align="center" className="w-32 min-w-[128px]">
                시작시간
              </TableCell>
              <TableCell header align="center">
                Ranking Value
              </TableCell>
              <TableCell header align="center">
                MACD
              </TableCell>
              <TableCell header align="center">
                RSI
              </TableCell>
              <TableCell header align="center">
                AO
              </TableCell>
              <TableCell header align="center">
                DP
              </TableCell>
              <TableCell header align="center">
                RTI
              </TableCell>
            </TableRow>
          </thead>
          <TableBody>
            {sortedData.map((item) => (
              <TableRow key={item.timestamp}>
                <TableCell align="center" className="w-32 min-w-[128px] whitespace-nowrap">
                  {formatChartTime(item.timestamp)}
                </TableCell>
                <TableCell align="right" className="font-medium">
                  <span className={getValueColorClass(item.rankingValue)}>
                    {formatNumber(item.rankingValue, 3)}
                  </span>
                </TableCell>
                <TableCell align="right">
                  {item.macd !== null ? (
                    <span className={getValueColorClass(item.macd)}>
                      {formatNumber(item.macd, 2)}
                    </span>
                  ) : (
                    <span className="text-foreground/30">-</span>
                  )}
                </TableCell>
                <TableCell align="right">
                  {item.rsi !== null ? (
                    <span className={getValueColorClass(item.rsi - 50)}>
                      {formatNumber(item.rsi, 2)}
                    </span>
                  ) : (
                    <span className="text-foreground/30">-</span>
                  )}
                </TableCell>
                <TableCell align="right">
                  {item.ao !== null ? (
                    <span className={getValueColorClass(item.ao)}>
                      {formatNumber(item.ao, 2)}
                    </span>
                  ) : (
                    <span className="text-foreground/30">-</span>
                  )}
                </TableCell>
                <TableCell align="right">
                  {item.DP !== null ? (
                    <span className={getValueColorClass(item.DP)}>
                      {formatNumber(item.DP, 2)}%
                    </span>
                  ) : (
                    <span className="text-foreground/30">-</span>
                  )}
                </TableCell>
                <TableCell align="right">
                  {item.rti !== null ? (
                    <span className={getValueColorClass(item.rti - 50)}>
                      {formatNumber(item.rti, 2)}
                    </span>
                  ) : (
                    <span className="text-foreground/30">-</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </table>
      </div>
      {/* 요약 정보 - 항상 하단에 고정 */}
      <div className="border-t border-border bg-surface-75 px-4 py-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-foreground/60">
            총 {sortedData.length}개 데이터 (활성 지표: {activeIndicators}개)
          </span>
          <div className="flex gap-6">
            <span className="text-foreground/60">
              최고 Ranking Value:{' '}
              <span className="text-brand font-medium">{formatNumber(maxRankingValue, 3)}</span>
            </span>
            <span className="text-foreground/60">
              최저 Ranking Value:{' '}
              <span className="text-red-500 font-medium">{formatNumber(minRankingValue, 3)}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
