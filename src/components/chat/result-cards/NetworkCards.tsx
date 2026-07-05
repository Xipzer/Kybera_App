/**
 * Code by Xipzer
 *
 * Network-related result cards: NetworkListCard, SwitchCard.
 */

import { Network, Wallet } from 'lucide-react'
import { NetworkIcon } from '../../NetworkIcons'
import { useCardTheme, CardShell, AddressChip } from './shared'

export function NetworkListCard({ data }: { data: any }) {
  const { card } = useCardTheme()

  return (
    <CardShell icon={Network} title={`${(data.evm?.length || 0) + (data.svm?.length || 0)} Networks Available`}>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {[...(data.evm || []), ...(data.svm || [])].map((n: any) => (
          <div key={n.id} className={`flex items-center gap-1.5 sm:gap-2 px-2 py-1.5 sm:px-3 sm:py-2 rounded-xl ${card.innerBg} border ${card.innerBorder}`}>
            <NetworkIcon networkId={n.id} size={16} className="flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-xs sm:text-base text-text-primary font-medium truncate">{n.name}</div>
              <div className="text-2xs sm:text-xs text-text-tertiary">{n.symbol}</div>
            </div>
          </div>
        ))}
      </div>
    </CardShell>
  )
}

export function SwitchCard({ data, type }: { data: any; type: 'wallet' | 'network' }) {
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
