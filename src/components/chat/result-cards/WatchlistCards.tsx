/**
 * Code by Xipzer
 *
 * Watchlist result cards: WatchlistCard (list, added, activity modes).
 */

import { Eye } from 'lucide-react'
import { useCardTheme, CardShell, StatCell, AddressChip } from './shared'

interface WatchedWallet {
  id: string
  label?: string
  address: string
}

interface WatchedActivity {
  id: string
  activityType?: string
  estimatedValueUsd?: number
}

interface WatchlistData {
  total?: number
  count?: number
  walletLabel?: string
  label?: string
  address?: string
  wallets?: WatchedWallet[]
  activities?: WatchedActivity[]
}

export function WatchlistCard({ data, action }: { data: Record<string, unknown>; action: 'list' | 'added' | 'activity' }) {
  const { card } = useCardTheme()
  const d = data as WatchlistData

  if (action === 'list') {
    return (
      <CardShell icon={Eye} title={`${d.total || d.wallets?.length || 0} Watched Wallets`}>
        {d.wallets && d.wallets.length > 0 ? (
          <div className={`${card.innerBg} border ${card.innerBorder} rounded-xl overflow-hidden`}>
            {d.wallets.map((w, i) => (
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
      <CardShell icon={Eye} title={`${d.count || 0} Activities — ${d.walletLabel || 'Wallet'}`}>
        {d.activities && d.activities.length > 0 ? (
          <div className={`${card.innerBg} border ${card.innerBorder} rounded-xl overflow-hidden`}>
            {d.activities.slice(0, 5).map((a, i) => (
              <div key={a.id} className={`flex items-center justify-between px-3 py-2 sm:px-4 sm:py-2.5 ${i > 0 ? `border-t ${card.innerBorder}` : ''}`}>
                <span className="text-xs sm:text-base text-text-primary capitalize">{a.activityType?.replace(/_/g, ' ')}</span>
                {(a.estimatedValueUsd ?? 0) > 0 && <span className="text-2xs sm:text-xs text-text-tertiary">${Number(a.estimatedValueUsd).toFixed(2)}</span>}
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
      <StatCell label="Label" value={d.label || 'Unlabeled'} />
      {d.address && <div className="mt-2"><AddressChip address={d.address} /></div>}
    </CardShell>
  )
}
