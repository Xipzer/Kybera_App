/**
 * Code by Xipzer
 *
 * Swap Preview UI Block — pre-confirmation swap details with rate,
 * slippage, gas estimate, and price impact.
 */

import { ArrowRightLeft, AlertTriangle } from 'lucide-react'
import { useTheme } from '../../../hooks/useTheme'
import type { SwapPreviewBlock } from '../../../types/research'

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  preview: { color: 'text-blue-400', bg: 'bg-blue-500/20', label: 'PREVIEW' },
  pending: { color: 'text-yellow-400', bg: 'bg-yellow-500/20', label: 'PENDING' },
  confirmed: { color: 'text-green-400', bg: 'bg-green-500/20', label: 'CONFIRMED' },
}

export function SwapPreviewCard({ block }: { block: SwapPreviewBlock }) {
  const { theme } = useTheme()
  const d = block.data
  const sendGradient = theme.styles.chatInterface.sendGradient
  const status = STATUS_CONFIG[d.status ?? 'preview']

  return (
    <div className="bg-surface-elevated/30 border border-border-subtle rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-3 px-3 py-2 sm:px-4 sm:py-3 border-b border-border-subtle/50">
        <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-r ${sendGradient} flex items-center justify-center flex-shrink-0`}>
          <ArrowRightLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
        </div>
        <span className="text-sm sm:text-lg font-semibold text-text-primary">Swap Preview</span>
        <div className={`ml-auto px-2 py-0.5 rounded-full ${status.bg}`}>
          <span className={`text-[10px] font-bold ${status.color}`}>{status.label}</span>
        </div>
      </div>

      <div className="p-3 sm:p-4 space-y-3">
        {/* Swap direction */}
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-surface-elevated/50 border border-border-subtle/50 rounded-xl p-2.5 sm:p-3 text-center">
            <div className="text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wide mb-0.5">From</div>
            <div className="text-sm sm:text-lg font-bold text-text-primary">{d.fromAmount}</div>
            <div className="text-xs text-text-secondary">{d.fromToken}</div>
          </div>
          <ArrowRightLeft className="w-4 h-4 text-text-tertiary flex-shrink-0" />
          <div className="flex-1 bg-surface-elevated/50 border border-border-subtle/50 rounded-xl p-2.5 sm:p-3 text-center">
            <div className="text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wide mb-0.5">To</div>
            <div className="text-sm sm:text-lg font-bold text-text-primary">
              {d.toAmount != null ? d.toAmount.toLocaleString(undefined, { maximumFractionDigits: 6 }) : '...'}
            </div>
            <div className="text-xs text-text-secondary">{d.toToken}</div>
          </div>
        </div>

        {/* Details */}
        <div className="bg-surface-elevated/50 border border-border-subtle/50 rounded-xl p-2.5 sm:p-3 space-y-1.5">
          {d.rate != null && (
            <div className="flex justify-between">
              <span className="text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wide">Rate</span>
              <span className="text-xs sm:text-sm text-text-primary font-medium">1 {d.fromToken} = {d.rate.toLocaleString(undefined, { maximumFractionDigits: 6 })} {d.toToken}</span>
            </div>
          )}
          {d.slippage != null && (
            <div className="flex justify-between">
              <span className="text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wide">Slippage</span>
              <span className="text-xs sm:text-sm text-text-primary font-medium">{d.slippage}%</span>
            </div>
          )}
          {d.estimatedGasUsd != null && (
            <div className="flex justify-between">
              <span className="text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wide">Est. Gas</span>
              <span className="text-xs sm:text-sm text-text-primary font-medium">${d.estimatedGasUsd.toFixed(2)}</span>
            </div>
          )}
          {d.priceImpact != null && (
            <div className="flex justify-between">
              <span className="text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wide">Price Impact</span>
              <span className={`text-xs sm:text-sm font-medium ${
                Math.abs(d.priceImpact) > 5 ? 'text-red-400' :
                Math.abs(d.priceImpact) > 2 ? 'text-yellow-400' :
                'text-green-400'
              }`}>
                {d.priceImpact.toFixed(2)}%
              </span>
            </div>
          )}
          {d.dex && (
            <div className="flex justify-between">
              <span className="text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wide">DEX</span>
              <span className="text-xs sm:text-sm text-text-primary font-medium">{d.dex}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wide">Network</span>
            <span className="text-xs sm:text-sm text-text-primary font-medium capitalize">{d.network}</span>
          </div>
        </div>

        {/* High price impact warning */}
        {d.priceImpact != null && Math.abs(d.priceImpact) > 5 && (
          <div className="flex items-start gap-2 px-2.5 py-2 rounded-xl bg-red-500/10 border border-red-500/20">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
            <span className="text-xs text-red-300">High price impact detected. Consider reducing the swap amount.</span>
          </div>
        )}
      </div>
    </div>
  )
}
