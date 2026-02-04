import { useState, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, AlertCircle } from 'lucide-react'
import { Network } from '../../types'
import { useTheme } from '../../hooks/useTheme'

interface NetworkManagementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  network?: Network & { isCustom?: boolean }
  onSave: (network: Omit<Network, 'id'>) => Promise<void>
  onUpdate?: (id: string, network: Partial<Network>) => Promise<void>
}

export function NetworkManagementDialog({
  open,
  onOpenChange,
  network,
  onSave,
  onUpdate
}: NetworkManagementDialogProps) {
  const { theme: themeConfig } = useTheme()
  const [formData, setFormData] = useState({
    name: '',
    chainId: '',
    rpcUrl: '',
    alchemyRpcUrl: '',
    symbol: '',
    explorer: '',
    explorerUrl: '',
    type: 'EVM' as 'EVM' | 'SVM',
    nativeCurrency: {
      name: '',
      symbol: '',
      decimals: 18
    }
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (network) {
      setFormData({
        name: network.name,
        chainId: network.chainId.toString(),
        rpcUrl: network.rpcUrl,
        alchemyRpcUrl: network.alchemyRpcUrl || '',
        symbol: network.symbol,
        explorer: network.explorer,
        explorerUrl: network.explorerUrl,
        type: network.type,
        nativeCurrency: {
          name: network.nativeCurrency.name,
          symbol: network.nativeCurrency.symbol,
          decimals: network.nativeCurrency.decimals
        }
      })
    } else {
      // Reset form for new network
      setFormData({
        name: '',
        chainId: '',
        rpcUrl: '',
        alchemyRpcUrl: '',
        symbol: '',
        explorer: '',
        explorerUrl: '',
        type: 'EVM',
        nativeCurrency: {
          name: '',
          symbol: '',
          decimals: 18
        }
      })
    }
    setError('')
  }, [network])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validate required fields
    if (!formData.name || !formData.chainId || !formData.rpcUrl || !formData.symbol) {
      setError('Name, Chain ID, RPC URL, and Symbol are required')
      return
    }

    setSaving(true)
    try {
      const networkData: Omit<Network, 'id'> = {
        name: formData.name,
        chainId: formData.type === 'EVM' ? parseInt(formData.chainId) : formData.chainId,
        rpcUrl: formData.rpcUrl,
        alchemyRpcUrl: formData.alchemyRpcUrl || undefined,
        symbol: formData.symbol,
        explorer: formData.explorer || formData.explorerUrl,
        explorerUrl: formData.explorerUrl || formData.explorer,
        type: formData.type,
        nativeCurrency: {
          name: formData.nativeCurrency.name || formData.name,
          symbol: formData.nativeCurrency.symbol || formData.symbol,
          decimals: formData.type === 'EVM' ? 18 : 9
        }
      }

      if (network && onUpdate) {
        await onUpdate(network.id, networkData)
      } else {
        await onSave(networkData)
      }

      onOpenChange(false)
    } catch (err: any) {
      setError(err.message || 'Failed to save network')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content bg-surface-base rounded-none sm:rounded-xl shadow-2xl border-0 sm:border border-border-subtle w-full h-full sm:w-[95vw] sm:max-w-[600px] sm:h-auto sm:max-h-[90vh] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between p-6 border-b border-border-subtle">
            <Dialog.Title className="text-xl font-semibold text-text-primary">
              {network ? 'Edit Network' : 'Add Custom Network'}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="p-2 rounded-lg hover:bg-surface-hover transition-colors">
                <X className="w-5 h-5 text-text-secondary" />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-accent/10 border border-accent/30 rounded-lg">
                <AlertCircle className="w-4 h-4 text-accent flex-shrink-0" />
                <p className="text-sm text-accent-400">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Network Name <span className="text-accent">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Ethereum Mainnet"
                  className={themeConfig.styles.input}
                  disabled={network && !network.isCustom}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Type <span className="text-accent">*</span>
                </label>
                <select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      type: e.target.value as 'EVM' | 'SVM',
                      nativeCurrency: {
                        ...formData.nativeCurrency,
                        decimals: e.target.value === 'EVM' ? 18 : 9,
                      },
                    })
                  }
                  className={themeConfig.styles.input}
                  disabled={network && !network.isCustom}
                >
                  <option value="EVM">EVM Compatible</option>
                  <option value="SVM">Solana (SVM)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Chain ID <span className="text-accent">*</span>
                </label>
                <input
                  type={formData.type === 'EVM' ? 'number' : 'text'}
                  value={formData.chainId}
                  onChange={(e) => setFormData({ ...formData, chainId: e.target.value })}
                  placeholder={formData.type === 'EVM' ? 'e.g. 1' : 'e.g. mainnet-beta'}
                  className={themeConfig.styles.input}
                  disabled={network && !network.isCustom}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Native Token Symbol <span className="text-accent">*</span>
                </label>
                <input
                  type="text"
                  value={formData.symbol}
                  onChange={(e) =>
                    setFormData({ ...formData, symbol: e.target.value.toUpperCase() })
                  }
                  placeholder="e.g. ETH"
                  className={themeConfig.styles.input}
                  disabled={network && !network.isCustom}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                RPC URL <span className="text-accent">*</span>
              </label>
              <input
                type="url"
                value={formData.rpcUrl}
                onChange={(e) => setFormData({ ...formData, rpcUrl: e.target.value })}
                placeholder="https://..."
                className={themeConfig.styles.input}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Alchemy RPC URL (Optional)
              </label>
              <input
                type="url"
                value={formData.alchemyRpcUrl}
                onChange={(e) => setFormData({ ...formData, alchemyRpcUrl: e.target.value })}
                placeholder="https://..."
                className={themeConfig.styles.input}
              />
              <p className="mt-1 text-xs text-text-tertiary">
                If you have an Alchemy RPC URL for this network, it will be used for token discovery
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Block Explorer URL
              </label>
              <input
                type="url"
                value={formData.explorerUrl}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    explorerUrl: e.target.value,
                    explorer: e.target.value,
                  })
                }
                placeholder="https://..."
                className={themeConfig.styles.input}
              />
            </div>

            <div className="pt-4 border-t border-border-subtle">
              <h4 className="text-sm font-medium text-text-primary mb-3">
                Native Currency Details
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Currency Name
                  </label>
                  <input
                    type="text"
                    value={formData.nativeCurrency.name}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        nativeCurrency: { ...formData.nativeCurrency, name: e.target.value },
                      })
                    }
                    placeholder="e.g. Ethereum"
                    className={themeConfig.styles.input}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Decimals
                  </label>
                  <input
                    type="number"
                    value={formData.nativeCurrency.decimals}
                    readOnly
                    className={`${themeConfig.styles.input} opacity-50 cursor-not-allowed`}
                  />
                </div>
              </div>
            </div>
          </form>

          <div className="flex justify-end gap-3 p-6 border-t border-border-subtle">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className={themeConfig.styles.buttonSecondary}
              style={themeConfig.dynamicStyles.buttonSecondary}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className={`${themeConfig.styles.buttonPrimary} disabled:opacity-50 disabled:cursor-not-allowed`}
              style={themeConfig.dynamicStyles.buttonPrimary}
            >
              {saving ? 'Saving...' : network ? 'Update Network' : 'Add Network'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}