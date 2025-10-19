'use client'

import Button from './Button'

export interface ButtonGroupOption<T = string> {
  value: T
  label: string
}

interface ButtonGroupProps<T = string> {
  options: ButtonGroupOption<T>[]
  value: T
  onChange: (value: T) => void
  size?: 'sm' | 'md' | 'lg'
  className?: string
  buttonClassName?: string
}

export default function ButtonGroup<T extends string>({
  options,
  value,
  onChange,
  size = 'sm',
  className = '',
  buttonClassName = '',
}: ButtonGroupProps<T>) {
  return (
    <div className={`flex gap-1 ${className}`}>
      {options.map((option) => (
        <Button
          key={option.value}
          onClick={() => onChange(option.value)}
          variant={value === option.value ? 'primary' : 'outline'}
          size={size}
          className={buttonClassName}
        >
          {option.label}
        </Button>
      ))}
    </div>
  )
}

