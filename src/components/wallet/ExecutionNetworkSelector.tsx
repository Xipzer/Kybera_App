/**
 * Code by Xipzer
 */

import { ChevronDown, Zap } from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useWalletStore } from '../../store/walletStore'
import { ALL_NETWORKS } from '../../utils/networks'
import { useTheme } from '../../hooks/useTheme'
import { NetworkIcon } from '../NetworkIcons'

export function ExecutionNetworkSelector({ collapsed = false }: { collapsed?: boolean }) {
  const { activeNetwork, setActiveNetwork, activeWalletId, wallets } = useWalletStore()
  const activeWallet = wallets.find((w) => w.id === activeWalletId)
  const { theme } = useTheme()

  const supportedNetworks = activeWallet
    ? ALL_NETWORKS.filter((n) => n.type === activeWallet.type)
    : ALL_NETWORKS

  const unsupportedNetworks = activeWallet
    ? ALL_NETWORKS.filter((n) => n.type !== activeWallet.type)
    : []

  if (collapsed) {
    return (
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            className="p-2 rounded-xl hover:bg-white/10 transition-colors group"
            title={`Execute on: ${activeNetwork.name}`}
          >
            <NetworkIcon
              networkId={activeNetwork.id}
              size={16}
              className="flex-shrink-0 opacity-80 group-hover:opacity-100 transition-opacity"
            />
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            className={`${theme.styles.dropdown.content} w-auto min-w-[200px] max-h-[60vh] overflow-y-auto z-[9999]`}
            sideOffset={8}
            align="start"
            side="left"
            avoidCollisions={true}
            collisionPadding={16}
          >
            {supportedNetworks.length > 0 && (
              <>
                <div className={`px-2.5 py-1 text-xs font-medium ${theme.styles.textTertiary}`}>
                  Execute On
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
                      <NetworkIcon networkId={network.id} size={16} className="flex-shrink-0" />
                      <span
                        className={`text-xs ${network.id === activeNetwork.id ? 'font-medium' : ''}`}
                      >
                        {network.name}
                      </span>
                    </div>
                    {network.id === activeNetwork.id && (
                      <Zap className="w-3 h-3 text-accent ml-auto flex-shrink-0" />
                    )}
                  </DropdownMenu.Item>
                ))}
              </>
            )}

            {unsupportedNetworks.length > 0 && (
              <>
                {supportedNetworks.length > 0 && (
                  <DropdownMenu.Separator className={theme.styles.dropdown.separator} />
                )}
                <div className={`px-2.5 py-1 text-xs font-medium ${theme.styles.textTertiary}`}>
                  Incompatible
                </div>
                {unsupportedNetworks.map((network) => (
                  <DropdownMenu.Item
                    key={network.id}
                    disabled
                    className={`${theme.styles.dropdown.item} opacity-50 cursor-not-allowed`}
                    onSelect={(e) => e.preventDefault()}
                  >
                    <div className="flex items-center gap-2">
                      <NetworkIcon
                        networkId={network.id}
                        size={16}
                        className="flex-shrink-0 opacity-50"
                      />
                      <span className="text-xs text-text-tertiary">{network.name}</span>
                    </div>
                  </DropdownMenu.Item>
                ))}
              </>
            )}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    )
  }

  return (
    <div className="w-full">
      <label className={`text-xs font-medium ${theme.styles.textSecondary} mb-1 block`}>
        Execute Transactions On
      </label>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors bg-surface-elevated ${theme.styles.listItemHover}`}
          >
            <div className="flex items-center gap-2">
              <NetworkIcon networkId={activeNetwork.id} size={18} className="flex-shrink-0" />
              <span className={`text-sm font-medium ${theme.styles.textPrimary}`}>
                {activeNetwork.name}
              </span>
            </div>
            <ChevronDown className={`w-4 h-4 ${theme.styles.iconSecondary}`} />
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            className={`${theme.styles.dropdown.content} w-[calc(100vw-32px)] sm:w-auto min-w-[200px] max-h-[60vh] overflow-y-auto z-[9999]`}
            sideOffset={5}
            align="start"
            side="bottom"
            avoidCollisions={true}
            collisionPadding={16}
          >
            {supportedNetworks.length > 0 && (
              <>
                <div className={`px-2.5 py-1 text-xs font-medium ${theme.styles.textTertiary}`}>
                  Available
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
                      <NetworkIcon networkId={network.id} size={16} className="flex-shrink-0" />
                      <span
                        className={`text-xs ${network.id === activeNetwork.id ? 'font-medium' : ''}`}
                      >
                        {network.name}
                      </span>
                    </div>
                    {network.id === activeNetwork.id && (
                      <Zap className="w-3 h-3 text-accent ml-auto flex-shrink-0" />
                    )}
                  </DropdownMenu.Item>
                ))}
              </>
            )}

            {unsupportedNetworks.length > 0 && (
              <>
                {supportedNetworks.length > 0 && (
                  <DropdownMenu.Separator className={theme.styles.dropdown.separator} />
                )}
                <div className={`px-2.5 py-1 text-xs font-medium ${theme.styles.textTertiary}`}>
                  Incompatible
                </div>
                {unsupportedNetworks.map((network) => (
                  <DropdownMenu.Item
                    key={network.id}
                    disabled
                    className={`${theme.styles.dropdown.item} opacity-50 cursor-not-allowed`}
                    onSelect={(e) => e.preventDefault()}
                  >
                    <div className="flex items-center gap-2">
                      <NetworkIcon
                        networkId={network.id}
                        size={16}
                        className="flex-shrink-0 opacity-50"
                      />
                      <span className="text-xs text-text-tertiary">{network.name}</span>
                    </div>
                    <span className="text-xs text-text-tertiary ml-auto">{network.type}</span>
                  </DropdownMenu.Item>
                ))}
              </>
            )}

            {!activeWallet && (
              <>
                <DropdownMenu.Separator className={theme.styles.dropdown.separator} />
                <div className={`px-3 py-2 text-xs ${theme.styles.textTertiary} text-center`}>
                  Select a wallet to see compatible networks
                </div>
              </>
            )}

            <DropdownMenu.Separator className={theme.styles.dropdown.separator} />
            <div className={`px-2.5 py-1.5 text-xs ${theme.styles.textTertiary}`}>
              <div className="flex items-center justify-between">
                <span>Chain:</span>
                <span className="font-mono">{activeNetwork.chainId}</span>
              </div>
              <div className="flex items-center justify-between mt-0.5">
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