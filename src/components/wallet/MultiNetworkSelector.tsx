/**
 * Code by Xipzer
 */

import { useEffect, useState } from 'react'
import { Check, ChevronDown, Filter } from 'lucide-react'
import * as Popover from '@radix-ui/react-popover'
import { useWalletStore } from '../../store/walletStore'
import { ALL_NETWORKS, Network } from '../../utils/networks'
import { useTheme } from '../../hooks/useTheme'
import { ChainType } from '../../types'
import { NetworkIcon } from '../NetworkIcons'

export function MultiNetworkSelector({ collapsed = false }: { collapsed?: boolean }) {
  const { activeWalletId, wallets, viewNetworks, setViewNetworks } = useWalletStore()
  const activeWallet = wallets.find((w) => w.id === activeWalletId)
  const { theme } = useTheme()
  const [open, setOpen] = useState(false)

  const availableNetworks = activeWallet
    ? ALL_NETWORKS.filter((n) => n.type === activeWallet.type)
    : ALL_NETWORKS

  const networksByType = availableNetworks.reduce(
    (acc, network) => {
      if (!acc[network.type]) {
        acc[network.type] = []
      }
      acc[network.type].push(network)
      return acc
    },
    {} as Record<ChainType, Network[]>,
  )

  useEffect(() => {
    if ((!viewNetworks || viewNetworks.length === 0) && activeWallet) {
      setViewNetworks(availableNetworks.map((n) => n.id))
    }
  }, [activeWallet?.id])

  const handleNetworkToggle = (networkId: string) => {
    const currentNetworks = viewNetworks || []
    if (currentNetworks.includes(networkId)) {
      if (currentNetworks.length > 1) {
        setViewNetworks(currentNetworks.filter((id) => id !== networkId))
      }
    } else {
      setViewNetworks([...currentNetworks, networkId])
    }
  }

  const handleSelectAll = () => {
    setViewNetworks(availableNetworks.map((n) => n.id))
  }

  const handleClearAll = () => {
    setViewNetworks([availableNetworks[0].id])
  }

  const selectedCount = viewNetworks?.length || 0
  const totalCount = availableNetworks.length

  const getButtonText = () => {
    if (!viewNetworks || viewNetworks.length === 0) {
      return 'Select Networks'
    }
    if (viewNetworks.length === 1) {
      const network = availableNetworks.find((n) => n.id === viewNetworks[0])
      return network?.name || 'Unknown'
    }
    if (viewNetworks.length === totalCount) {
      return `All Networks (${totalCount})`
    }
    return `${viewNetworks.length} Networks`
  }

  if (collapsed) {
    return (
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button
            className="p-2 rounded-xl hover:bg-white/10 transition-colors group"
            title={`View: ${getButtonText()}`}
          >
            <Filter className="w-4 h-4 text-text-secondary group-hover:text-text-primary transition-colors" />
          </button>
        </Popover.Trigger>

        <Popover.Portal>
          <Popover.Content
            className={`${theme.styles.dropdown.content} w-[250px] max-h-[400px] overflow-hidden flex flex-col z-[9999]`}
            sideOffset={8}
            align="start"
            side="left"
            avoidCollisions={true}
            collisionPadding={16}
          >
            <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-border-subtle">
              <span className={`text-xs font-medium ${theme.styles.textSecondary}`}>
                View: {selectedCount}/{totalCount}
              </span>
              <div className="flex gap-1.5">
                <button
                  onClick={handleSelectAll}
                  className={`text-xs px-1.5 py-0.5 rounded ${theme.styles.textSecondary} hover:text-accent transition-colors`}
                >
                  All
                </button>
                <span className={`text-xs ${theme.styles.textTertiary}`}>•</span>
                <button
                  onClick={handleClearAll}
                  className={`text-xs px-1.5 py-0.5 rounded ${theme.styles.textSecondary} hover:text-accent transition-colors`}
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto py-1">
              {Object.entries(networksByType).map(([type, networks]) => (
                <div key={type}>
                  {Object.keys(networksByType).length > 1 && (
                    <div
                      className={`px-2.5 py-1 text-xs font-medium ${theme.styles.textTertiary} sticky top-0 bg-surface-base`}
                    >
                      {type === 'EVM' ? 'EVM' : 'Solana'}
                    </div>
                  )}
                  {networks.map((network) => {
                    const isSelected = viewNetworks?.includes(network.id) || false
                    const isOnlySelected =
                      viewNetworks?.length === 1 && viewNetworks[0] === network.id

                    return (
                      <button
                        key={network.id}
                        onClick={() => handleNetworkToggle(network.id)}
                        disabled={isOnlySelected}
                        className={`w-full ${theme.styles.dropdown.item} ${
                          isSelected ? 'bg-accent/10' : theme.styles.dropdown.itemHover
                        } ${isOnlySelected ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-2">
                            <NetworkIcon
                              networkId={network.id}
                              size={16}
                              className={`flex-shrink-0 ${!isSelected ? 'opacity-50' : ''}`}
                            />
                            <span
                              className={`text-xs ${
                                isSelected ? 'text-accent font-medium' : theme.styles.textPrimary
                              }`}
                            >
                              {network.name}
                            </span>
                          </div>
                          {isSelected && <Check className="w-3 h-3 text-accent flex-shrink-0" />}
                        </div>
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    )
  }

  return (
    <div className="w-full">
      <label className={`text-xs font-medium ${theme.styles.textSecondary} mb-1 block`}>
        View Data From
      </label>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors bg-surface-elevated ${theme.styles.listItemHover}`}
          >
            <div className="flex items-center gap-2">
              <Filter className={`w-4 h-4 ${theme.styles.iconSecondary}`} />
              <span className={`text-sm font-medium ${theme.styles.textPrimary}`}>
                {getButtonText()}
              </span>
            </div>
            <ChevronDown
              className={`w-4 h-4 ${theme.styles.iconSecondary} transition-transform ${open ? 'rotate-180' : ''}`}
            />
          </button>
        </Popover.Trigger>

        <Popover.Portal>
          <Popover.Content
            className={`${theme.styles.dropdown.content} w-[calc(100vw-32px)] sm:w-[300px] max-h-[400px] overflow-hidden flex flex-col z-[9999]`}
            sideOffset={5}
            align="start"
            side="bottom"
            avoidCollisions={true}
            collisionPadding={16}
          >
            <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-border-subtle">
              <span className={`text-xs font-medium ${theme.styles.textSecondary}`}>
                {selectedCount}/{totalCount}
              </span>
              <div className="flex gap-1.5">
                <button
                  onClick={handleSelectAll}
                  className={`text-xs px-1.5 py-0.5 rounded ${theme.styles.textSecondary} hover:text-accent transition-colors`}
                >
                  All
                </button>
                <span className={`text-xs ${theme.styles.textTertiary}`}>•</span>
                <button
                  onClick={handleClearAll}
                  className={`text-xs px-1.5 py-0.5 rounded ${theme.styles.textSecondary} hover:text-accent transition-colors`}
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto py-1">
              {Object.entries(networksByType).map(([type, networks]) => (
                <div key={type}>
                  {Object.keys(networksByType).length > 1 && (
                    <div
                      className={`px-2.5 py-1 text-xs font-medium ${theme.styles.textTertiary} sticky top-0 bg-surface-base`}
                    >
                      {type === 'EVM' ? 'EVM' : 'Solana'}
                    </div>
                  )}
                  {networks.map((network) => {
                    const isSelected = viewNetworks?.includes(network.id) || false
                    const isOnlySelected =
                      viewNetworks?.length === 1 && viewNetworks[0] === network.id

                    return (
                      <button
                        key={network.id}
                        onClick={() => handleNetworkToggle(network.id)}
                        disabled={isOnlySelected}
                        className={`w-full ${theme.styles.dropdown.item} ${
                          isSelected ? 'bg-accent/10' : theme.styles.dropdown.itemHover
                        } ${isOnlySelected ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-2">
                            <NetworkIcon
                              networkId={network.id}
                              size={16}
                              className={`flex-shrink-0 ${!isSelected ? 'opacity-50' : ''}`}
                            />
                            <span
                              className={`text-xs ${
                                isSelected ? 'text-accent font-medium' : theme.styles.textPrimary
                              }`}
                            >
                              {network.name}
                            </span>
                          </div>
                          {isSelected && <Check className="w-3 h-3 text-accent flex-shrink-0" />}
                        </div>
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>

            {!activeWallet && (
              <div
                className={`px-3 py-2 text-xs ${theme.styles.textTertiary} border-t border-border-subtle text-center`}
              >
                Select a wallet to filter available networks
              </div>
            )}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  )
}