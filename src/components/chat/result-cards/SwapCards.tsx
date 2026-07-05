/**
 * Code by Xipzer
 *
 * Swap-related result cards: SwapQuoteCard.
 */

import { ArrowRightLeft } from 'lucide-react'
import { useCardTheme, CardShell, StatCell } from './shared'

interface SwapQuoteData {
  fromAmount?: string
  fromToken?: string
  toAmount?: string
  toToken?: string
  priceImpact?: string | number
  provider?: string
}

export function SwapQuoteCard({ data }: { data: Record<string, unknown> }) {
  const { iconAccent } = useCardTheme()
  const d = data as SwapQuoteData

  return (
    <CardShell icon={ArrowRightLeft} title="Swap Quote">
      <div className="space-y-3">
        <div className="flex items-center justify-center gap-3 sm:gap-4 py-2">
          <div className="text-center">
            <div className="text-sm sm:text-lg font-bold text-text-primary">{d.fromAmount}</div>
            <div className="text-2xs sm:text-xs text-text-tertiary">{d.fromToken}</div>
          </div>
          <ArrowRightLeft className={`w-4 h-4 sm:w-5 sm:h-5 ${iconAccent}`} />
          <div className="text-center">
            <div className="text-sm sm:text-lg font-bold text-green-500">{d.toAmount}</div>
            <div className="text-2xs sm:text-xs text-text-tertiary">{d.toToken}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:gap-4">
          {d.priceImpact && <StatCell label="Price Impact" value={`${d.priceImpact}%`} />}
          {d.provider && <StatCell label="Provider" value={d.provider} />}
        </div>
      </div>
    </CardShell>
  )
}
