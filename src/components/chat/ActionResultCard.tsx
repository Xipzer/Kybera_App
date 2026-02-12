/**
 * Code by Xipzer
 */

import {
  Wallet,
  Network,
  ArrowRightLeft,
  Shield,
  Bell,
  BarChart3,
  Eye,
  CreditCard,
  TrendingUp,
  Sprout,
  Settings,
  Plus,
  Trash2,
  Pencil,
  CheckCircle2,
  XCircle,
  Globe,
  AlertTriangle,
} from 'lucide-react'
import { useTheme } from '../../hooks/useTheme'
import { themeClasses } from '../../utils/themeClasses'
import { NetworkIcon } from '../NetworkIcons'
import type { ActionResultData } from '../../types/research'

interface ActionResultCardProps {
  result: ActionResultData
}

function useCardTheme() {
  const { themeName, theme, isDark } = useTheme()
  const tc = themeClasses(isDark)

  const getCardStyles = () => {
    switch (themeName) {
      case 'xipz':
        return {
          bg: 'bg-gradient-to-br from-primary-950 via-primary-900 to-primary-950',
          border: 'border-primary-800/50',
        }
      case 'dark':
        return {
          bg: 'bg-surface-base',
          border: 'border-[#8b8bff]/10',
        }
      case 'ogDark':
        return {
          bg: 'bg-surface-base',
          border: 'border-white/10',
        }
      case 'light':
        return {
          bg: 'bg-surface-elevated',
          border: 'border-indigo-200/30',
        }
      case 'ogLight':
        return {
          bg: 'bg-surface-elevated',
          border: 'border-gray-200/30',
        }
      default:
        return {
          bg: 'bg-surface-elevated',
          border: 'border-gray-200',
        }
    }
  }

  return {
    card: getCardStyles(),
    tc,
    isDark,
    iconAccent: theme.styles.iconAccent,
    sendGradient: theme.styles.chatInterface.sendGradient,
  }
}

function CardShell({ icon: Icon, title, children }: {
  icon: typeof Wallet
  title: string
  children: React.ReactNode
}) {
  const { card, tc, sendGradient } = useCardTheme()

  return (
    <div className={`${card.bg} border ${card.border} rounded-2xl overflow-hidden`}>
      <div className={`flex items-center gap-2 sm:gap-3 px-3 py-2 sm:px-4 sm:py-3 border-b ${tc.borderSubtle}`}>
        <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-r ${sendGradient} flex items-center justify-center flex-shrink-0`}>
          <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
        </div>
        <span className="text-sm sm:text-lg font-semibold text-text-primary">{title}</span>
      </div>
      <div className="p-3 sm:p-4">{children}</div>
    </div>
  )
}

function StatCell({ label, value, mono, className }: { label: string; value: string; mono?: boolean; className?: string }) {
  return (
    <div className={className}>
      <div className="text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wide mb-0.5 sm:mb-1">{label}</div>
      <div className={`text-xs sm:text-base text-text-primary font-medium ${mono ? 'font-mono' : ''}`}>{value}</div>
    </div>
  )
}

function AddressChip({ address }: { address: string }) {
  return (
    <span className="font-mono text-[10px] sm:text-xs text-text-tertiary">
      {address.slice(0, 6)}...{address.slice(-4)}
    </span>
  )
}

function WalletListCard({ data }: { data: any }) {
  const { tc } = useCardTheme()

  return (
    <CardShell icon={Wallet} title={`${data.totalWallets} Wallets in ${data.totalGroups} Groups`}>
      <div className="space-y-3">
        {data.groups?.map((group: any) => (
          <div key={group.groupId}>
            <div className="text-[10px] sm:text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">{group.groupName}</div>
            <div className={`${tc.sectionBg} border rounded-xl overflow-hidden`}>
              {group.wallets?.map((w: any, i: number) => (
                <div key={w.id} className={`flex items-center justify-between px-3 py-2 sm:px-4 sm:py-2.5 ${i > 0 ? `border-t ${tc.borderSubtle}` : ''}`}>
                  <span className="text-xs sm:text-base text-text-primary font-medium">{w.name}</span>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <span className="text-[10px] sm:text-xs px-1.5 py-0.5 rounded-full bg-accent-500/10 text-accent-500 font-medium">{w.type}</span>
                    <AddressChip address={w.address} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </CardShell>
  )
}

function NetworkListCard({ data }: { data: any }) {
  return (
    <CardShell icon={Globe} title={`${(data.evm?.length || 0) + (data.svm?.length || 0)} Networks Available`}>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {[...(data.evm || []), ...(data.svm || [])].map((n: any) => (
          <div key={n.id} className="flex items-center gap-1.5 sm:gap-2 px-2 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-surface-hover/50">
            <NetworkIcon networkId={n.id} size={16} className="flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-xs sm:text-base text-text-primary font-medium truncate">{n.name}</div>
              <div className="text-[10px] sm:text-xs text-text-tertiary">{n.symbol}</div>
            </div>
          </div>
        ))}
      </div>
    </CardShell>
  )
}

function BalanceCard({ data }: { data: any }) {
  const { tc, iconAccent } = useCardTheme()

  return (
    <CardShell icon={Wallet} title={`Balance — ${data.wallet || 'Wallet'}`}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
          <StatCell label="Total Value" value={`$${Number(data.totalUSD || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
          {data.native && parseFloat(data.native) > 0 && (
            <StatCell label={data.nativeSymbol || 'Native'} value={`${data.native}`} />
          )}
          {data.native && parseFloat(data.native) > 0 && data.nativeUSD && (
            <StatCell label="Native USD" value={`$${Number(data.nativeUSD || 0).toFixed(2)}`} />
          )}
        </div>
        {data.tokens?.length > 0 && (
          <div className={`border-t ${tc.borderSubtle} pt-3`}>
            <div className="flex items-center gap-1.5 mb-2">
              <Wallet className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${iconAccent}`} />
              <span className="text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wide">Tokens</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              {data.tokens.map((t: any, i: number) => (
                <div key={i} className={`${tc.sectionBg} border rounded-xl px-2.5 py-2 sm:px-3 sm:py-2.5`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    {t.network && <NetworkIcon networkId={t.network} size={12} className="flex-shrink-0" />}
                    <span className="text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wide truncate">{t.symbol}</span>
                  </div>
                  <div className="text-xs sm:text-base text-text-primary font-medium">{t.balance}</div>
                  {t.network && <div className="text-[10px] sm:text-xs text-text-tertiary mt-0.5">{t.network}</div>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </CardShell>
  )
}

function SwapQuoteCard({ data }: { data: any }) {
  const { iconAccent } = useCardTheme()

  return (
    <CardShell icon={ArrowRightLeft} title="Swap Quote">
      <div className="space-y-3">
        <div className="flex items-center justify-center gap-3 sm:gap-4 py-2">
          <div className="text-center">
            <div className="text-sm sm:text-lg font-bold text-text-primary">{data.fromAmount}</div>
            <div className="text-[10px] sm:text-xs text-text-tertiary">{data.fromToken}</div>
          </div>
          <ArrowRightLeft className={`w-4 h-4 sm:w-5 sm:h-5 ${iconAccent}`} />
          <div className="text-center">
            <div className="text-sm sm:text-lg font-bold text-green-500">{data.toAmount}</div>
            <div className="text-[10px] sm:text-xs text-text-tertiary">{data.toToken}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
          {data.priceImpact && <StatCell label="Price Impact" value={`${data.priceImpact}%`} />}
          {data.provider && <StatCell label="Provider" value={data.provider} />}
        </div>
      </div>
    </CardShell>
  )
}

function SwitchCard({ data, type }: { data: any; type: 'wallet' | 'network' }) {
  return (
    <CardShell
      icon={type === 'wallet' ? Wallet : Network}
      title={type === 'wallet' ? 'Switched Wallet' : 'Switched Network'}
    >
      <div className="flex items-center gap-2 sm:gap-3">
        {type === 'network' && data.networkId && <NetworkIcon networkId={data.networkId} size={20} />}
        <span className="text-sm sm:text-lg font-medium text-text-primary">
          {type === 'wallet' ? data.walletName : data.networkName}
        </span>
      </div>
      {type === 'wallet' && data.address && (
        <div className="mt-1.5"><AddressChip address={data.address} /></div>
      )}
    </CardShell>
  )
}

function WalletGroupCard({ data, action }: { data: any; action: 'created' | 'deleted' }) {
  return (
    <CardShell
      icon={action === 'created' ? Plus : Trash2}
      title={action === 'created' ? `Group Created — ${data.groupName}` : `Group Deleted — ${data.groupName}`}
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
        <StatCell label="Wallets" value={String(data.walletsCreated ?? data.walletsDeleted ?? 0)} />
      </div>
    </CardShell>
  )
}

function RenameCard({ data, type }: { data: any; type: 'wallet' | 'group' }) {
  const { iconAccent } = useCardTheme()

  return (
    <CardShell icon={Pencil} title={`Renamed ${type === 'wallet' ? 'Wallet' : 'Group'}`}>
      <div className="flex items-center gap-2 sm:gap-3">
        <span className="text-xs sm:text-base text-text-tertiary line-through">{data.oldName}</span>
        <ArrowRightLeft className={`w-3 h-3 sm:w-4 sm:h-4 ${iconAccent}`} />
        <span className="text-xs sm:text-base text-text-primary font-medium">{data.newName}</span>
      </div>
    </CardShell>
  )
}

function SecurityCard({ data }: { data: any }) {
  const { tc } = useCardTheme()
  const riskScore = Number(data.riskScore || 0)
  const riskColor = riskScore > 70 ? 'text-red-500' : riskScore > 40 ? 'text-yellow-500' : 'text-green-500'

  return (
    <CardShell icon={Shield} title="Token Security Report">
      <div className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
          <div>
            <div className="text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wide mb-0.5 sm:mb-1">Risk Score</div>
            <div className={`text-sm sm:text-lg font-bold ${riskColor}`}>{riskScore}/100</div>
          </div>
          {data.contractAddress && <StatCell label="Contract" value={`${data.contractAddress.slice(0, 10)}...`} mono />}
        </div>
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {data.isHoneypot && <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-500 font-medium">Honeypot</span>}
          {data.isMintable && <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-500 font-medium">Mintable</span>}
          {data.isProxy && <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-500 font-medium">Proxy</span>}
          {data.isOpenSource && <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-500 font-medium">Open Source</span>}
        </div>
        {data.riskFlags?.length > 0 && (
          <div className={`flex flex-wrap gap-1.5 sm:gap-2 pt-2 border-t ${tc.borderSubtle}`}>
            {data.riskFlags.map((flag: string, i: number) => (
              <span key={i} className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-500">{flag}</span>
            ))}
          </div>
        )}
      </div>
    </CardShell>
  )
}

function MaliciousCheckCard({ data }: { data: any }) {
  return (
    <CardShell
      icon={data.isMalicious ? AlertTriangle : Shield}
      title="Address Check"
    >
      <div className="flex items-center gap-2 sm:gap-3">
        {data.isMalicious
          ? <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 flex-shrink-0" />
          : <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0" />
        }
        <span className={`text-xs sm:text-base font-medium ${data.isMalicious ? 'text-red-500' : 'text-green-500'}`}>
          {data.isMalicious ? `Flagged: ${data.maliciousType || 'Malicious'}` : 'Not flagged as malicious'}
        </span>
      </div>
      {data.address && <div className="mt-2"><AddressChip address={data.address} /></div>}
    </CardShell>
  )
}

function AlertsCard({ data }: { data: any }) {
  const { tc } = useCardTheme()

  return (
    <CardShell icon={Bell} title={`${data.total || data.alerts?.length || 0} Alerts`}>
      {data.alerts?.length > 0 ? (
        <div className={`${tc.sectionBg} border rounded-xl overflow-hidden`}>
          {data.alerts.map((a: any, i: number) => (
            <div key={a.id} className={`flex items-center justify-between px-3 py-2 sm:px-4 sm:py-2.5 ${i > 0 ? `border-t ${tc.borderSubtle}` : ''}`}>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${a.enabled ? 'bg-green-500' : 'bg-gray-400'}`} />
                <span className="text-xs sm:text-base text-text-primary">{a.type.replace(/_/g, ' ')}</span>
              </div>
              <span className="text-[10px] sm:text-xs text-text-tertiary">{a.triggerCount}x triggered</span>
            </div>
          ))}
        </div>
      ) : (
        <span className="text-xs sm:text-sm text-text-tertiary">No alerts configured</span>
      )}
    </CardShell>
  )
}

function PredictionMarketsCard({ data }: { data: any }) {
  const { tc, iconAccent } = useCardTheme()

  return (
    <CardShell icon={TrendingUp} title={`${data.count || data.markets?.length || 0} Prediction Markets`}>
      <div className="space-y-3">
        {data.markets?.slice(0, 5).map((m: any) => (
          <div key={m.id} className={`${tc.sectionBg} border rounded-xl p-2.5 sm:p-3`}>
            <div className="text-xs sm:text-base text-text-primary font-medium leading-tight mb-2">{m.question}</div>
            <div className="flex items-center flex-wrap gap-1.5 sm:gap-2">
              {m.outcomes?.map((o: any, i: number) => (
                <span key={i} className="text-[10px] sm:text-xs px-2 py-0.5 sm:py-1 rounded-lg bg-surface-hover">
                  <span className="text-text-tertiary">{o.label}</span>{' '}
                  <span className="font-medium text-text-primary">{Math.round(o.probability)}%</span>
                </span>
              ))}
              {m.volume > 0 && (
                <span className={`text-[10px] sm:text-xs ${iconAccent} ml-auto`}>${(m.volume / 1e6).toFixed(1)}M vol</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </CardShell>
  )
}

function SentimentCard({ data }: { data: any }) {
  const sentimentColor = data.overallSentiment === 'bullish' ? 'text-green-500'
    : data.overallSentiment === 'bearish' ? 'text-red-500'
    : 'text-yellow-500'

  return (
    <CardShell icon={TrendingUp} title="Crypto Market Sentiment">
      <div className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
          <div>
            <div className="text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wide mb-0.5 sm:mb-1">Sentiment</div>
            <div className={`text-xs sm:text-base font-bold capitalize ${sentimentColor}`}>{data.overallSentiment}</div>
          </div>
          <StatCell label="Markets Tracked" value={String(data.marketCount || 0)} />
        </div>
        {data.summary && <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">{data.summary}</p>}
      </div>
    </CardShell>
  )
}

function PortfolioCard({ data }: { data: any }) {
  const pnlColor = (data.totalPnl || 0) >= 0 ? 'text-green-500' : 'text-red-500'

  return (
    <CardShell icon={BarChart3} title="Portfolio P/L">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
        <StatCell label="Total Value" value={`$${Number(data.totalValueUsd || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`} />
        <div>
          <div className="text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wide mb-0.5 sm:mb-1">P/L</div>
          <div className={`text-xs sm:text-base font-bold ${pnlColor}`}>
            {(data.totalPnl || 0) >= 0 ? '+' : ''}${Number(data.totalPnl || 0).toFixed(2)} ({Number(data.totalPnlPercent || 0).toFixed(1)}%)
          </div>
        </div>
        {data.bestPerformer && <StatCell label="Best" value={`${data.bestPerformer.symbol} +${data.bestPerformer.pnlPercent?.toFixed(1)}%`} />}
        {data.worstPerformer && <StatCell label="Worst" value={`${data.worstPerformer.symbol} ${data.worstPerformer.pnlPercent?.toFixed(1)}%`} />}
      </div>
    </CardShell>
  )
}

function TradeHistoryCard({ data }: { data: any }) {
  const { tc, iconAccent } = useCardTheme()

  return (
    <CardShell icon={ArrowRightLeft} title={`${data.count || data.trades?.length || 0} Recent Trades`}>
      {data.trades?.length > 0 ? (
        <div className={`${tc.sectionBg} border rounded-xl overflow-hidden`}>
          {data.trades.slice(0, 5).map((t: any, i: number) => (
            <div key={t.id} className={`flex items-center justify-between px-3 py-2 sm:px-4 sm:py-2.5 ${i > 0 ? `border-t ${tc.borderSubtle}` : ''}`}>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-xs sm:text-base text-text-primary">{t.tokenInSymbol}</span>
                <ArrowRightLeft className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${iconAccent}`} />
                <span className="text-xs sm:text-base text-text-primary">{t.tokenOutSymbol}</span>
              </div>
              <span className="text-[10px] sm:text-xs text-text-tertiary">${Number(t.totalValueUsd || 0).toFixed(2)}</span>
            </div>
          ))}
        </div>
      ) : (
        <span className="text-xs sm:text-sm text-text-tertiary">No recent trades</span>
      )}
    </CardShell>
  )
}

function WatchlistCard({ data, action }: { data: any; action: 'list' | 'added' | 'activity' }) {
  const { tc } = useCardTheme()

  if (action === 'list') {
    return (
      <CardShell icon={Eye} title={`${data.total || data.wallets?.length || 0} Watched Wallets`}>
        {data.wallets?.length > 0 ? (
          <div className={`${tc.sectionBg} border rounded-xl overflow-hidden`}>
            {data.wallets.map((w: any, i: number) => (
              <div key={w.id} className={`flex items-center justify-between px-3 py-2 sm:px-4 sm:py-2.5 ${i > 0 ? `border-t ${tc.borderSubtle}` : ''}`}>
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
          <div className={`${tc.sectionBg} border rounded-xl overflow-hidden`}>
            {data.activities.slice(0, 5).map((a: any, i: number) => (
              <div key={a.id} className={`flex items-center justify-between px-3 py-2 sm:px-4 sm:py-2.5 ${i > 0 ? `border-t ${tc.borderSubtle}` : ''}`}>
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

function X402Card({ data, action }: { data: any; action: 'status' | 'payments' }) {
  const { tc } = useCardTheme()

  if (action === 'status') {
    return (
      <CardShell icon={CreditCard} title="x402 Payment Status">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${data.enabled ? 'bg-green-500' : 'bg-gray-400'}`} />
            <span className="text-xs sm:text-base text-text-primary font-medium">{data.enabled ? 'Enabled' : 'Disabled'}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
            <StatCell label="Daily Spent" value={`$${Number(data.dailySpent || 0).toFixed(2)} / $${Number(data.dailyBudget || 0).toFixed(2)}`} />
            <StatCell label="Lifetime" value={`$${Number(data.totalLifetimeSpent || 0).toFixed(2)}`} />
            <StatCell label="Payments" value={String(data.totalPaymentCount || 0)} />
          </div>
        </div>
      </CardShell>
    )
  }
  return (
    <CardShell icon={CreditCard} title={`${data.count || data.payments?.length || 0} x402 Payments`}>
      {data.payments?.length > 0 ? (
        <div className={`${tc.sectionBg} border rounded-xl overflow-hidden`}>
          {data.payments.slice(0, 5).map((p: any, i: number) => (
            <div key={p.id} className={`flex items-center justify-between px-3 py-2 sm:px-4 sm:py-2.5 ${i > 0 ? `border-t ${tc.borderSubtle}` : ''}`}>
              <span className="text-xs sm:text-base text-text-primary">{p.domain}</span>
              <span className="text-[10px] sm:text-xs text-text-tertiary">${Number(p.amountUsd || 0).toFixed(4)}</span>
            </div>
          ))}
        </div>
      ) : (
        <span className="text-xs sm:text-sm text-text-tertiary">No payments recorded</span>
      )}
    </CardShell>
  )
}

function YieldCard({ data }: { data: any }) {
  const { tc, iconAccent } = useCardTheme()

  return (
    <CardShell icon={Sprout} title={`${data.count || data.opportunities?.length || 0} Yield Opportunities`}>
      {data.opportunities?.length > 0 ? (
        <div className={`${tc.sectionBg} border rounded-xl overflow-hidden`}>
          {data.opportunities.slice(0, 5).map((o: any, i: number) => (
            <div key={o.id} className={`flex items-center justify-between px-3 py-2 sm:px-4 sm:py-2.5 ${i > 0 ? `border-t ${tc.borderSubtle}` : ''}`}>
              <div className="flex items-center gap-1.5 sm:gap-2">
                {o.network && <NetworkIcon networkId={o.network} size={14} className="flex-shrink-0" />}
                <span className="text-xs sm:text-base text-text-primary font-medium">{o.protocol}</span>
                <span className="text-[10px] sm:text-xs text-text-tertiary">{o.token}</span>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <span className={`text-xs sm:text-base font-medium ${iconAccent}`}>{Number(o.apy || 0).toFixed(1)}%</span>
                <span className={`text-[10px] sm:text-xs px-1.5 py-0.5 rounded-full ${
                  o.riskLevel === 'low' ? 'bg-green-500/20 text-green-500' :
                  o.riskLevel === 'high' ? 'bg-red-500/20 text-red-500' :
                  'bg-yellow-500/20 text-yellow-500'
                }`}>{o.riskLevel}</span>
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

function SettingsCard({ data }: { data: any }) {
  return (
    <CardShell icon={Settings} title="Current Settings">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
        <div>
          <div className="text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wide mb-0.5 sm:mb-1">Alchemy Key</div>
          <div className={`text-xs sm:text-base font-medium ${data.hasAlchemyKey ? 'text-green-500' : 'text-text-tertiary'}`}>
            {data.hasAlchemyKey ? 'Configured' : 'Not set'}
          </div>
        </div>
        <div>
          <div className="text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wide mb-0.5 sm:mb-1">Helius Key</div>
          <div className={`text-xs sm:text-base font-medium ${data.hasHeliusKey ? 'text-green-500' : 'text-text-tertiary'}`}>
            {data.hasHeliusKey ? 'Configured' : 'Not set'}
          </div>
        </div>
        <div>
          <div className="text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wide mb-0.5 sm:mb-1">CoinGecko Key</div>
          <div className={`text-xs sm:text-base font-medium ${data.hasCoinGeckoKey ? 'text-green-500' : 'text-text-tertiary'}`}>
            {data.hasCoinGeckoKey ? 'Configured' : 'Not set'}
          </div>
        </div>
        <div>
          <div className="text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wide mb-0.5 sm:mb-1">OpenClaw</div>
          <div className={`text-xs sm:text-base font-medium ${data.hasOpenClawUrl ? 'text-green-500' : 'text-text-tertiary'}`}>
            {data.hasOpenClawUrl ? 'Connected' : 'Not configured'}
          </div>
        </div>
      </div>
    </CardShell>
  )
}

function SimpleConfirmCard({ icon: Icon, title, message }: {
  icon: typeof Wallet
  title: string
  message: string
}) {
  return (
    <CardShell icon={Icon} title={title}>
      <div className="flex items-center gap-2 sm:gap-3">
        <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0" />
        <span className="text-xs sm:text-base text-text-primary">{message}</span>
      </div>
    </CardShell>
  )
}

function FailureCard({ result }: { result: ActionResultData }) {
  return (
    <CardShell icon={XCircle} title="Action Failed">
      <div className="flex items-center gap-2 sm:gap-3">
        <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 flex-shrink-0" />
        <span className="text-xs sm:text-base text-red-500">{result.message}{result.error ? `: ${result.error}` : ''}</span>
      </div>
    </CardShell>
  )
}

export function ActionResultCard({ result }: ActionResultCardProps) {
  if (!result.success) return <FailureCard result={result} />

  const d = result.data as any

  switch (result.actionName) {
    case 'list_wallets':
      return <WalletListCard data={d} />
    case 'list_networks':
      return <NetworkListCard data={d} />
    case 'get_balance':
      return <BalanceCard data={d} />
    case 'get_swap_quote':
      return <SwapQuoteCard data={d} />
    case 'switch_wallet':
      return <SwitchCard data={d} type="wallet" />
    case 'switch_network':
      return <SwitchCard data={d} type="network" />
    case 'create_wallet_group':
      return <WalletGroupCard data={d} action="created" />
    case 'delete_wallet_group':
      return <WalletGroupCard data={d} action="deleted" />
    case 'add_wallets_to_group':
      return <SimpleConfirmCard icon={Plus} title="Wallets Added" message={result.message} />
    case 'rename_wallet':
      return <RenameCard data={d} type="wallet" />
    case 'rename_wallet_group':
      return <RenameCard data={d} type="group" />
    case 'delete_wallet':
      return <SimpleConfirmCard icon={Trash2} title="Wallet Deleted" message={result.message} />
    case 'get_token_security':
      return <SecurityCard data={d} />
    case 'check_malicious_address':
      return <MaliciousCheckCard data={d} />
    case 'get_settings':
      return <SettingsCard data={d} />
    case 'create_alert':
      return <SimpleConfirmCard icon={Bell} title="Alert Created" message={result.message} />
    case 'delete_alert':
      return <SimpleConfirmCard icon={Trash2} title="Alert Deleted" message={result.message} />
    case 'list_alerts':
      return <AlertsCard data={d} />
    case 'search_prediction_markets':
      return <PredictionMarketsCard data={d} />
    case 'get_prediction_market':
      return d?.outcomes ? <PredictionMarketsCard data={{ markets: [d], count: 1 }} /> : <SimpleConfirmCard icon={TrendingUp} title="Market" message={result.message} />
    case 'get_crypto_sentiment':
      return <SentimentCard data={d} />
    case 'get_portfolio_pnl':
      return <PortfolioCard data={d} />
    case 'get_trade_history':
      return <TradeHistoryCard data={d} />
    case 'add_watched_wallet':
      return <WatchlistCard data={d} action="added" />
    case 'remove_watched_wallet':
      return <SimpleConfirmCard icon={Trash2} title="Wallet Removed" message={result.message} />
    case 'list_watched_wallets':
      return <WatchlistCard data={d} action="list" />
    case 'get_wallet_activity':
      return <WatchlistCard data={d} action="activity" />
    case 'get_x402_status':
      return <X402Card data={d} action="status" />
    case 'list_x402_payments':
      return <X402Card data={d} action="payments" />
    case 'search_yield_opportunities':
    case 'get_top_yields':
    case 'get_yield_for_token':
      return <YieldCard data={d} />
    default:
      return <SimpleConfirmCard icon={CheckCircle2} title="Action Complete" message={result.message} />
  }
}
