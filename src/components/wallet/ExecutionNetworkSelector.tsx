import { ChevronDown, Zap } from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useWalletStore } from '../../store/walletStore'
import { ALL_NETWORKS } from '../../utils/networks'
import { useTheme } from '../../hooks/useTheme'

export function ExecutionNetworkSelector() {
  const { activeNetwork, setActiveNetwork, activeWalletId, wallets } = useWalletStore()
  const activeWallet = wallets.find((w) => w.id === activeWalletId)
  const { theme } = useTheme()

  // Categorize networks based on active wallet type
  const supportedNetworks = activeWallet
    ? ALL_NETWORKS.filter((n) => n.type === activeWallet.type)
    : ALL_NETWORKS

  const unsupportedNetworks = activeWallet
    ? ALL_NETWORKS.filter((n) => n.type !== activeWallet.type)
    : []

  return (
    <div className="w-full">
      <label className={`text-xs font-medium ${theme.styles.textSecondary} mb-1 block`}>
        Execute Transactions On
      </label>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors bg-surface-elevated ${theme.styles.listItemHover}`}
          >
            <div className="flex items-center gap-2">
              <Zap className={`w-4 h-4 ${theme.styles.iconSecondary}`} />
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
                  Available Networks
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
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          network.id === activeNetwork.id ? 'bg-green-500' : 'bg-gray-400'
                        }`}
                      />
                      <span className={network.id === activeNetwork.id ? 'font-medium' : ''}>
                        {network.name}
                      </span>
                    </div>
                    {network.id === activeNetwork.id && (
                      <Zap className="w-3 h-3 text-accent ml-auto" />
                    )}
                  </DropdownMenu.Item>
                ))}
              </>
            )}

            {/* Unsupported Networks - Show as disabled */}
            {unsupportedNetworks.length > 0 && (
              <>
                {supportedNetworks.length > 0 && (
                  <DropdownMenu.Separator className={theme.styles.dropdown.separator} />
                )}
                <div className={`px-3 py-1.5 text-xs font-medium ${theme.styles.textTertiary}`}>
                  Incompatible Networks
                </div>
                {unsupportedNetworks.map((network) => (
                  <DropdownMenu.Item
                    key={network.id}
                    disabled
                    className={`${theme.styles.dropdown.item} opacity-50 cursor-not-allowed`}
                    onSelect={(e) => e.preventDefault()}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full" />
                      <span className="text-text-tertiary">{network.name}</span>
                    </div>
                    <span className="text-xs text-text-tertiary ml-auto">{network.type}</span>
                  </DropdownMenu.Item>
                ))}
              </>
            )}

            {/* Info message when no wallet selected */}
            {!activeWallet && (
              <>
                <DropdownMenu.Separator className={theme.styles.dropdown.separator} />
                <div className={`px-3 py-2 text-xs ${theme.styles.textTertiary} text-center`}>
                  Select a wallet to see compatible networks
                </div>
              </>
            )}

            {/* Network info footer */}
            <DropdownMenu.Separator className={theme.styles.dropdown.separator} />
            <div className={`px-3 py-2 text-xs ${theme.styles.textTertiary}`}>
              <div className="flex items-center justify-between">
                <span>Chain ID:</span>
                <span className="font-mono">{activeNetwork.chainId}</span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span>Symbol:</span>
                <span className="font-medium">{activeNetwork.symbol}</span>
              </div>
            </div>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  )
}
