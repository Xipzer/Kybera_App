/**
 * Code by Xipzer
 *
 * Shared primitives for action result cards: useCardTheme, CardShell, StatCell,
 * AddressChip, YieldRiskBadge.
 */

import { useState } from 'react'
import { Copy, Check, Shield, AlertTriangle, Flame, type LucideIcon } from 'lucide-react'
import { useTheme } from '../../../hooks/useTheme'

// ─── Theme Hook ─────────────────────────────────────────────────────────────

export function useCardTheme() {
  const { theme, isDark } = useTheme()

  return {
    card: {
      bg: 'bg-surface-elevated/30',
      border: 'border-border-subtle',
      innerBg: 'bg-surface-elevated/50',
      innerBorder: 'border-border-subtle/50',
    },
    isDark,
    iconAccent: theme.styles.iconAccent,
    sendGradient: theme.styles.chatInterface.sendGradient,
    titleGradient: theme.styles.walletDetail.titleGradient,
  }
}

// ─── Card Shell ─────────────────────────────────────────────────────────────

export function CardShell({ icon: Icon, title, trailing, children }: {
  icon: LucideIcon
  title: React.ReactNode
  trailing?: React.ReactNode
  children: React.ReactNode
}) {
  const { card, sendGradient } = useCardTheme()

  return (
    <div className={`${card.bg} border ${card.border} rounded-2xl overflow-hidden`}>
      <div className={`flex items-center gap-2 sm:gap-3 px-3 py-2 sm:px-4 sm:py-3 border-b ${card.innerBorder}`}>
        <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-r ${sendGradient} flex items-center justify-center flex-shrink-0`}>
          <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
        </div>
        <span className="text-sm sm:text-lg font-semibold text-text-primary min-w-0">{title}</span>
        {trailing && <div className="ml-auto flex-shrink-0">{trailing}</div>}
      </div>
      <div className="p-3 sm:p-4">{children}</div>
    </div>
  )
}

// ─── Stat Cell ──────────────────────────────────────────────────────────────

export function StatCell({ label, value, mono, className, valueClassName }: { label: string; value: string; mono?: boolean; className?: string; valueClassName?: string }) {
  return (
    <div className={className}>
      <div className="text-2xs sm:text-xs text-text-tertiary uppercase tracking-wide mb-0.5 sm:mb-1">{label}</div>
      <div className={`text-xs sm:text-base font-medium ${valueClassName ?? 'text-text-primary'} ${mono ? 'font-mono' : ''}`}>{value}</div>
    </div>
  )
}

// ─── Address Chip ───────────────────────────────────────────────────────────

export function AddressChip({ address }: { address: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard
      .writeText(address)
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
      .catch(() => {})
  }

  return (
    <button
      onClick={handleCopy}
      aria-label="Copy address"
      className="group/chip inline-flex items-center gap-1 font-mono text-2xs sm:text-xs text-text-tertiary hover:text-text-secondary transition-colors cursor-pointer"
    >
      {address.slice(0, 6)}...{address.slice(-4)}
      {copied ? (
        <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-green-500" />
      ) : (
        <Copy className="w-2.5 h-2.5 sm:w-3 sm:h-3 opacity-60 group-hover/chip:opacity-100 [@media(pointer:coarse)]:opacity-60 transition-opacity" />
      )}
    </button>
  )
}

// ─── Yield Risk Badge ───────────────────────────────────────────────────────

export function YieldRiskBadge({ level }: { level: string }) {
  const config: Record<string, { bg: string; text: string; border: string; icon: LucideIcon }> = {
    low: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20', icon: Shield },
    medium: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20', icon: AlertTriangle },
    high: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20', icon: Flame },
    degen: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20', icon: Flame },
  }
  const c = config[level] ?? config.high
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-2xs sm:text-xs font-semibold uppercase tracking-wider ${c.bg} ${c.text} border ${c.border}`}>
      <c.icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
      {level}
    </span>
  )
}
