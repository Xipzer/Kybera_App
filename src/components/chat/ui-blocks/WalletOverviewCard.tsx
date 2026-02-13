/**
 * Code by Xipzer
 *
 * Wallet Overview UI Block — balance across chains, active alerts, top tokens.
 */

import { Wallet, Bell } from 'lucide-react'
import { useTheme } from '../../../hooks/useTheme'
import type { WalletOverviewBlock } from '../../../types/research'

function formatUsd(n: number): string {
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`
  return `$${n.toFixed(2)}`
}

function truncateAddress(addr: string): string {
  if (addr.length <= 12) return addr
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

export function WalletOverviewCard({ block }: { block: WalletOverviewBlock }) {
  const { theme } = useTheme()
  const d = block.data
  const sendGradient = theme.styles.chatInterface.sendGradient

  return (
    <div className="bg-surface-elevated/30 border border-border-subtle rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-3 px-3 py-2 sm:px-4 sm:py-3 border-b border-border-subtle/50">
        <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-r ${sendGradient} flex items-center justify-center flex-shrink-0`}>
          <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
        </div>
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm sm:text-lg font-semibold text-text-primary">Wallet</span>
          <span className="text-[10px] sm:text-xs text-text-tertiary font-mono">{truncateAddress(d.address)}</span>
        </div>
        {d.activeAlerts != null && d.activeAlerts > 0 && (
          <div className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/20">
            <Bell className="w-3 h-3 text-orange-400" />
            <span className="text-[10px] font-bold text-orange-400">{d.activeAlerts}</span>
          </div>
        )}
      </div>

      <div className="p-3 sm:p-4 space-y-3">
        {/* Total value */}
        {d.totalValueUsd != null && (
          <div>
            <div className="text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wide mb-0.5">Total Value</div>
            <div className="text-lg sm:text-2xl font-bold text-text-primary">{formatUsd(d.totalValueUsd)}</div>
          </div>
        )}

        {/* Chain breakdown */}
        {d.chains && d.chains.length > 0 && (
          <div className="bg-surface-elevated/50 border border-border-subtle/50 rounded-xl p-2.5 sm:p-3 space-y-1.5">
            <div className="text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wide">By Chain</div>
            {d.chains.map((chain) => (
              <div key={chain.name} className="flex items-center justify-between">
                <span className="text-xs sm:text-sm text-text-secondary capitalize">{chain.name}</span>
                <span className="text-xs sm:text-sm text-text-primary font-medium">{formatUsd(chain.balanceUsd)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Top tokens */}
        {d.tokens && d.tokens.length > 0 && (
          <div className="bg-surface-elevated/50 border border-border-subtle/50 rounded-xl p-2.5 sm:p-3 space-y-1.5">
            <div className="text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wide">Tokens</div>
            {d.tokens.slice(0, 5).map((token) => (
              <div key={token.symbol} className="flex items-center justify-between">
                <span className="text-xs sm:text-sm text-text-primary font-medium">{token.symbol}</span>
                <div className="text-right">
                  <span className="text-xs sm:text-sm text-text-secondary">{token.balance.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
                  {token.valueUsd != null && (
                    <span className="text-[10px] sm:text-xs text-text-tertiary ml-1.5">{formatUsd(token.valueUsd)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
