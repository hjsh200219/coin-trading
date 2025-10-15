'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import Button from '@/components/ui/Button'

type NavigationProps = {
  user: {
    email: string
    name?: string | null
    avatar_url?: string | null
  }
  userType: 'admin' | 'member' | 'quest'
}

type NavItem = {
  href: string
  label: string
  parent?: string
}

export default function Navigation({ user, userType }: NavigationProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const pathname = usePathname()

  const navItems: NavItem[] = [
    { href: '/market', label: '시세' },
    ...(userType === 'admin' ? [{ href: '/admin', label: '관리자' }] : []),
  ]

  const isActive = (href: string) => pathname === href

  const getCurrentPageTitle = () => {
    const currentItem = navItems.find(item => item.href === pathname)
    if (currentItem?.parent) {
      return `${currentItem.parent} > ${currentItem.label}`
    }
    return currentItem?.label || 'Coin Trading'
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  return (
    <nav className="sticky top-0 z-50 bg-surface-100 border-b border-border backdrop-blur-sm bg-surface-100/95">
      <div className="px-4 sm:px-6 md:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo / Page Title */}
          <Link href="/market" className="flex items-center gap-2">
            <span className="text-xl font-bold text-brand">{getCurrentPageTitle()}</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                  isActive(item.href)
                    ? 'bg-brand text-background'
                    : 'text-foreground hover:bg-surface-75'
                }`}
              >
                {item.label}
              </Link>
            ))}
            <div className="flex items-center gap-3 pl-4 border-l border-border">
              <Link href="/my-page" className="flex items-center gap-3 hover:opacity-80 transition">
                {user.avatar_url && (
                  <Image
                    src={user.avatar_url}
                    alt={user.name || 'User'}
                    width={32}
                    height={32}
                    className="w-8 h-8 rounded-full"
                  />
                )}
              </Link>
              <Button
                onClick={handleLogout}
                variant="danger"
                size="sm"
              >
                로그아웃
              </Button>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-lg text-foreground hover:bg-surface-75 transition"
            aria-label="메뉴"
          >
            {isMenuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <div className="flex flex-col gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={`px-4 py-3 rounded-lg text-sm font-medium transition ${
                    isActive(item.href)
                      ? 'bg-brand text-background'
                      : 'text-foreground hover:bg-surface-75'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              <div className="flex items-center justify-between px-4 py-3 mt-2 border-t border-border">
                <Link
                  href="/my-page"
                  className="flex items-center gap-3 hover:opacity-80 transition"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {user.avatar_url && (
                    <Image
                      src={user.avatar_url}
                      alt={user.name || 'User'}
                      width={32}
                      height={32}
                      className="w-8 h-8 rounded-full"
                    />
                  )}
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground">{user.name || '이름 없음'}</span>
                    <span className="text-xs text-foreground/60">{user.email}</span>
                  </div>
                </Link>
                <Button
                  onClick={handleLogout}
                  variant="danger"
                  size="sm"
                >
                  로그아웃
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
