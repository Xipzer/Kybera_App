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

function CardShell({ icon: Icon, title, accent, children }: {
  icon: typeof Wallet
  title: string
  accent: string
  children: React.ReactNode
}) {
  const { isDark } = useTheme()
  const tc = themeClasses(isDark)

  return (
    <div className={`${isDark ? 'bg-white/[0.03]' : 'bg-gray-50/80'} border ${tc.border} rounded-xl overflow-hidden`}>
      <div className={`flex items-center gap-2 px-3 py-2 border-b ${tc.borderSubtle}`}>
        <div className={`w-6 h-6 rounded-md ${accent} flex items-center justify-center`}>
          <Icon className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="text-xs font-medium text-text-primary">{title}</span>
      </div>
      <div className="p-3">{children}</div>
    </div>
  )
}

function StatRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-[11px] text-text-tertiary">{label}</span>
      <span className={`text-[11px] text-text-primary font-medium ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  )
}

function AddressChip({ address }: { address: string }) {
  return (
    <span className="font-mono text-[10px] text-text-tertiary">
      {address.slice(0, 6)}...{address.slice(-4)}
    </span>
  )
}

function WalletListCard({ data }: { data: any }) {
  return (
    <CardShell icon={Wallet} title={`${data.totalWallets} Wallets in ${data.totalGroups} Groups`} accent="bg-blue-500">
      <div className="space-y-2">
        {data.groups?.map((group: any) => (
          <div key={group.groupId} className="space-y-1">
            <div className="text-[11px] font-medium text-text-secondary">{group.groupName}</div>
            {group.wallets?.map((w: any) => (
              <div key={w.id} className="flex items-center justify-between pl-2">
                <span className="text-[11px] text-text-primary">{w.name}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent font-medium">{w.type}</span>
                  <AddressChip address={w.address} />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </CardShell>
  )
}

function NetworkListCard({ data }: { data: any }) {
  return (
    <CardShell icon={Globe} title={`${(data.evm?.length || 0) + (data.svm?.length || 0)} Networks Available`} accent="bg-purple-500">
      <div className="grid grid-cols-2 gap-1.5">
        {[...(data.evm || []), ...(data.svm || [])].map((n: any) => (
          <div key={n.id} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-surface-hover/50">
            <NetworkIcon networkId={n.id} size={14} className="flex-shrink-0" />
            <span className="text-[11px] text-text-primary font-medium truncate">{n.name}</span>
            <span className="text-[10px] text-text-tertiary ml-auto">{n.symbol}</span>
          </div>
        ))}
      </div>
    </CardShell>
  )
}

function BalanceCard({ data }: { data: any }) {
  return (
    <CardShell icon={Wallet} title={`Balance — ${data.wallet || 'Wallet'}`} accent="bg-green-500">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-tertiary">Total Value</span>
          <span className="text-sm font-bold text-text-primary">${Number(data.totalUSD || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        {data.native && parseFloat(data.native) > 0 && (
          <StatRow label={`${data.nativeSymbol || 'Native'}`} value={`${data.native} ($${Number(data.nativeUSD || 0).toFixed(2)})`} />
        )}
        {data.tokens?.length > 0 && (
          <div className="space-y-0.5 pt-1 border-t border-border-subtle">
            {data.tokens.map((t: any, i: number) => (
              <div key={i} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-text-tertiary">{t.symbol}</span>
                  {t.network && <span className="text-[9px] text-text-tertiary/50">{t.network}</span>}
                </div>
                <span className="text-[11px] text-text-primary font-medium">{t.balance}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </CardShell>
  )
}

function SwapQuoteCard({ data }: { data: any }) {
  return (
    <CardShell icon={ArrowRightLeft} title="Swap Quote" accent="bg-orange-500">
      <div className="space-y-2">
        <div className="flex items-center justify-center gap-2 py-1">
          <div className="text-center">
            <div className="text-sm font-bold text-text-primary">{data.fromAmount}</div>
            <div className="text-[10px] text-text-tertiary">{data.fromToken}</div>
          </div>
          <ArrowRightLeft className="w-4 h-4 text-text-tertiary" />
          <div className="text-center">
            <div className="text-sm font-bold text-green-400">{data.toAmount}</div>
            <div className="text-[10px] text-text-tertiary">{data.toToken}</div>
          </div>
        </div>
        {data.priceImpact && <StatRow label="Price Impact" value={`${data.priceImpact}%`} />}
        {data.provider && <StatRow label="Provider" value={data.provider} />}
      </div>
    </CardShell>
  )
}

function SwitchCard({ data, type }: { data: any; type: 'wallet' | 'network' }) {
  return (
    <CardShell
      icon={type === 'wallet' ? Wallet : Network}
      title={type === 'wallet' ? `Switched Wallet` : `Switched Network`}
      accent="bg-indigo-500"
    >
      <div className="flex items-center gap-2">
        {type === 'network' && data.networkId && <NetworkIcon networkId={data.networkId} size={18} />}
        <span className="text-sm font-medium text-text-primary">
          {type === 'wallet' ? data.walletName : data.networkName}
        </span>
      </div>
      {type === 'wallet' && data.address && (
        <div className="mt-1"><AddressChip address={data.address} /></div>
      )}
    </CardShell>
  )
}

function WalletGroupCard({ data, action }: { data: any; action: 'created' | 'deleted' }) {
  return (
    <CardShell
      icon={action === 'created' ? Plus : Trash2}
      title={action === 'created' ? `Group Created — ${data.groupName}` : `Group Deleted — ${data.groupName}`}
      accent={action === 'created' ? 'bg-green-500' : 'bg-red-500'}
    >
      <StatRow label="Wallets" value={String(data.walletsCreated ?? data.walletsDeleted ?? 0)} />
    </CardShell>
  )
}

function RenameCard({ data, type }: { data: any; type: 'wallet' | 'group' }) {
  return (
    <CardShell icon={Pencil} title={`Renamed ${type === 'wallet' ? 'Wallet' : 'Group'}`} accent="bg-yellow-500">
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-text-tertiary line-through">{data.oldName}</span>
        <span className="text-[11px] text-text-tertiary">→</span>
        <span className="text-[11px] text-text-primary font-medium">{data.newName}</span>
      </div>
    </CardShell>
  )
}

function SecurityCard({ data }: { data: any }) {
  const riskScore = Number(data.riskScore || 0)
  const riskColor = riskScore > 70 ? 'text-red-400' : riskScore > 40 ? 'text-yellow-400' : 'text-green-400'

  return (
    <CardShell icon={Shield} title="Token Security Report" accent="bg-red-500">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-tertiary">Risk Score</span>
          <span className={`text-lg font-bold ${riskColor}`}>{riskScore}/100</span>
        </div>
        {data.contractAddress && <StatRow label="Contract" value={`${data.contractAddress.slice(0, 10)}...`} mono />}
        <div className="flex flex-wrap gap-1 pt-1">
          {data.isHoneypot && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 font-medium">Honeypot</span>}
          {data.isMintable && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 font-medium">Mintable</span>}
          {data.isProxy && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 font-medium">Proxy</span>}
          {data.isOpenSource && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400 font-medium">Open Source</span>}
        </div>
        {data.riskFlags?.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1 border-t border-border-subtle">
            {data.riskFlags.map((flag: string, i: number) => (
              <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400">{flag}</span>
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
      accent={data.isMalicious ? 'bg-red-500' : 'bg-green-500'}
    >
      <div className="flex items-center gap-2">
        {data.isMalicious
          ? <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          : <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
        }
        <span className={`text-xs font-medium ${data.isMalicious ? 'text-red-400' : 'text-green-400'}`}>
          {data.isMalicious ? `Flagged: ${data.maliciousType || 'Malicious'}` : 'Not flagged as malicious'}
        </span>
      </div>
      {data.address && <div className="mt-1"><AddressChip address={data.address} /></div>}
    </CardShell>
  )
}

function AlertsCard({ data }: { data: any }) {
  return (
    <CardShell icon={Bell} title={`${data.total || data.alerts?.length || 0} Alerts`} accent="bg-yellow-500">
      <div className="space-y-1">
        {data.alerts?.map((a: any) => (
          <div key={a.id} className="flex items-center justify-between py-0.5">
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${a.enabled ? 'bg-green-400' : 'bg-gray-400'}`} />
              <span className="text-[11px] text-text-primary">{a.type.replace(/_/g, ' ')}</span>
            </div>
            <span className="text-[10px] text-text-tertiary">{a.triggerCount}x triggered</span>
          </div>
        ))}
        {(!data.alerts || data.alerts.length === 0) && (
          <span className="text-[11px] text-text-tertiary">No alerts configured</span>
        )}
      </div>
    </CardShell>
  )
}

function PredictionMarketsCard({ data }: { data: any }) {
  return (
    <CardShell icon={TrendingUp} title={`${data.count || data.markets?.length || 0} Prediction Markets`} accent="bg-cyan-500">
      <div className="space-y-2">
        {data.markets?.slice(0, 5).map((m: any) => (
          <div key={m.id} className="space-y-1">
            <div className="text-[11px] text-text-primary font-medium leading-tight">{m.question}</div>
            <div className="flex items-center gap-2">
              {m.outcomes?.map((o: any, i: number) => (
                <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-surface-hover">
                  <span className="text-text-tertiary">{o.label}</span>{' '}
                  <span className="font-medium text-text-primary">{Math.round(o.probability)}%</span>
                </span>
              ))}
              {m.volume > 0 && (
                <span className="text-[10px] text-text-tertiary ml-auto">${(m.volume / 1e6).toFixed(1)}M vol</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </CardShell>
  )
}

function SentimentCard({ data }: { data: any }) {
  const sentimentColor = data.overallSentiment === 'bullish' ? 'text-green-400'
    : data.overallSentiment === 'bearish' ? 'text-red-400'
    : 'text-yellow-400'

  return (
    <CardShell icon={TrendingUp} title="Crypto Market Sentiment" accent="bg-cyan-500">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-tertiary">Sentiment</span>
          <span className={`text-sm font-bold capitalize ${sentimentColor}`}>{data.overallSentiment}</span>
        </div>
        {data.summary && <p className="text-[11px] text-text-secondary leading-relaxed">{data.summary}</p>}
        <StatRow label="Markets Tracked" value={String(data.marketCount || 0)} />
      </div>
    </CardShell>
  )
}

function PortfolioCard({ data }: { data: any }) {
  const pnlColor = (data.totalPnl || 0) >= 0 ? 'text-green-400' : 'text-red-400'

  return (
    <CardShell icon={BarChart3} title="Portfolio P/L" accent="bg-emerald-500">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-tertiary">Total Value</span>
          <span className="text-sm font-bold text-text-primary">${Number(data.totalValueUsd || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-tertiary">P/L</span>
          <span className={`text-sm font-bold ${pnlColor}`}>
            {(data.totalPnl || 0) >= 0 ? '+' : ''}${Number(data.totalPnl || 0).toFixed(2)} ({Number(data.totalPnlPercent || 0).toFixed(1)}%)
          </span>
        </div>
        {data.bestPerformer && <StatRow label="Best" value={`${data.bestPerformer.symbol} +${data.bestPerformer.pnlPercent?.toFixed(1)}%`} />}
        {data.worstPerformer && <StatRow label="Worst" value={`${data.worstPerformer.symbol} ${data.worstPerformer.pnlPercent?.toFixed(1)}%`} />}
      </div>
    </CardShell>
  )
}

function TradeHistoryCard({ data }: { data: any }) {
  return (
    <CardShell icon={ArrowRightLeft} title={`${data.count || data.trades?.length || 0} Recent Trades`} accent="bg-orange-500">
      <div className="space-y-1.5">
        {data.trades?.slice(0, 5).map((t: any) => (
          <div key={t.id} className="flex items-center justify-between py-0.5">
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-text-primary">{t.tokenInSymbol}</span>
              <ArrowRightLeft className="w-2.5 h-2.5 text-text-tertiary" />
              <span className="text-[11px] text-text-primary">{t.tokenOutSymbol}</span>
            </div>
            <span className="text-[10px] text-text-tertiary">${Number(t.totalValueUsd || 0).toFixed(2)}</span>
          </div>
        ))}
      </div>
    </CardShell>
  )
}

function WatchlistCard({ data, action }: { data: any; action: 'list' | 'added' | 'activity' }) {
  if (action === 'list') {
    return (
      <CardShell icon={Eye} title={`${data.total || data.wallets?.length || 0} Watched Wallets`} accent="bg-violet-500">
        <div className="space-y-1">
          {data.wallets?.map((w: any) => (
            <div key={w.id} className="flex items-center justify-between py-0.5">
              <span className="text-[11px] text-text-primary font-medium">{w.label}</span>
              <AddressChip address={w.address} />
            </div>
          ))}
        </div>
      </CardShell>
    )
  }
  if (action === 'activity') {
    return (
      <CardShell icon={Eye} title={`${data.count || 0} Activities — ${data.walletLabel || 'Wallet'}`} accent="bg-violet-500">
        <div className="space-y-1">
          {data.activities?.slice(0, 5).map((a: any) => (
            <div key={a.id} className="flex items-center justify-between py-0.5">
              <span className="text-[11px] text-text-primary capitalize">{a.activityType?.replace(/_/g, ' ')}</span>
              {a.estimatedValueUsd > 0 && <span className="text-[10px] text-text-tertiary">${Number(a.estimatedValueUsd).toFixed(2)}</span>}
            </div>
          ))}
        </div>
      </CardShell>
    )
  }
  return (
    <CardShell icon={Eye} title="Wallet Added to Watchlist" accent="bg-violet-500">
      <StatRow label="Label" value={data.label || 'Unlabeled'} />
      {data.address && <div className="mt-1"><AddressChip address={data.address} /></div>}
    </CardShell>
  )
}

function X402Card({ data, action }: { data: any; action: 'status' | 'payments' }) {
  if (action === 'status') {
    return (
      <CardShell icon={CreditCard} title="x402 Payment Status" accent="bg-pink-500">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${data.enabled ? 'bg-green-400' : 'bg-gray-400'}`} />
            <span className="text-[11px] text-text-primary font-medium">{data.enabled ? 'Enabled' : 'Disabled'}</span>
          </div>
          <StatRow label="Daily Spent" value={`$${Number(data.dailySpent || 0).toFixed(2)} / $${Number(data.dailyBudget || 0).toFixed(2)}`} />
          <StatRow label="Lifetime" value={`$${Number(data.totalLifetimeSpent || 0).toFixed(2)} (${data.totalPaymentCount || 0} payments)`} />
        </div>
      </CardShell>
    )
  }
  return (
    <CardShell icon={CreditCard} title={`${data.count || data.payments?.length || 0} x402 Payments`} accent="bg-pink-500">
      <div className="space-y-1">
        {data.payments?.slice(0, 5).map((p: any) => (
          <div key={p.id} className="flex items-center justify-between py-0.5">
            <span className="text-[11px] text-text-primary">{p.domain}</span>
            <span className="text-[10px] text-text-tertiary">${Number(p.amountUsd || 0).toFixed(4)}</span>
          </div>
        ))}
      </div>
    </CardShell>
  )
}

function YieldCard({ data }: { data: any }) {
  return (
    <CardShell icon={Sprout} title={`${data.count || data.opportunities?.length || 0} Yield Opportunities`} accent="bg-lime-500">
      <div className="space-y-1.5">
        {data.opportunities?.slice(0, 5).map((o: any) => (
          <div key={o.id} className="flex items-center justify-between py-0.5">
            <div className="flex items-center gap-1.5">
              {o.network && <NetworkIcon networkId={o.network} size={12} />}
              <span className="text-[11px] text-text-primary">{o.protocol}</span>
              <span className="text-[10px] text-text-tertiary">{o.token}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-green-400">{Number(o.apy || 0).toFixed(1)}%</span>
              <span className={`text-[10px] px-1 py-0.5 rounded ${
                o.riskLevel === 'low' ? 'bg-green-500/20 text-green-400' :
                o.riskLevel === 'high' ? 'bg-red-500/20 text-red-400' :
                'bg-yellow-500/20 text-yellow-400'
              }`}>{o.riskLevel}</span>
            </div>
          </div>
        ))}
      </div>
    </CardShell>
  )
}

function SettingsCard({ data }: { data: any }) {
  return (
    <CardShell icon={Settings} title="Current Settings" accent="bg-gray-500">
      <div className="space-y-1">
        <StatRow label="Alchemy Key" value={data.hasAlchemyKey ? 'Configured' : 'Not set'} />
        <StatRow label="Helius Key" value={data.hasHeliusKey ? 'Configured' : 'Not set'} />
        <StatRow label="CoinGecko Key" value={data.hasCoinGeckoKey ? 'Configured' : 'Not set'} />
        <StatRow label="OpenClaw" value={data.hasOpenClawUrl ? 'Connected' : 'Not configured'} />
      </div>
    </CardShell>
  )
}

function SimpleConfirmCard({ icon: Icon, title, accent, message }: {
  icon: typeof Wallet
  title: string
  accent: string
  message: string
}) {
  return (
    <CardShell icon={Icon} title={title} accent={accent}>
      <div className="flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
        <span className="text-xs text-text-primary">{message}</span>
      </div>
    </CardShell>
  )
}

function FailureCard({ result }: { result: ActionResultData }) {
  return (
    <CardShell icon={XCircle} title="Action Failed" accent="bg-red-500">
      <div className="flex items-center gap-2">
        <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
        <span className="text-xs text-red-400">{result.message}{result.error ? `: ${result.error}` : ''}</span>
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
      return <SimpleConfirmCard icon={Plus} title="Wallets Added" accent="bg-green-500" message={result.message} />
    case 'rename_wallet':
      return <RenameCard data={d} type="wallet" />
    case 'rename_wallet_group':
      return <RenameCard data={d} type="group" />
    case 'delete_wallet':
      return <SimpleConfirmCard icon={Trash2} title="Wallet Deleted" accent="bg-red-500" message={result.message} />
    case 'get_token_security':
      return <SecurityCard data={d} />
    case 'check_malicious_address':
      return <MaliciousCheckCard data={d} />
    case 'get_settings':
      return <SettingsCard data={d} />
    case 'create_alert':
      return <SimpleConfirmCard icon={Bell} title="Alert Created" accent="bg-yellow-500" message={result.message} />
    case 'delete_alert':
      return <SimpleConfirmCard icon={Trash2} title="Alert Deleted" accent="bg-red-500" message={result.message} />
    case 'list_alerts':
      return <AlertsCard data={d} />
    case 'search_prediction_markets':
      return <PredictionMarketsCard data={d} />
    case 'get_prediction_market':
      return d?.outcomes ? <PredictionMarketsCard data={{ markets: [d], count: 1 }} /> : <SimpleConfirmCard icon={TrendingUp} title="Market" accent="bg-cyan-500" message={result.message} />
    case 'get_crypto_sentiment':
      return <SentimentCard data={d} />
    case 'get_portfolio_pnl':
      return <PortfolioCard data={d} />
    case 'get_trade_history':
      return <TradeHistoryCard data={d} />
    case 'add_watched_wallet':
      return <WatchlistCard data={d} action="added" />
    case 'remove_watched_wallet':
      return <SimpleConfirmCard icon={Trash2} title="Wallet Removed" accent="bg-red-500" message={result.message} />
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
      return <SimpleConfirmCard icon={CheckCircle2} title="Action Complete" accent="bg-green-500" message={result.message} />
  }
}
