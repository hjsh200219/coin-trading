'use client'

import { useState, useRef, useEffect } from 'react'

interface TooltipProps {
  content: string | React.ReactNode
  children: React.ReactNode
}

export function Tooltip({ content, children }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isVisible && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setPosition({
        top: rect.top - 8,
        left: rect.left + rect.width / 2,
      })
    }
  }, [isVisible])

  return (
    <>
      <div
        ref={triggerRef}
        className="inline-block"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children}
      </div>
      {isVisible && (
        <div
          className="fixed z-50 px-3 py-2 text-xs text-foreground bg-surface-100 border border-border rounded-lg shadow-lg max-w-xs"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          {content}
          <div
            className="absolute left-1/2 bottom-0 w-2 h-2 bg-surface-100 border-r border-b border-border transform translate-y-1/2 -translate-x-1/2 rotate-45"
          />
        </div>
      )}
    </>
  )
}


