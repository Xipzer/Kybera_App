import { ChevronDown } from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useWalletStore } from '../../store/walletStore'
import { ALL_NETWORKS, getNetworksByType } from '../../utils/networks'
import { useTheme } from '../../hooks/useTheme'

export function NetworkSelector() {
  const { activeNetwork, setActiveNetwork, activeWalletId, wallets } = useWalletStore()
  const activeWallet = wallets.find((w) => w.id === activeWalletId)
  const { theme } = useTheme()
  
  // Filter networks based on active wallet type
  const availableNetworks = activeWallet
    ? getNetworksByType(activeWallet.type)
    : ALL_NETWORKS

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors bg-surface-elevated ${theme.styles.listItemHover}`}>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span className={`text-sm font-medium ${theme.styles.textPrimary}`}>
              {activeNetwork.name}
            </span>
          </div>
          <ChevronDown className={`w-4 h-4 ${theme.styles.iconSecondary}`} />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className={theme.styles.dropdown.content}
          sideOffset={5}
          align="start"
        >
          {availableNetworks.map((network) => (
            <DropdownMenu.Item
              key={network.id}
              onClick={() => setActiveNetwork(network)}
              className={`${theme.styles.dropdown.item} ${
                network.id === activeNetwork.id
                  ? 'bg-accent/10 text-accent'
                  : theme.styles.dropdown.itemHover
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