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
        <button className="w-full flex items-center justify-between px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {activeNetwork.name}
            </span>
          </div>
          <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="min-w-[200px] bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-800 p-1"
          sideOffset={5}
          align="start"
        >
          {availableNetworks.map((network) => (
            <DropdownMenu.Item
              key={network.id}
              onClick={() => setActiveNetwork(network)}
              className={`flex items-center gap-2 px-3 py-2 text-sm rounded cursor-pointer transition-colors ${
                network.id === activeNetwork.id
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
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