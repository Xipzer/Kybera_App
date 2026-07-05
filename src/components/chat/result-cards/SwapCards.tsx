/**
 * Code by Xipzer
 *
 * Swap-related result cards: SwapQuoteCard.
 */

import { ArrowRightLeft } from 'lucide-react'
import { useCardTheme, CardShell, StatCell } from './shared'

export function SwapQuoteCard({ data }: { data: any }) {
  const { iconAccent } = useCardTheme()

  return (
    <CardShell icon={ArrowRightLeft} title="Swap Quote">
      <div className="space-y-3">
        <div className="flex items-center justify-center gap-3 sm:gap-4 py-2">
          <div className="text-center">
            <div className="text-sm sm:text-lg font-bold text-text-primary">{data.fromAmount}</div>
            <div className="text-2xs sm:text-xs text-text-tertiary">{data.fromToken}</div>
          </div>
          <ArrowRightLeft className={`w-4 h-4 sm:w-5 sm:h-5 ${iconAccent}`} />
          <div className="text-center">
            <div className="text-sm sm:text-lg font-bold text-green-500">{data.toAmount}</div>
            <div className="text-2xs sm:text-xs text-text-tertiary">{data.toToken}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:gap-4">
          {data.priceImpact && <StatCell label="Price Impact" value={`${data.priceImpact}%`} />}
          {data.provider && <StatCell label="Provider" value={data.provider} />}
        </div>
      </div>
    </CardShell>
  )
}
