'use client'

import { MAJOR_COINS } from '@/lib/bithumb/types'
import CoinCard from '@/components/market/CoinCard'
import { ExchangeSelector } from '@/components/common'
import { useExchangeData } from '@/hooks/useExchangeData'

export default function SimulationContent() {
  const {
    exchange,
    useAutoRefresh,
    displayData,
    isRefreshing,
    lastUpdate,
    error,
    status,
    handleExchangeChange,
    handleToggleAutoRefresh,
    handleRefresh,
    handleIntervalChange,
    reconnect,
  } = useExchangeData()

  return (
    <div className="space-y-6">
      <ExchangeSelector
        exchange={exchange}
        useAutoRefresh={useAutoRefresh}
        isRefreshing={isRefreshing}
        lastUpdate={lastUpdate}
        error={error}
        status={status}
        onExchangeChange={handleExchangeChange}
        onToggleAutoRefresh={handleToggleAutoRefresh}
        onRefresh={handleRefresh}
        onIntervalChange={handleIntervalChange}
        onReconnect={reconnect}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {MAJOR_COINS.map((coin) => {
          const ticker = displayData[coin.symbol]
          if (!ticker) return null

          return (
            <CoinCard
              key={coin.symbol}
              coin={coin}
              ticker={ticker}
              href={`/simulation/${coin.symbol}`}
            />
          )
        })}
      </div>
    </div>
  )
}

