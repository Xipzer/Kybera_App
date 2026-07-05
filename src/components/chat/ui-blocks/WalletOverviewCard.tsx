/**
 * Code by Xipzer
 *
 * Wallet Overview UI Block — balance across chains, active alerts, top tokens.
 */

import { Wallet, Bell } from 'lucide-react'
import { CardShell, AddressChip } from '../result-cards/shared'
import { formatUSD } from '../../../utils/formatters'
import type { WalletOverviewBlock } from '../../../types/research'

export function WalletOverviewCard({ block }: { block: WalletOverviewBlock }) {
  const d = block.data

  return (
    <CardShell
      icon={Wallet}
      title={
        <span className="inline-flex items-center gap-2 min-w-0">
          Wallet
          <AddressChip address={d.address} />
        </span>
      }
      trailing={d.activeAlerts != null && d.activeAlerts > 0 && (
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/20">
          <Bell className="w-3 h-3 text-orange-400" />
          <span className="text-2xs font-bold text-orange-400">{d.activeAlerts}</span>
        </div>
      )}
    >
      <div className="space-y-3">
        {d.totalValueUsd != null && (
          <div>
            <div className="text-2xs sm:text-xs text-text-tertiary uppercase tracking-wide mb-0.5">Total Value</div>
            <div className="text-lg sm:text-2xl font-bold text-text-primary">{formatUSD(d.totalValueUsd)}</div>
          </div>
        )}

        {d.chains && d.chains.length > 0 && (
          <div className="bg-surface-elevated/50 border border-border-subtle/50 rounded-xl p-2.5 sm:p-3 space-y-1.5">
            <div className="text-2xs sm:text-xs text-text-tertiary uppercase tracking-wide">By Chain</div>
            {d.chains.map((chain) => (
              <div key={chain.name} className="flex items-center justify-between">
                <span className="text-xs sm:text-sm text-text-secondary capitalize">{chain.name}</span>
                <span className="text-xs sm:text-sm text-text-primary font-medium">{formatUSD(chain.balanceUsd)}</span>
              </div>
            ))}
          </div>
        )}

        {d.tokens && d.tokens.length > 0 && (
          <div className="bg-surface-elevated/50 border border-border-subtle/50 rounded-xl p-2.5 sm:p-3 space-y-1.5">
            <div className="text-2xs sm:text-xs text-text-tertiary uppercase tracking-wide">Tokens</div>
            {d.tokens.slice(0, 5).map((token) => (
              <div key={token.symbol} className="flex items-center justify-between">
                <span className="text-xs sm:text-sm text-text-primary font-medium">{token.symbol}</span>
                <div className="text-right">
                  <span className="text-xs sm:text-sm text-text-secondary">{token.balance.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
                  {token.valueUsd != null && (
                    <span className="text-2xs sm:text-xs text-text-tertiary ml-1.5">{formatUSD(token.valueUsd)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </CardShell>
  )
}
