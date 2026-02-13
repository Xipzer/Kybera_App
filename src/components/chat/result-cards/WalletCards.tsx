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

export function WalletListCard({ data }: { data: any }) {
  const { card } = useCardTheme()

  return (
    <CardShell icon={Wallet} title={`${data.totalWallets} Wallets in ${data.totalGroups} Groups`}>
      <div className="space-y-3">
        {data.groups?.map((group: any) => (
          <div key={group.groupId}>
            <div className="text-[10px] sm:text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">{group.groupName}</div>
            <div className={`${card.innerBg} border ${card.innerBorder} rounded-xl overflow-hidden`}>
              {group.wallets?.map((w: any, i: number) => (
                <div key={w.id} className={`flex items-center justify-between px-3 py-2 sm:px-4 sm:py-2.5 ${i > 0 ? `border-t ${card.innerBorder}` : ''}`}>
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

export function BalanceCard({ data }: { data: any }) {
  const { card, titleGradient, sendGradient } = useCardTheme()
  const { theme } = useTheme()
  const tokenStyles = theme.styles.tokenList

  return (
    <div className={`${card.bg} border ${card.border} rounded-2xl overflow-hidden`}>
      <div className={`flex items-center justify-between px-3 py-2.5 sm:px-4 sm:py-3 border-b ${card.innerBorder}`}>
        <span className={`text-sm sm:text-lg font-bold bg-gradient-to-r ${titleGradient} bg-clip-text text-transparent`}>
          {data.wallet || 'Wallet'}
        </span>
        {data.walletAddress && <AddressChip address={data.walletAddress} />}
      </div>

      <div className="p-3 sm:p-4 space-y-4">
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className={`relative rounded-xl border ${card.innerBorder} p-3 sm:p-4 text-center overflow-hidden`}>
            <div className={`absolute inset-0 bg-gradient-to-br ${sendGradient} opacity-[0.06]`} />
            <div className="relative">
              <div className="text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wider mb-1 sm:mb-2">Total Value</div>
              <div className="text-base sm:text-xl font-bold text-text-primary font-mono">
                ${Number(data.totalUSD || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {data.native && parseFloat(data.native) > 0 && (
            <div className={`relative rounded-xl border ${card.innerBorder} p-3 sm:p-4 text-center overflow-hidden`}>
              <div className={`absolute inset-0 bg-gradient-to-br ${sendGradient} opacity-[0.04]`} />
              <div className="relative">
                <div className="text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wider mb-1 sm:mb-2">{data.nativeSymbol || 'Native'}</div>
                <div className="text-base sm:text-xl font-bold text-text-primary font-mono">
                  {formatCryptoBalance(data.native)}
                </div>
              </div>
            </div>
          )}

          {data.native && parseFloat(data.native) > 0 && data.nativeUSD > 0 && (
            <div className={`relative rounded-xl border ${card.innerBorder} p-3 sm:p-4 text-center overflow-hidden`}>
              <div className={`absolute inset-0 bg-gradient-to-br ${sendGradient} opacity-[0.04]`} />
              <div className="relative">
                <div className="text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wider mb-1 sm:mb-2">Native USD</div>
                <div className="text-base sm:text-xl font-bold text-text-primary font-mono">
                  {formatUSD(data.nativeUSD)}
                </div>
              </div>
            </div>
          )}
        </div>

        {data.tokens?.length > 0 && (
          <div className="space-y-1.5 sm:space-y-2">
            {data.tokens.map((t: any, i: number) => (
              <div
                key={i}
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
                      {t.usdValue > 0 && (
                        <span className="text-xs sm:text-sm text-text-secondary">{formatUSD(t.usdValue)}</span>
                      )}
                      {t.usdValue > 0 && t.change24h !== undefined && t.change24h !== 0 && (
                        <div className={`flex items-center gap-0.5 sm:gap-1 px-1 sm:px-1.5 py-0.5 rounded-md ${t.change24h >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                          {t.change24h >= 0
                            ? <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-green-500" />
                            : <TrendingDown className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-red-500" />
                          }
                          <span className={`text-[10px] sm:text-xs font-medium ${t.change24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
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

export function WalletGroupCard({ data, action }: { data: any; action: 'created' | 'deleted' }) {
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

export function RenameCard({ data, type }: { data: any; type: 'wallet' | 'group' }) {
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
