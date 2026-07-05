/**
 * Code by Xipzer
 *
 * Yield/DeFi result cards: YieldCard.
 */

import { Sprout } from 'lucide-react'
import { NetworkIcon } from '../../NetworkIcons'
import { useCardTheme, CardShell, YieldRiskBadge } from './shared'

interface YieldOpportunity {
  id: string
  network?: string
  protocol?: string
  token?: string
  apy?: number
  riskLevel?: string
}

interface YieldData {
  count?: number
  opportunities?: YieldOpportunity[]
}

export function YieldCard({ data }: { data: Record<string, unknown> }) {
  const { card, iconAccent } = useCardTheme()
  const d = data as YieldData

  return (
    <CardShell icon={Sprout} title={`${d.count || d.opportunities?.length || 0} Yield Opportunities`}>
      {d.opportunities && d.opportunities.length > 0 ? (
        <div className={`${card.innerBg} border ${card.innerBorder} rounded-xl overflow-hidden`}>
          {d.opportunities.slice(0, 5).map((o, i) => (
            <div key={o.id} className={`flex items-center justify-between px-3 py-2 sm:px-4 sm:py-2.5 ${i > 0 ? `border-t ${card.innerBorder}` : ''}`}>
              <div className="flex items-center gap-1.5 sm:gap-2">
                {o.network && <NetworkIcon networkId={o.network} size={14} className="flex-shrink-0" />}
                <span className="text-xs sm:text-base text-text-primary font-medium">{o.protocol}</span>
                <span className="text-2xs sm:text-xs text-text-tertiary">{o.token}</span>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <span className={`text-xs sm:text-base font-medium ${iconAccent}`}>{Number(o.apy || 0).toFixed(2)}%</span>
                <YieldRiskBadge level={o.riskLevel ?? ''} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <span className="text-xs sm:text-sm text-text-tertiary">No opportunities found</span>
      )}
    </CardShell>
  )
}
