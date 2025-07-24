import { ChevronDown } from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useWalletStore } from '../../store/walletStore'
import { ALL_NETWORKS } from '../../utils/networks'
import { useTheme } from '../../hooks/useTheme'

export function NetworkSelector() {
  const { activeNetwork, setActiveNetwork, activeWalletId, wallets } = useWalletStore()
  const activeWallet = wallets.find((w) => w.id === activeWalletId)
  const { theme } = useTheme()
  
  // Categorize networks based on active wallet type
  const supportedNetworks = activeWallet
    ? ALL_NETWORKS.filter(n => n.type === activeWallet.type)
    : ALL_NETWORKS
    
  const unsupportedNetworks = activeWallet
    ? ALL_NETWORKS.filter(n => n.type !== activeWallet.type)
    : []

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
          {/* Supported Networks */}
          {supportedNetworks.length > 0 && (
            <>
              <div className={`px-3 py-1.5 text-xs font-medium ${theme.styles.textTertiary}`}>
                Supported
              </div>
              {supportedNetworks.map((network) => (
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
            </>
          )}
          
          {/* Unsupported Networks */}
          {unsupportedNetworks.length > 0 && (
            <>
              {supportedNetworks.length > 0 && (
                <DropdownMenu.Separator className={theme.styles.dropdown.separator} />
              )}
              <div className={`px-3 py-1.5 text-xs font-medium ${theme.styles.textTertiary}`}>
                Unsupported
              </div>
              {unsupportedNetworks.map((network) => (
                <DropdownMenu.Item
                  key={network.id}
                  disabled
                  className={`${theme.styles.dropdown.item} opacity-50 cursor-not-allowed`}
                  onSelect={(e) => e.preventDefault()}
                >
                  <div className="w-2 h-2 bg-gray-400 rounded-full" />
                  <span className="text-text-tertiary">
                    {network.name}
                  </span>
                </DropdownMenu.Item>
              ))}
            </>
          )}
          
          {/* Show all networks if no wallet is selected */}
          {!activeWallet && (
            <>
              <div className={`px-3 py-1.5 text-xs ${theme.styles.textTertiary}`}>
                Select a wallet to see supported networks
              </div>
            </>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}