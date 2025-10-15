import type { Metadata, Viewport } from 'next'
import { Noto_Sans_KR } from 'next/font/google'
import './globals.css'

const notoSansKr = Noto_Sans_KR({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
})

export const metadata: Metadata = {
  title: 'Coin Trading',
  description: '암호화폐 거래 및 시뮬레이션 애플리케이션',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Coin Trading',
  },
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#1c1c1c',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className={notoSansKr.className} style={{ letterSpacing: '-0.08em' }}>
        {children}
      </body>
    </html>
  )
}
