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
} from 'lucide-react'
import { useTheme } from '../../hooks/useTheme'
import { useWatchlistStore } from '../../store/watchlistStore'
import { walletTrackingService } from '../../services/walletTrackingService'
import { EmptyState } from '../common/EmptyState'
import { formatAddress, formatUSD, formatTimeAgo } from '../../utils/formatters'
import type { WatchedWalletTag, ActivityType } from '../../types/watchlist'

const NETWORK_OPTIONS = ['ethereum', 'base', 'arbitrum', 'optimism', 'solana']

const TAG_OPTIONS: { value: WatchedWalletTag; label: string; color: string }[] = [
  { value: 'whale', label: 'Whale', color: 'bg-blue-500/20 text-blue-400' },
  { value: 'kol', label: 'KOL', color: 'bg-purple-500/20 text-purple-400' },
  { value: 'smart_money', label: 'Smart Money', color: 'bg-green-500/20 text-green-400' },
  { value: 'developer', label: 'Developer', color: 'bg-orange-500/20 text-orange-400' },
  { value: 'fund', label: 'Fund', color: 'bg-cyan-500/20 text-cyan-400' },
  { value: 'custom', label: 'Custom', color: 'bg-gray-500/20 text-gray-400' },
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

export function WatchlistView() {
  const { isDark } = useTheme()

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
      const newActivities = await walletTrackingService.checkWalletActivity(wallet)
      for (const activity of newActivities) {
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

  const inputBg = isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-medium text-text-primary">Watched Wallets</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            showForm
              ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
              : 'bg-accent-500/20 text-accent-500 hover:bg-accent-500/30'
          }`}
        >
          {showForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {showForm ? 'Cancel' : 'Add Wallet'}
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-border-subtle p-4 space-y-3">
          <div>
            <label className="block text-xs text-text-secondary mb-1">Wallet Address</label>
            <input
              type="text"
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
              placeholder="0x... or SOL address"
              className={`w-full px-3 py-2 ${inputBg} border rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent-500/50 transition-colors`}
              style={{ fontSize: '16px' }}
            />
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">Label</label>
            <input
              type="text"
              value={labelInput}
              onChange={(e) => setLabelInput(e.target.value)}
              placeholder="e.g. Whale #1, Vitalik"
              className={`w-full px-3 py-2 ${inputBg} border rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent-500/50 transition-colors`}
              style={{ fontSize: '16px' }}
            />
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">Networks</label>
            <div className="flex flex-wrap gap-1.5">
              {NETWORK_OPTIONS.map((net) => (
                <button
                  key={net}
                  onClick={() => toggleNetwork(net)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                    selectedNetworks.includes(net)
                      ? 'bg-accent-500/20 border-accent-500/30 text-accent-500'
                      : `${isDark ? 'bg-white/5 border-white/10 text-text-secondary' : 'bg-gray-100 border-gray-200 text-text-secondary'}`
                  }`}
                >
                  {net}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">Tags</label>
            <div className="flex flex-wrap gap-1.5">
              {TAG_OPTIONS.map((tag) => (
                <button
                  key={tag.value}
                  onClick={() => toggleTag(tag.value)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                    selectedTags.includes(tag.value)
                      ? tag.color + ' border-current/30'
                      : `${isDark ? 'bg-white/5 border-white/10 text-text-secondary' : 'bg-gray-100 border-gray-200 text-text-secondary'}`
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
            className="w-full py-2.5 bg-accent-500/20 hover:bg-accent-500/30 border border-accent-500/30 rounded-xl text-sm font-medium text-accent-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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

      <div className="space-y-3">
        {watchedWallets.map((wallet) => {
          const walletActivities = getActivitiesForWallet(wallet.id, 10)
          const isExpanded = expandedWallet === wallet.id

          return (
            <div key={wallet.id} className="rounded-xl border border-border-subtle overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-text-primary text-sm">{wallet.label}</span>
                      {wallet.tags.map((tag) => {
                        const tagConfig = TAG_OPTIONS.find((t) => t.value === tag)
                        return (
                          <span key={tag} className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${tagConfig?.color ?? 'bg-gray-500/20 text-gray-400'}`}>
                            {tagConfig?.label ?? tag}
                          </span>
                        )
                      })}
                    </div>
                    <div className="text-xs text-text-secondary font-mono">{formatAddress(wallet.address, 10, 6)}</div>
                    <div className="flex gap-1.5 mt-1.5">
                      {wallet.networks.map((n) => (
                        <span key={n} className={`px-1.5 py-0.5 rounded text-[10px] ${isDark ? 'bg-white/5 text-text-tertiary' : 'bg-gray-100 text-text-tertiary'}`}>
                          {n}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleCheckActivity(wallet.id)}
                      disabled={isChecking === wallet.id}
                      className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} disabled:opacity-50`}
                      title="Check for new activity"
                    >
                      {isChecking === wallet.id
                        ? <Loader2 className="w-3.5 h-3.5 text-text-secondary animate-spin" />
                        : <Eye className="w-3.5 h-3.5 text-text-secondary" />}
                    </button>
                    <button
                      onClick={() => removeWallet(wallet.id)}
                      className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-red-500/20' : 'hover:bg-red-50'}`}
                      title="Remove wallet"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                    <button
                      onClick={() => setExpandedWallet(isExpanded ? null : wallet.id)}
                      className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
                    >
                      {isExpanded
                        ? <ChevronUp className="w-3.5 h-3.5 text-text-secondary" />
                        : <ChevronDown className="w-3.5 h-3.5 text-text-secondary" />}
                    </button>
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className={`border-t ${isDark ? 'border-white/5' : 'border-gray-100'} p-4`}>
                  <h4 className="text-xs font-medium text-text-secondary mb-3">Recent Activity</h4>
                  {walletActivities.length === 0 ? (
                    <p className="text-xs text-text-tertiary text-center py-4">No recent activity detected</p>
                  ) : (
                    <div className="space-y-2">
                      {walletActivities.map((activity) => {
                        const IconComponent = ACTIVITY_ICONS[activity.activityType] ?? HelpCircle
                        return (
                          <div key={activity.id} className={`flex items-center gap-3 p-2.5 rounded-lg ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              activity.activityType === 'swap' ? 'bg-blue-500/20' :
                              activity.activityType === 'transfer_in' ? 'bg-green-500/20' :
                              activity.activityType === 'transfer_out' ? 'bg-red-500/20' :
                              isDark ? 'bg-white/10' : 'bg-gray-200'
                            }`}>
                              <IconComponent className={`w-4 h-4 ${
                                activity.activityType === 'swap' ? 'text-blue-400' :
                                activity.activityType === 'transfer_in' ? 'text-green-400' :
                                activity.activityType === 'transfer_out' ? 'text-red-400' :
                                'text-text-secondary'
                              }`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium text-text-primary">
                                {ACTIVITY_LABELS[activity.activityType]}
                                {activity.activityType === 'swap' && activity.tokenInSymbol && activity.tokenOutSymbol && (
                                  <span className="text-text-secondary ml-1">
                                    {activity.tokenInSymbol} → {activity.tokenOutSymbol}
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-text-tertiary">{activity.networkId}</div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              {activity.estimatedValueUsd !== undefined && activity.estimatedValueUsd > 0 && (
                                <div className="text-xs font-medium text-text-primary">
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
