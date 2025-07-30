import React, { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, Plus, AlertCircle } from 'lucide-react'
import { Network } from '../../types'
import { db } from '../../services/storage/database'
import { JsonRpcProvider, Contract, isAddress } from 'ethers'
import { useTheme } from '../../hooks/useTheme'

interface AddTokenDialogProps {
  isOpen: boolean
  onClose: () => void
  walletAddress: string
  network: Network
  onTokenAdded: () => void
}

export function AddTokenDialog({ isOpen, onClose, walletAddress, network, onTokenAdded }: AddTokenDialogProps) {
  const { theme } = useTheme()
  const [tokenAddress, setTokenAddress] = useState('')
  const [tokenSymbol, setTokenSymbol] = useState('')
  const [tokenName, setTokenName] = useState('')
  const [tokenDecimals, setTokenDecimals] = useState('18')
  const [logoURI, setLogoURI] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [autoDetecting, setAutoDetecting] = useState(false)

  const handleAddressChange = async (address: string) => {
    setTokenAddress(address)
    setError('')

    // Auto-detect token info for EVM chains
    if (network.type === 'EVM' && isAddress(address)) {
      setAutoDetecting(true)
      try {
        const provider = new JsonRpcProvider(network.rpcUrl)
        const erc20Abi = [
          'function symbol() view returns (string)',
          'function name() view returns (string)',
          'function decimals() view returns (uint8)'
        ]
        
        const contract = new Contract(address, erc20Abi, provider)
        
        const [symbol, name, decimals] = await Promise.all([
          contract.symbol(),
          contract.name(),
          contract.decimals()
        ])
        
        setTokenSymbol(symbol)
        setTokenName(name)
        setTokenDecimals(decimals.toString())
      } catch (err) {
        console.error('Failed to auto-detect token info:', err)
      } finally {
        setAutoDetecting(false)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      // Validate inputs
      if (network.type === 'EVM' && !isAddress(tokenAddress)) {
        throw new Error('Invalid token address')
      }
      
      if (network.type === 'SVM') {
        // Validate Solana address
        const { PublicKey } = await import('@solana/web3.js')
        try {
          new PublicKey(tokenAddress)
        } catch {
          throw new Error('Invalid Solana token address')
        }
      }

      if (!tokenSymbol || !tokenName) {
        throw new Error('Token symbol and name are required')
      }

      const decimals = parseInt(tokenDecimals)
      if (isNaN(decimals) || decimals < 0 || decimals > 18) {
        throw new Error('Invalid decimals (must be 0-18)')
      }

      // Add token to the database
      await db.discoveredTokens.put({
        id: `${walletAddress}_${network.chainId}_${tokenAddress.toLowerCase()}`,
        walletAddress,
        chainId: network.chainId.toString(),
        tokenAddress: tokenAddress.toLowerCase(),
        symbol: tokenSymbol,
        name: tokenName,
        decimals: decimals,
        logoURI: logoURI || undefined,
        tags: ['custom'],
        addedManually: true,
        discoveredAt: Date.now(),
        lastSeen: Date.now()
      })

      // Notify parent
      onTokenAdded()
      
      // Reset form
      setTokenAddress('')
      setTokenSymbol('')
      setTokenName('')
      setTokenDecimals('18')
      setLogoURI('')
      
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to add token')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setTokenAddress('')
    setTokenSymbol('')
    setTokenName('')
    setTokenDecimals('18')
    setLogoURI('')
    setError('')
    onClose()
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className={`dialog-content w-[500px] max-h-[85vh] overflow-y-auto ${theme.styles.dialogContainer}`}>
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <Dialog.Title className={theme.styles.heading}>
                Add Custom Token
              </Dialog.Title>
              <Dialog.Close asChild>
                <button
                  onClick={handleClose}
                  className={theme.styles.buttonIcon}
                >
                  <X className={`w-5 h-5 ${theme.styles.iconSecondary}`} />
                </button>
              </Dialog.Close>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className={theme.styles.label}>
                    Token Address
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={tokenAddress}
                      onChange={(e) => handleAddressChange(e.target.value)}
                      placeholder={network.type === 'EVM' ? '0x...' : 'Token mint address'}
                      className={theme.styles.input}
                      required
                    />
                    {autoDetecting && (
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                        <div className="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className={theme.styles.label}>
                    Token Symbol
                  </label>
                  <input
                    type="text"
                    value={tokenSymbol}
                    onChange={(e) => setTokenSymbol(e.target.value)}
                    placeholder="e.g., USDC"
                    className={theme.styles.input}
                    required
                    disabled={autoDetecting}
                  />
                </div>

                <div>
                  <label className={theme.styles.label}>
                    Token Name
                  </label>
                  <input
                    type="text"
                    value={tokenName}
                    onChange={(e) => setTokenName(e.target.value)}
                    placeholder="e.g., USD Coin"
                    className={theme.styles.input}
                    required
                    disabled={autoDetecting}
                  />
                </div>

                <div>
                  <label className={theme.styles.label}>
                    Decimals
                  </label>
                  <input
                    type="number"
                    value={tokenDecimals}
                    onChange={(e) => setTokenDecimals(e.target.value)}
                    placeholder="18"
                    min="0"
                    max="18"
                    className={theme.styles.input}
                    required
                    disabled={autoDetecting}
                  />
                </div>

                <div>
                  <label className={theme.styles.label}>
                    Logo URL (optional)
                  </label>
                  <input
                    type="url"
                    value={logoURI}
                    onChange={(e) => setLogoURI(e.target.value)}
                    placeholder="https://..."
                    className={theme.styles.input}
                  />
                </div>
              </div>

              {error && (
                <div className={theme.styles.error.container}>
                  <AlertCircle className={theme.styles.error.icon} />
                  <p className={theme.styles.error.text}>{error}</p>
                </div>
              )}

              <div className="mt-6">
                <button
                  type="submit"
                  disabled={isLoading || autoDetecting}
                  className={`w-full flex items-center justify-center gap-2 ${theme.styles.buttonPrimary} disabled:opacity-50 disabled:cursor-not-allowed`}
                  style={theme.dynamicStyles.buttonPrimary}
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Add Token
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}