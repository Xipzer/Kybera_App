import React, { useState } from 'react'
import { X, Plus } from 'lucide-react'
import { Network } from '../../types'
import { db } from '../../services/storage/database'
import { JsonRpcProvider, Contract, isAddress } from 'ethers'

interface AddTokenDialogProps {
  isOpen: boolean
  onClose: () => void
  walletAddress: string
  network: Network
  onTokenAdded: () => void
}

export function AddTokenDialog({ isOpen, onClose, walletAddress, network, onTokenAdded }: AddTokenDialogProps) {
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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Add Custom Token</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Token Address
              </label>
              <input
                type="text"
                value={tokenAddress}
                onChange={(e) => handleAddressChange(e.target.value)}
                placeholder={network.type === 'EVM' ? '0x...' : 'Token mint address'}
                className="w-full px-3 py-2 bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Token Symbol
              </label>
              <input
                type="text"
                value={tokenSymbol}
                onChange={(e) => setTokenSymbol(e.target.value)}
                placeholder="e.g., USDC"
                className="w-full px-3 py-2 bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={autoDetecting}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Token Name
              </label>
              <input
                type="text"
                value={tokenName}
                onChange={(e) => setTokenName(e.target.value)}
                placeholder="e.g., USD Coin"
                className="w-full px-3 py-2 bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={autoDetecting}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Decimals
              </label>
              <input
                type="number"
                value={tokenDecimals}
                onChange={(e) => setTokenDecimals(e.target.value)}
                placeholder="18"
                min="0"
                max="18"
                className="w-full px-3 py-2 bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={autoDetecting}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Logo URL (optional)
              </label>
              <input
                type="url"
                value={logoURI}
                onChange={(e) => setLogoURI(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || autoDetecting}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 rounded-lg transition-colors flex items-center justify-center gap-2"
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
    </div>
  )
}