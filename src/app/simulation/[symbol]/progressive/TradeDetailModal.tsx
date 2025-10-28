'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import type { TradeDetail } from '@/types/simulation'
import { formatChartTime } from '@/lib/utils/format'

interface TradeDetailModalProps {
  symbol: string
  detail: TradeDetail
  onClose: () => void
}

export default function TradeDetailModal({
  symbol,
  detail,
  onClose
}: TradeDetailModalProps) {
  const [showAllTrades, setShowAllTrades] = useState(false)

  const formatPrice = (value: number): string => {
    return Math.round(value).toLocaleString('ko-KR')
  }

  const formatReturn = (value: number): string => {
    return Math.round(value).toLocaleString('en-US')
  }

  const displayTrades = showAllTrades ? detail.trades : detail.trades.slice(0, 10)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-auto">
      <Card className="max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* 헤더 */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">{symbol.toUpperCase()} 거래 내역 상세</h2>
            <div className="text-sm text-foreground/60 mt-1">
              매수: {detail.buyConditionCount}개, {detail.buyThreshold.toFixed(3)} | 
              매도: {detail.sellConditionCount}개, {detail.sellThreshold.toFixed(3)}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-foreground/60 hover:text-foreground transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 내용 */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* 성과 요약 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-3">
              <div className="text-xs text-foreground/60 mb-1">총 수익률</div>
              <div className="text-2xl font-bold text-brand">{formatReturn(detail.totalReturn)}%</div>
            </Card>
            <Card className="p-3">
              <div className="text-xs text-foreground/60 mb-1">거래 횟수</div>
              <div className="text-2xl font-bold">{detail.tradeCount}회</div>
            </Card>
            <Card className="p-3">
              <div className="text-xs text-foreground/60 mb-1">홀드 대비</div>
              <div className="text-2xl font-bold text-green-400">
                +{formatReturn(detail.totalReturn - detail.holdReturn)}%p
              </div>
            </Card>
            <Card className="p-3">
              <div className="text-xs text-foreground/60 mb-1">평균 수익/거래</div>
              <div className="text-2xl font-bold">
                {formatReturn(detail.totalReturn / Math.max(detail.tradeCount, 1))}%
              </div>
            </Card>
          </div>

          {/* 가격 차트 (간단한 선 그래프) */}
          <Card className="p-4">
            <h3 className="text-sm font-bold mb-3">가격 변동 및 거래 시점</h3>
            <div className="h-64 bg-surface-75 rounded flex items-center justify-center">
              <div className="text-foreground/40 text-sm">
                📊 차트는 다음 단계에서 구현될 예정입니다
              </div>
            </div>
          </Card>

          {/* 거래 내역 테이블 */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold">거래 내역 ({detail.trades.length}건)</h3>
              {detail.trades.length > 10 && (
                <button
                  onClick={() => setShowAllTrades(!showAllTrades)}
                  className="text-xs text-brand hover:underline"
                >
                  {showAllTrades ? '접기' : '전체 보기'}
                </button>
              )}
            </div>

            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-brand/30 scrollbar-track-surface">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-border">
                    <th className="pb-2 pr-4 font-medium text-foreground/70">시간</th>
                    <th className="pb-2 pr-4 font-medium text-foreground/70">타입</th>
                    <th className="pb-2 pr-4 font-medium text-foreground/70 text-right">가격</th>
                    <th className="pb-2 pr-4 font-medium text-foreground/70">포지션</th>
                    <th className="pb-2 pr-4 font-medium text-foreground/70 text-right">잔액 (%)</th>
                    <th className="pb-2 font-medium text-foreground/70 text-right">수익률</th>
                  </tr>
                </thead>
                <tbody>
                  {displayTrades.map((trade, idx) => (
                    <tr key={idx} className="border-b border-border/50">
                      <td className="py-2 pr-4 text-foreground/80 whitespace-nowrap">
                        {formatChartTime(trade.timestamp)}
                      </td>
                      <td className="py-2 pr-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                            trade.type === 'buy'
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {trade.type === 'buy' ? '매수' : '매도'}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-right font-mono">
                        {formatPrice(trade.price)}
                      </td>
                      <td className="py-2 pr-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs ${
                            trade.position === 'coin'
                              ? 'bg-surface-100 text-foreground'
                              : 'bg-surface-75 text-foreground/60'
                          }`}
                        >
                          {trade.position === 'coin' ? '코인' : '현금'}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-right font-mono">
                        {formatReturn(trade.balance)}%
                      </td>
                      <td className="py-2 text-right font-mono">
                        {trade.profitRate !== undefined ? (
                          <span
                            className={
                              trade.profitRate > 0
                                ? 'text-green-400'
                                : trade.profitRate < 0
                                ? 'text-red-400'
                                : 'text-foreground/60'
                            }
                          >
                            {trade.profitRate > 0 ? '+' : ''}
                            {trade.profitRate.toFixed(2)}%
                          </span>
                        ) : (
                          <span className="text-foreground/40">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!showAllTrades && detail.trades.length > 10 && (
              <div className="mt-3 text-center">
                <button
                  onClick={() => setShowAllTrades(true)}
                  className="text-xs text-brand hover:underline"
                >
                  + {detail.trades.length - 10}개 더 보기
                </button>
              </div>
            )}
          </Card>
        </div>

        {/* 푸터 */}
        <div className="p-4 border-t border-border flex justify-end">
          <Button variant="secondary" size="sm" onClick={onClose}>
            닫기
          </Button>
        </div>
      </Card>
    </div>
  )
}

