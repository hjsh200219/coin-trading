import AppLayout from '@/components/AppLayout'
import { MAJOR_COINS } from '@/lib/bithumb/types'
import CoinCard from '@/components/market/CoinCard'
import { getAllTickers } from '@/lib/bithumb/api'

export default async function SimulationPage() {
  // ticker 데이터를 가져와서 실제 거래 가능한 코인만 필터링
  let availableCoins = MAJOR_COINS
  
  try {
    const response = await getAllTickers()
    availableCoins = MAJOR_COINS.filter((coin) => response.data[coin.symbol])
  } catch (error) {
    console.error('Failed to fetch tickers:', error)
    // 에러 시에도 모든 코인 표시
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {availableCoins.map((coin) => (
            <CoinCard
              key={coin.symbol}
              coin={coin}
              href={`/simulation/${coin.symbol}`}
            />
          ))}
        </div>
      </div>
    </AppLayout>
  )
}

