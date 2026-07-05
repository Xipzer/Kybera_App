/**
 * Code by Xipzer
 *
 * Wallet-related result cards: WalletListCard, BalanceCard, WalletGroupCard,
 * RenameCard, SwitchCard (wallet mode).
 */

import { Wallet, Plus, Trash2, Pencil, ArrowRightLeft, TrendingUp, TrendingDown } from 'lucide-react'
import { useTheme } from '../../../hooks/useTheme'
import { NetworkIcon, NativeTokenIcon } from '../../NetworkIcons'
import { formatCryptoBalance, formatUSD } from '../../../utils/formatters'
import { useCardTheme, CardShell, StatCell, AddressChip } from './shared'

interface WalletListItem {
  id: string
  name: string
  type: string
  address: string
}

interface WalletListGroup {
  groupId: string
  groupName: string
  wallets?: WalletListItem[]
}

interface WalletListData {
  totalWallets?: number
  totalGroups?: number
  groups?: WalletListGroup[]
}

export function WalletListCard({ data }: { data: Record<string, unknown> }) {
  const { card } = useCardTheme()
  const d = data as WalletListData

  return (
    <CardShell icon={Wallet} title={`${d.totalWallets} Wallets in ${d.totalGroups} Groups`}>
      <div className="space-y-3">
        {d.groups?.map((group) => (
          <div key={group.groupId}>
            <div className="text-2xs sm:text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">{group.groupName}</div>
            <div className={`${card.innerBg} border ${card.innerBorder} rounded-xl overflow-hidden`}>
              {group.wallets?.map((w, i) => (
                <div key={w.id} className={`flex items-center justify-between px-3 py-2 sm:px-4 sm:py-2.5 ${i > 0 ? `border-t ${card.innerBorder}` : ''}`}>
                  <span className="text-xs sm:text-base text-text-primary font-medium">{w.name}</span>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <span className="text-2xs sm:text-xs px-1.5 py-0.5 rounded-full bg-accent-500/10 text-accent-500 font-medium">{w.type}</span>
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

interface BalanceToken {
  network?: string
  address?: string
  symbol: string
  name?: string
  balance: string | number
  usdValue?: number
  change24h?: number
  isNative?: boolean
  logoURI?: string
}

interface BalanceData {
  wallet?: string
  walletAddress?: string
  totalUSD?: number
  native?: string
  nativeSymbol?: string
  nativeUSD?: number
  tokens?: BalanceToken[]
}

export function BalanceCard({ data }: { data: Record<string, unknown> }) {
  const { card, titleGradient, sendGradient } = useCardTheme()
  const { theme } = useTheme()
  const tokenStyles = theme.styles.tokenList
  const d = data as BalanceData

  return (
    <div className={`${card.bg} border ${card.border} rounded-2xl overflow-hidden`}>
      <div className={`flex items-center justify-between px-3 py-2.5 sm:px-4 sm:py-3 border-b ${card.innerBorder}`}>
        <span className={`text-sm sm:text-lg font-bold bg-gradient-to-r ${titleGradient} bg-clip-text text-transparent`}>
          {d.wallet || 'Wallet'}
        </span>
        {d.walletAddress && <AddressChip address={d.walletAddress} />}
      </div>

      <div className="p-3 sm:p-4 space-y-4">
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className={`relative rounded-xl border ${card.innerBorder} p-3 sm:p-4 text-center overflow-hidden`}>
            <div className={`absolute inset-0 bg-gradient-to-br ${sendGradient} opacity-[0.06]`} />
            <div className="relative">
              <div className="text-2xs sm:text-xs text-text-tertiary uppercase tracking-wider mb-1 sm:mb-2">Total Value</div>
              <div className="text-base sm:text-xl font-bold text-text-primary font-mono">
                {formatUSD(Number(d.totalUSD || 0))}
              </div>
            </div>
          </div>

          {d.native && parseFloat(d.native) > 0 && (
            <div className={`relative rounded-xl border ${card.innerBorder} p-3 sm:p-4 text-center overflow-hidden`}>
              <div className={`absolute inset-0 bg-gradient-to-br ${sendGradient} opacity-[0.04]`} />
              <div className="relative">
                <div className="text-2xs sm:text-xs text-text-tertiary uppercase tracking-wider mb-1 sm:mb-2">{d.nativeSymbol || 'Native'}</div>
                <div className="text-base sm:text-xl font-bold text-text-primary font-mono">
                  {formatCryptoBalance(d.native)}
                </div>
              </div>
            </div>
          )}

          {d.native && parseFloat(d.native) > 0 && (d.nativeUSD ?? 0) > 0 && (
            <div className={`relative rounded-xl border ${card.innerBorder} p-3 sm:p-4 text-center overflow-hidden`}>
              <div className={`absolute inset-0 bg-gradient-to-br ${sendGradient} opacity-[0.04]`} />
              <div className="relative">
                <div className="text-2xs sm:text-xs text-text-tertiary uppercase tracking-wider mb-1 sm:mb-2">Native USD</div>
                <div className="text-base sm:text-xl font-bold text-text-primary font-mono">
                  {formatUSD(d.nativeUSD ?? 0)}
                </div>
              </div>
            </div>
          )}
        </div>

        {d.tokens && d.tokens.length > 0 && (
          <div className="space-y-1.5 sm:space-y-2">
            {d.tokens.map((t) => (
              <div
                key={`${t.network || ''}-${t.address || t.symbol}`}
                className={`p-3 sm:p-4 ${tokenStyles.cardBg} border ${tokenStyles.cardBorder} rounded-xl ${tokenStyles.cardShadow} transition-all duration-200`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="relative flex-shrink-0">
                      <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center overflow-hidden ${t.isNative ? '' : tokenStyles.iconBg}`}>
                        {t.isNative ? (
                          <NativeTokenIcon symbol={t.symbol} size={44} className="w-9 h-9 sm:w-11 sm:h-11" />
                        ) : t.logoURI ? (
                          <img
                            src={t.logoURI}
                            alt={t.symbol}
                            className="w-full h-full object-cover rounded-full"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                              e.currentTarget.nextElementSibling?.classList.remove('hidden')
                            }}
                          />
                        ) : null}
                        {!t.isNative && (
                          <span className={`text-xs sm:text-sm font-bold text-text-primary ${t.logoURI ? 'hidden' : ''}`}>
                            {t.symbol.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                      {t.network && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-surface-base border border-border-subtle flex items-center justify-center">
                          <NetworkIcon networkId={t.network} size={14} className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm sm:text-base font-semibold text-text-primary">{t.symbol}</p>
                      <p className="text-xs sm:text-sm text-text-secondary">{t.name || t.symbol}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-sm sm:text-base font-semibold text-text-primary font-mono mb-0.5">
                      {formatCryptoBalance(t.balance)}
                    </p>
                    <div className="flex items-center justify-end gap-1.5 sm:gap-2">
                      {(t.usdValue ?? 0) > 0 && (
                        <span className="text-xs sm:text-sm text-text-secondary">{formatUSD(t.usdValue ?? 0)}</span>
                      )}
                      {(t.usdValue ?? 0) > 0 && t.change24h !== undefined && t.change24h !== 0 && (
                        <div className={`flex items-center gap-0.5 sm:gap-1 px-1 sm:px-1.5 py-0.5 rounded-md ${t.change24h >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                          {t.change24h >= 0
                            ? <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-green-500" />
                            : <TrendingDown className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-red-500" />
                          }
                          <span className={`text-2xs sm:text-xs font-medium ${t.change24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {t.change24h >= 0 ? '+' : ''}{t.change24h.toFixed(2)}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface WalletGroupData {
  groupName?: string
  walletsCreated?: number
  walletsDeleted?: number
}

export function WalletGroupCard({ data, action }: { data: Record<string, unknown>; action: 'created' | 'deleted' }) {
  const d = data as WalletGroupData
  return (
    <CardShell
      icon={action === 'created' ? Plus : Trash2}
      title={action === 'created' ? `Group Created — ${d.groupName}` : `Group Deleted — ${d.groupName}`}
    >
      <StatCell label="Wallets" value={String(d.walletsCreated ?? d.walletsDeleted ?? 0)} />
    </CardShell>
  )
}

interface RenameData {
  oldName?: string
  newName?: string
}

export function RenameCard({ data, type }: { data: Record<string, unknown>; type: 'wallet' | 'group' }) {
  const { iconAccent } = useCardTheme()
  const d = data as RenameData

  return (
    <CardShell icon={Pencil} title={`Renamed ${type === 'wallet' ? 'Wallet' : 'Group'}`}>
      <div className="flex items-center gap-2 sm:gap-3">
        <span className="text-xs sm:text-base text-text-tertiary line-through">{d.oldName}</span>
        <ArrowRightLeft className={`w-3 h-3 sm:w-4 sm:h-4 ${iconAccent}`} />
        <span className="text-xs sm:text-base text-text-primary font-medium">{d.newName}</span>
      </div>
    </CardShell>
  )
}
