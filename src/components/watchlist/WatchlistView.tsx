/**
 * Code by Xipzer
 */

import { useState, useCallback } from 'react'
import {
  Eye,
  Plus,
  Trash2,
  ArrowRightLeft,
  ArrowDownLeft,
  ArrowUpRight,
  FileCheck,
  HelpCircle,
  Loader2,
  X,
  ChevronDown,
  ChevronUp,
  Zap,
  Radio,
} from 'lucide-react'
import { useTheme } from '../../hooks/useTheme'
import { useWatchlistStore } from '../../store/watchlistStore'
import { walletTrackingService } from '../../services/walletTrackingService'
import { EmptyState } from '../common/EmptyState'
import { formatAddress, formatUSD, formatTimeAgo } from '../../utils/formatters'
import type { WatchedWalletTag, ActivityType } from '../../types/watchlist'

const NETWORK_OPTIONS = ['ethereum', 'base', 'arbitrum', 'optimism', 'solana']

const TAG_OPTIONS: { value: WatchedWalletTag; label: string; color: string }[] = [
  { value: 'whale', label: 'Whale', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { value: 'kol', label: 'KOL', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  { value: 'smart_money', label: 'Smart Money', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  { value: 'developer', label: 'Developer', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  { value: 'fund', label: 'Fund', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
  { value: 'custom', label: 'Custom', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
]

const ACTIVITY_ICONS: Record<ActivityType, typeof ArrowRightLeft> = {
  swap: ArrowRightLeft,
  transfer_in: ArrowDownLeft,
  transfer_out: ArrowUpRight,
  approval: FileCheck,
  contract_interaction: Zap,
  unknown: HelpCircle,
}

const ACTIVITY_LABELS: Record<ActivityType, string> = {
  swap: 'Swap',
  transfer_in: 'Received',
  transfer_out: 'Sent',
  approval: 'Approval',
  contract_interaction: 'Contract',
  unknown: 'Unknown',
}

const ACTIVITY_COLORS: Record<ActivityType, { bg: string; text: string }> = {
  swap: { bg: 'bg-blue-500/15', text: 'text-blue-400' },
  transfer_in: { bg: 'bg-green-500/15', text: 'text-green-400' },
  transfer_out: { bg: 'bg-red-500/15', text: 'text-red-400' },
  approval: { bg: 'bg-yellow-500/15', text: 'text-yellow-400' },
  contract_interaction: { bg: 'bg-purple-500/15', text: 'text-purple-400' },
  unknown: { bg: 'bg-surface-elevated', text: 'text-text-secondary' },
}

export function WatchlistView() {
  const { theme } = useTheme()
  const styles = theme.styles.chatInterface

  const watchedWallets = useWatchlistStore((s) => s.watchedWallets)
  const addWallet = useWatchlistStore((s) => s.addWallet)
  const removeWallet = useWatchlistStore((s) => s.removeWallet)
  const getActivitiesForWallet = useWatchlistStore((s) => s.getActivitiesForWallet)

  const [showForm, setShowForm] = useState(false)
  const [addressInput, setAddressInput] = useState('')
  const [labelInput, setLabelInput] = useState('')
  const [selectedNetworks, setSelectedNetworks] = useState<string[]>(['ethereum', 'base'])
  const [selectedTags, setSelectedTags] = useState<WatchedWalletTag[]>([])
  const [expandedWallet, setExpandedWallet] = useState<string | null>(null)
  const [isChecking, setIsChecking] = useState<string | null>(null)

  const handleAddWallet = useCallback(() => {
    if (!addressInput.trim() || !labelInput.trim()) return
    addWallet({
      address: addressInput.trim(),
      label: labelInput.trim(),
      tags: selectedTags,
      networks: selectedNetworks,
      trackSwaps: true,
      trackTransfers: true,
      trackApprovals: false,
      minValueUsd: 0,
    })
    setAddressInput('')
    setLabelInput('')
    setSelectedTags([])
    setShowForm(false)
  }, [addressInput, labelInput, selectedTags, selectedNetworks, addWallet])

  const handleCheckActivity = useCallback(async (walletId: string) => {
    const wallet = watchedWallets.find((w) => w.id === walletId)
    if (!wallet || isChecking) return
    setIsChecking(walletId)
    try {
      for (const activity of await walletTrackingService.checkWalletActivity(wallet)) {
        useWatchlistStore.getState().addActivity(activity)
      }
    } finally {
      setIsChecking(null)
    }
  }, [watchedWallets, isChecking])

  const toggleNetwork = (net: string) => {
    setSelectedNetworks((prev) =>
      prev.includes(net) ? prev.filter((n) => n !== net) : [...prev, net]
    )
  }

  const toggleTag = (tag: WatchedWalletTag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  return (
    <div className="h-full overflow-y-auto px-3 sm:px-4 pt-3 pb-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-1 h-4 rounded-full bg-gradient-to-b ${styles.sendGradient}`} />
          <h3 className="text-sm font-semibold text-text-primary">Watched Wallets</h3>
          <span className="text-[10px] text-text-tertiary">({watchedWallets.length})</span>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
            showForm
              ? 'bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25'
              : `bg-gradient-to-r ${styles.sendGradient} text-white shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98]`
          }`}
        >
          {showForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {showForm ? 'Cancel' : 'Add'}
        </button>
      </div>

      {showForm && (
        <div className={`${styles.inputSolidBg} border ${styles.inputBorder} rounded-xl p-4 space-y-3`}>
          <div>
            <label className="block text-[10px] text-text-tertiary uppercase tracking-wider font-medium mb-1.5">Wallet Address</label>
            <input
              type="text"
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
              placeholder="0x... or SOL address"
              className="w-full px-3 py-2.5 bg-surface-elevated/50 border border-border-subtle rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent-500/50 transition-colors"
              style={{ fontSize: '16px' }}
            />
          </div>
          <div>
            <label className="block text-[10px] text-text-tertiary uppercase tracking-wider font-medium mb-1.5">Label</label>
            <input
              type="text"
              value={labelInput}
              onChange={(e) => setLabelInput(e.target.value)}
              placeholder="e.g. Whale #1, Vitalik"
              className="w-full px-3 py-2.5 bg-surface-elevated/50 border border-border-subtle rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent-500/50 transition-colors"
              style={{ fontSize: '16px' }}
            />
          </div>
          <div>
            <label className="block text-[10px] text-text-tertiary uppercase tracking-wider font-medium mb-1.5">Networks</label>
            <div className="flex flex-wrap gap-1.5">
              {NETWORK_OPTIONS.map((net) => (
                <button
                  key={net}
                  onClick={() => toggleNetwork(net)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all duration-200 ${
                    selectedNetworks.includes(net)
                      ? `bg-gradient-to-r ${styles.sendGradient} text-white border-transparent shadow-sm`
                      : 'bg-surface-elevated/50 border-border-subtle text-text-secondary hover:text-text-primary hover:border-accent-500/30'
                  }`}
                >
                  {net}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[10px] text-text-tertiary uppercase tracking-wider font-medium mb-1.5">Tags</label>
            <div className="flex flex-wrap gap-1.5">
              {TAG_OPTIONS.map((tag) => (
                <button
                  key={tag.value}
                  onClick={() => toggleTag(tag.value)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all duration-200 ${
                    selectedTags.includes(tag.value)
                      ? tag.color
                      : 'bg-surface-elevated/50 border-border-subtle text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {tag.label}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={handleAddWallet}
            disabled={!addressInput.trim() || !labelInput.trim()}
            className={`w-full py-2.5 bg-gradient-to-r ${styles.sendGradient} rounded-xl text-sm font-medium text-white shadow-md hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:shadow-none`}
          >
            Add to Watchlist
          </button>
        </div>
      )}

      {watchedWallets.length === 0 && !showForm && (
        <EmptyState
          icon={Eye}
          title="No Watched Wallets"
          description="Add wallet addresses to track whale activity, smart money moves, and more."
          action={{ label: 'Add Wallet', onClick: () => setShowForm(true) }}
        />
      )}

      <div className="space-y-2">
        {watchedWallets.map((wallet) => {
          const walletActivities = getActivitiesForWallet(wallet.id, 10)
          const isExpanded = expandedWallet === wallet.id

          return (
            <div key={wallet.id} className="rounded-xl border border-border-subtle bg-surface-elevated/30 overflow-hidden transition-all duration-200 hover:border-accent-500/20">
              <div className="p-3 sm:p-4">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                      <span className="font-semibold text-text-primary text-sm">{wallet.label}</span>
                      {wallet.tags.map((tag) => {
                        const tagConfig = TAG_OPTIONS.find((t) => t.value === tag)
                        return (
                          <span key={tag} className={`px-1.5 py-0.5 rounded-md text-[9px] font-semibold uppercase tracking-wider ${tagConfig?.color ?? 'bg-gray-500/20 text-gray-400 border-gray-500/30'} border`}>
                            {tagConfig?.label ?? tag}
                          </span>
                        )
                      })}
                    </div>
                    <div className="text-xs text-text-tertiary font-mono ml-3.5">{formatAddress(wallet.address, 10, 6)}</div>
                    <div className="flex gap-1 mt-2 ml-3.5">
                      {wallet.networks.map((n) => (
                        <span key={n} className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-surface-elevated text-text-tertiary border border-border-subtle">
                          {n}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleCheckActivity(wallet.id)}
                      disabled={isChecking === wallet.id}
                      className={`${theme.styles.buttonIcon} p-1.5 rounded-lg disabled:opacity-40`}
                      title="Check for new activity"
                    >
                      {isChecking === wallet.id
                        ? <Loader2 className="w-3.5 h-3.5 text-text-secondary animate-spin" />
                        : <Radio className="w-3.5 h-3.5 text-text-secondary" />}
                    </button>
                    <button
                      onClick={() => removeWallet(wallet.id)}
                      className={`${theme.styles.buttonIcon} p-1.5 rounded-lg hover:!bg-red-500/15`}
                      title="Remove wallet"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                    <button
                      onClick={() => setExpandedWallet(isExpanded ? null : wallet.id)}
                      className={`${theme.styles.buttonIcon} p-1.5 rounded-lg`}
                    >
                      {isExpanded
                        ? <ChevronUp className="w-3.5 h-3.5 text-text-secondary" />
                        : <ChevronDown className="w-3.5 h-3.5 text-text-secondary" />}
                    </button>
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-border-subtle px-3 sm:px-4 py-3">
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-1 h-3.5 rounded-full bg-gradient-to-b ${styles.sendGradient}`} />
                    <h4 className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">Recent Activity</h4>
                  </div>
                  {walletActivities.length === 0 ? (
                    <p className="text-xs text-text-tertiary text-center py-6">No recent activity detected</p>
                  ) : (
                    <div className="space-y-1.5">
                      {walletActivities.map((activity) => {
                        const IconComponent = ACTIVITY_ICONS[activity.activityType] ?? HelpCircle
                        const colors = ACTIVITY_COLORS[activity.activityType] ?? ACTIVITY_COLORS.unknown
                        return (
                          <div key={activity.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-surface-elevated/50 border border-border-subtle/50">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${colors.bg}`}>
                              <IconComponent className={`w-3.5 h-3.5 ${colors.text}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium text-text-primary">
                                {ACTIVITY_LABELS[activity.activityType]}
                                {activity.activityType === 'swap' && activity.tokenInSymbol && activity.tokenOutSymbol && (
                                  <span className="text-text-tertiary ml-1.5">
                                    {activity.tokenInSymbol} → {activity.tokenOutSymbol}
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-text-tertiary">{activity.networkId}</div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              {activity.estimatedValueUsd !== undefined && activity.estimatedValueUsd > 0 && (
                                <div className="text-xs font-semibold text-text-primary">
                                  {formatUSD(activity.estimatedValueUsd)}
                                </div>
                              )}
                              <div className="text-[10px] text-text-tertiary">
                                {formatTimeAgo(activity.timestamp)}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
