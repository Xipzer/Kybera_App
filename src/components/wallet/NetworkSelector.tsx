import { ChevronDown } from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useWalletStore } from '../../store/walletStore'
import { ALL_NETWORKS, getNetworksByType } from '../../utils/networks'

export function NetworkSelector() {
  const { activeNetwork, setActiveNetwork, activeWalletId, wallets } = useWalletStore()
  const activeWallet = wallets.find((w) => w.id === activeWalletId)
  
  // Filter networks based on active wallet type
  const availableNetworks = activeWallet
    ? getNetworksByType(activeWallet.type)
    : ALL_NETWORKS

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="w-full flex items-center justify-between px-3 py-2 bg-surface-elevated rounded-lg hover:bg-surface-hover transition-colors">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="text-sm font-medium text-text-primary">
              {activeNetwork.name}
            </span>
          </div>
          <ChevronDown className="w-4 h-4 text-text-secondary" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="min-w-[200px] bg-surface-base rounded-lg shadow-lg border border-border-subtle p-1"
          sideOffset={5}
          align="start"
        >
          {availableNetworks.map((network) => (
            <DropdownMenu.Item
              key={network.id}
              onClick={() => setActiveNetwork(network)}
              className={`flex items-center gap-2 px-3 py-2 text-sm rounded cursor-pointer transition-colors ${
                network.id === activeNetwork.id
                  ? 'bg-accent/10 text-accent'
                  : 'text-text-primary hover:bg-surface-hover'
              }`}
            >
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              {network.name}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}