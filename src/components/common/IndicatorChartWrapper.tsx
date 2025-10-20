'use client'

import { Card } from '@/components/ui/Card'
import { ReactNode, useState, useEffect } from 'react'

export interface LegendItem {
  color: string
  label: string
  type?: 'line' | 'bar'
}

interface IndicatorChartWrapperProps {
  title: string
  legends: LegendItem[]
  children: ReactNode
  height?: number
}

export default function IndicatorChartWrapper({
  title,
  legends,
  children,
  height = 200,
}: IndicatorChartWrapperProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // ESC 키로 모달 닫기
  useEffect(() => {
    if (!isExpanded) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsExpanded(false)
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isExpanded])

  return (
    <>
      <Card 
        className="p-4 cursor-pointer hover:ring-2 hover:ring-brand/50 transition-all"
        onClick={() => setIsExpanded(true)}
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">{title}</h3>
              <span className="text-xs text-foreground/40">클릭하여 확대</span>
            </div>
            <div className="flex gap-3 text-xs">
              {legends.map((legend, index) => (
                <div key={index} className="flex items-center gap-1">
                  <div
                    className={`w-3 ${legend.type === 'bar' ? 'h-2' : 'h-0.5'}`}
                    style={{ backgroundColor: legend.color }}
                  />
                  <span className="text-foreground/60">{legend.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div>{children}</div>
        </div>
      </Card>

      {/* 확대 모달 */}
      {isExpanded && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setIsExpanded(false)}
        >
          <div 
            className="bg-surface rounded-lg w-full max-w-7xl h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <Card className="p-6 flex-1 flex flex-col h-full">
              <div className="flex-1 flex flex-col min-h-0">
                {/* 헤더 */}
                <div className="flex items-center justify-between mb-4 flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-bold text-foreground">{title}</h3>
                    <div className="flex gap-3 text-sm">
                      {legends.map((legend, index) => (
                        <div key={index} className="flex items-center gap-1">
                          <div
                            className={`w-4 ${legend.type === 'bar' ? 'h-3' : 'h-0.5'}`}
                            style={{ backgroundColor: legend.color }}
                          />
                          <span className="text-foreground/60">{legend.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-foreground/40">ESC 키로 닫기</span>
                    <button
                      onClick={() => setIsExpanded(false)}
                      className="p-2 hover:bg-surface-100 rounded transition flex-shrink-0"
                      aria-label="닫기"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* 확대된 차트 (모달 크기에 맞춰 자동 조정) */}
                <div className="flex-1 min-h-0">
                  {children}
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </>
  )
}

