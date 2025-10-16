import { Card } from '@/components/ui/Card'
import { ReactNode } from 'react'

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
  return (
    <Card className="p-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
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
  )
}

