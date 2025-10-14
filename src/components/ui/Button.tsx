import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', fullWidth = false, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center rounded-lg font-medium transition focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed'

    const variants = {
      primary: 'bg-brand text-background hover:bg-brand-emphasis',
      secondary: 'bg-surface-75 text-foreground border border-border hover:bg-surface-100',
      outline: 'bg-transparent text-foreground border border-border hover:bg-surface-75',
      ghost: 'bg-transparent text-foreground hover:bg-surface-75',
      danger: 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30',
    }

    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg',
    }

    const widthClass = fullWidth ? 'w-full' : ''

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${widthClass} ${className}`}
        {...props}
      />
    )
  }
)

Button.displayName = 'Button'

export default Button
