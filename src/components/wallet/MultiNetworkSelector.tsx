import { useEffect, useState } from 'react'
import { Check, ChevronDown, Filter } from 'lucide-react'
import * as Popover from '@radix-ui/react-popover'
import { useWalletStore } from '../../store/walletStore'
import { ALL_NETWORKS, Network } from '../../utils/networks'
import { useTheme } from '../../hooks/useTheme'
import { ChainType } from '../../types'

export function MultiNetworkSelector() {
  const { activeWalletId, wallets, viewNetworks, setViewNetworks } = useWalletStore()
  const activeWallet = wallets.find((w) => w.id === activeWalletId)
  const { theme } = useTheme()
  const [open, setOpen] = useState(false)

  // Filter networks based on wallet type
  const availableNetworks = activeWallet
    ? ALL_NETWORKS.filter((n) => n.type === activeWallet.type)
    : ALL_NETWORKS

  // Group networks by type for better organization
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

  // Initialize viewNetworks if empty
  useEffect(() => {
    if ((!viewNetworks || viewNetworks.length === 0) && activeWallet) {
      // Set default to all networks of the wallet's type
      setViewNetworks(availableNetworks.map((n) => n.id))
    }
  }, [activeWallet?.id])

  const handleNetworkToggle = (networkId: string) => {
    const currentNetworks = viewNetworks || []
    if (currentNetworks.includes(networkId)) {
      // Don't allow deselecting all networks
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
    // Keep at least one network selected (the first one)
    setViewNetworks([availableNetworks[0].id])
  }

  const selectedCount = viewNetworks?.length || 0
  const totalCount = availableNetworks.length

  // Get display text for button
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

  return (
    <div className="w-full">
      <label className={`text-xs font-medium ${theme.styles.textSecondary} mb-1 block`}>
        View Data From
      </label>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors bg-surface-elevated ${theme.styles.listItemHover}`}
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
            className={`${theme.styles.dropdown.content} w-[300px] max-h-[400px] overflow-hidden flex flex-col`}
            sideOffset={5}
            align="start"
          >
            {/* Header with select all/clear buttons */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-border-subtle">
              <span className={`text-xs font-medium ${theme.styles.textSecondary}`}>
                {selectedCount} of {totalCount} selected
              </span>
              <div className="flex gap-2">
                <button
                  onClick={handleSelectAll}
                  className={`text-xs ${theme.styles.textSecondary} hover:text-accent transition-colors`}
                >
                  Select All
                </button>
                <span className={`text-xs ${theme.styles.textTertiary}`}>•</span>
                <button
                  onClick={handleClearAll}
                  className={`text-xs ${theme.styles.textSecondary} hover:text-accent transition-colors`}
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Network list */}
            <div className="flex-1 overflow-y-auto py-1">
              {Object.entries(networksByType).map(([type, networks]) => (
                <div key={type}>
                  {Object.keys(networksByType).length > 1 && (
                    <div
                      className={`px-3 py-1.5 text-xs font-medium ${theme.styles.textTertiary} sticky top-0 bg-surface-base`}
                    >
                      {type === 'EVM' ? 'EVM Networks' : 'Solana Networks'}
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
                            <div
                              className={`w-2 h-2 rounded-full ${
                                isSelected ? 'bg-green-500' : 'bg-gray-400'
                              }`}
                            />
                            <span
                              className={`text-sm ${
                                isSelected ? 'text-accent font-medium' : theme.styles.textPrimary
                              }`}
                            >
                              {network.name}
                            </span>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-accent" />}
                        </div>
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>

            {/* Footer info */}
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
