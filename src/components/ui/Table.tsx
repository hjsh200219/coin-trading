'use client'

import { ReactNode } from 'react'

interface TableProps {
  children: ReactNode
  className?: string
}

export function Table({ children, className = '' }: TableProps) {
  return (
    <div className={`bg-surface border border-border rounded-lg overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full">{children}</table>
      </div>
    </div>
  )
}

interface TableHeaderProps {
  children: ReactNode
  className?: string
}

export function TableHeader({ children, className = '' }: TableHeaderProps) {
  return <thead className={`bg-surface-100 ${className}`}>{children}</thead>
}

interface TableBodyProps {
  children: ReactNode
  className?: string
}

export function TableBody({ children, className = '' }: TableBodyProps) {
  return <tbody className={`divide-y divide-border ${className}`}>{children}</tbody>
}

interface TableRowProps {
  children: ReactNode
  className?: string
  hover?: boolean
}

export function TableRow({ children, className = '', hover = true }: TableRowProps) {
  const hoverClass = hover ? 'hover:bg-surface-75 transition-colors' : ''
  return <tr className={`${hoverClass} ${className}`}>{children}</tr>
}

interface TableCellProps {
  children: ReactNode
  className?: string
  align?: 'left' | 'center' | 'right'
  header?: boolean
}

export function TableCell({
  children,
  className = '',
  align = 'left',
  header = false,
}: TableCellProps) {
  const alignClass = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
  
  const baseClass = 'px-4 py-3'
  
  if (header) {
    return (
      <th className={`${baseClass} ${alignClass} text-xs font-medium text-foreground/70 uppercase tracking-wider ${className}`}>
        {children}
      </th>
    )
  }
  
  return (
    <td className={`${baseClass} ${alignClass} text-sm text-foreground/90 ${className}`}>
      {children}
    </td>
  )
}

interface TableFooterProps {
  children: ReactNode
  className?: string
}

export function TableFooter({ children, className = '' }: TableFooterProps) {
  return (
    <div className={`border-t border-border bg-surface-75 px-4 py-3 ${className}`}>
      {children}
    </div>
  )
}

