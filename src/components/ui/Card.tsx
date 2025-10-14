import { HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function Card({ className = '', children, ...props }: CardProps) {
  return (
    <div
      className={`bg-surface-100 rounded-lg border border-border ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ className = '', children, ...props }: CardProps) {
  return (
    <div className={`p-4 border-b border-border ${className}`} {...props}>
      {children}
    </div>
  )
}

export function CardTitle({ className = '', children, ...props }: CardProps) {
  return (
    <h2 className={`text-lg font-semibold text-foreground ${className}`} {...props}>
      {children}
    </h2>
  )
}

export function CardBody({ className = '', children, ...props }: CardProps) {
  return (
    <div className={`p-4 ${className}`} {...props}>
      {children}
    </div>
  )
}

export function CardFooter({ className = '', children, ...props }: CardProps) {
  return (
    <div className={`p-4 border-t border-border ${className}`} {...props}>
      {children}
    </div>
  )
}
