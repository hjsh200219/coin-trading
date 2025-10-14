import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  layout?: 'vertical' | 'horizontal'
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, helperText, layout = 'vertical', ...props }, ref) => {
    if (layout === 'horizontal') {
      return (
        <div className="w-full">
          <div className="flex items-center gap-4">
            {label && (
              <label htmlFor={props.id} className="text-sm font-medium text-foreground/70 min-w-[50px] flex-shrink-0">
                {label}
              </label>
            )}
            <input
              ref={ref}
              className={`flex-1 px-4 py-2 bg-surface-75 text-foreground border rounded-lg focus:outline-none focus:ring-2 transition ${
                error
                  ? 'border-red-500/50 focus:ring-red-500/50'
                  : 'border-border focus:ring-brand'
              } disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
              {...props}
            />
          </div>
          {error && (
            <p className="text-xs text-red-400 mt-1 ml-[calc(80px+1rem)]">{error}</p>
          )}
          {helperText && !error && (
            <p className="text-xs text-foreground/50 mt-1 ml-[calc(80px+1rem)]">{helperText}</p>
          )}
        </div>
      )
    }

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={props.id} className="block text-sm font-medium text-foreground/70 mb-2">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`w-full px-4 py-2 bg-surface-75 text-foreground border rounded-lg focus:outline-none focus:ring-2 transition ${
            error
              ? 'border-red-500/50 focus:ring-red-500/50'
              : 'border-border focus:ring-brand'
          } disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
          {...props}
        />
        {error && (
          <p className="text-xs text-red-400 mt-1">{error}</p>
        )}
        {helperText && !error && (
          <p className="text-xs text-foreground/50 mt-1">{helperText}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export default Input
