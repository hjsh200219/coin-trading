/**
 * Recharts 공통 컴포넌트
 * 모든 차트에서 일관된 스타일을 적용하기 위한 래퍼 컴포넌트들
 */

import {
  XAxis as RechartsXAxis,
  YAxis as RechartsYAxis,
  CartesianGrid as RechartsCartesianGrid,
  Tooltip as RechartsTooltip,
  ReferenceLine as RechartsReferenceLine,
} from 'recharts'
import type { XAxisProps, YAxisProps, CartesianGridProps, TooltipProps } from 'recharts'

/**
 * 공통 X축 컴포넌트
 */
export function ChartXAxis({
  dataKey = 'time',
  fontSize = 10,
  tickFormatter,
  ...props
}: Partial<XAxisProps> & { fontSize?: number }) {
  const defaultTickFormatter = (value: string) => {
    const parts = value.split(' ')
    return `${parts[0]} ${parts[1]}`
  }

  return (
    <RechartsXAxis
      dataKey={dataKey}
      stroke="#ededed"
      tick={{ fill: '#ededed', fontSize }}
      tickFormatter={tickFormatter || defaultTickFormatter}
      {...props}
    />
  )
}

/**
 * 공통 Y축 컴포넌트
 */
export function ChartYAxis({
  fontSize = 10,
  domain = ['auto', 'auto'],
  ...props
}: Partial<YAxisProps> & { fontSize?: number }) {
  return (
    <RechartsYAxis
      stroke="#ededed"
      tick={{ fill: '#ededed', fontSize }}
      domain={domain}
      {...props}
    />
  )
}

/**
 * 공통 그리드 컴포넌트
 */
export function ChartGrid(props: Partial<CartesianGridProps>) {
  return <RechartsCartesianGrid strokeDasharray="3 3" stroke="#2e2e2e" {...props} />
}

/**
 * 공통 툴팁 컴포넌트
 */
export function ChartTooltip({
  formatter,
  precision = 2,
  ...props
}: Partial<TooltipProps<number, string>> & { precision?: number }) {
  const defaultFormatter = (value: number) => value.toFixed(precision)

  return (
    <RechartsTooltip
      contentStyle={{
        backgroundColor: '#181818',
        border: '1px solid #2e2e2e',
        borderRadius: '8px',
        color: '#ededed',
      }}
      labelStyle={{ color: '#ededed' }}
      itemStyle={{ color: '#ededed' }}
      formatter={formatter || defaultFormatter}
      {...props}
    />
  )
}

/**
 * 공통 기준선 컴포넌트
 */
interface ChartReferenceLineProps {
  y?: number | string
  x?: number | string
  label?: string
  stroke?: string
  strokeDasharray?: string
  labelColor?: string
  labelPosition?: 'left' | 'right' | 'top' | 'bottom' | 'center'
  labelFontSize?: number
}

export function ChartReferenceLine({
  y,
  x,
  label,
  stroke = '#666',
  strokeDasharray = '3 3',
  labelColor,
  labelPosition = 'right',
  labelFontSize = 10,
}: ChartReferenceLineProps) {
  return (
    <RechartsReferenceLine
      y={y}
      x={x}
      stroke={stroke}
      strokeDasharray={strokeDasharray}
      label={
        label
          ? {
              value: label,
              position: labelPosition,
              fill: labelColor || stroke,
              fontSize: labelFontSize,
            }
          : undefined
      }
    />
  )
}

