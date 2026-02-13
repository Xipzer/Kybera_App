/**
 * Code by Xipzer
 *
 * Watchlist result cards: WatchlistCard (list, added, activity modes).
 */

import { Eye } from 'lucide-react'
import { useCardTheme, CardShell, StatCell, AddressChip } from './shared'

export function WatchlistCard({ data, action }: { data: any; action: 'list' | 'added' | 'activity' }) {
  const { card } = useCardTheme()

  if (action === 'list') {
    return (
      <CardShell icon={Eye} title={`${data.total || data.wallets?.length || 0} Watched Wallets`}>
        {data.wallets?.length > 0 ? (
          <div className={`${card.innerBg} border ${card.innerBorder} rounded-xl overflow-hidden`}>
            {data.wallets.map((w: any, i: number) => (
              <div key={w.id} className={`flex items-center justify-between px-3 py-2 sm:px-4 sm:py-2.5 ${i > 0 ? `border-t ${card.innerBorder}` : ''}`}>
                <span className="text-xs sm:text-base text-text-primary font-medium">{w.label}</span>
                <AddressChip address={w.address} />
              </div>
            ))}
          </div>
        ) : (
          <span className="text-xs sm:text-sm text-text-tertiary">No watched wallets</span>
        )}
      </CardShell>
    )
  }
  if (action === 'activity') {
    return (
      <CardShell icon={Eye} title={`${data.count || 0} Activities — ${data.walletLabel || 'Wallet'}`}>
        {data.activities?.length > 0 ? (
          <div className={`${card.innerBg} border ${card.innerBorder} rounded-xl overflow-hidden`}>
            {data.activities.slice(0, 5).map((a: any, i: number) => (
              <div key={a.id} className={`flex items-center justify-between px-3 py-2 sm:px-4 sm:py-2.5 ${i > 0 ? `border-t ${card.innerBorder}` : ''}`}>
                <span className="text-xs sm:text-base text-text-primary capitalize">{a.activityType?.replace(/_/g, ' ')}</span>
                {a.estimatedValueUsd > 0 && <span className="text-[10px] sm:text-xs text-text-tertiary">${Number(a.estimatedValueUsd).toFixed(2)}</span>}
              </div>
            ))}
          </div>
        ) : (
          <span className="text-xs sm:text-sm text-text-tertiary">No recent activity</span>
        )}
      </CardShell>
    )
  }
  return (
    <CardShell icon={Eye} title="Wallet Added to Watchlist">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
        <StatCell label="Label" value={data.label || 'Unlabeled'} />
      </div>
      {data.address && <div className="mt-2"><AddressChip address={data.address} /></div>}
    </CardShell>
  )
}
