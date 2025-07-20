/**
 * Code by Xipzer
 */

import React, { useState } from 'react'
import { AlertCircle, Plus, Coins, Loader2 } from 'lucide-react'
import { Network } from '../../types'
import { db } from '../../services/database'
import { Contract, isAddress } from 'ethers'
import { tokenImageService } from '../../services/tokenImageService'
import { createProvider } from '../../services/blockchain/provider'
import {
  ModernDialog,
  ModernDialogHeader,
  ModernDialogSection,
  ModernDialogActions,
  ModernAlert,
  ModernInput,
  ModernButton,
} from '../ModernDialog'

interface AddTokenDialogProps {
  isOpen: boolean
  onClose: () => void
  walletAddress: string
  network: Network
  onTokenAdded: () => void
}

export function AddTokenDialog({
  isOpen,
  onClose,
  walletAddress,
  network,
  onTokenAdded,
}: AddTokenDialogProps) {
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

    if (network.type === 'EVM' && isAddress(address)) {
      setAutoDetecting(true)
      const chainId = typeof network.chainId === 'number' ? network.chainId : 1
      const provider = createProvider(network.rpcUrl, chainId)
      try {
        const erc20Abi = [
          'function symbol() view returns (string)',
          'function name() view returns (string)',
          'function decimals() view returns (uint8)',
        ]

        const contract = new Contract(address, erc20Abi, provider)

        const [symbol, name, decimals] = await Promise.all([
          contract.symbol(),
          contract.name(),
          contract.decimals(),
        ])

        setTokenSymbol(symbol)
        setTokenName(name)
        setTokenDecimals(decimals.toString())
      } catch (err) {
        console.error('Failed to auto-detect token info:', err)
      } finally {
        setAutoDetecting(false)
        provider.destroy()
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      if (network.type === 'EVM' && !isAddress(tokenAddress)) {
        throw new Error('Invalid token address')
      }

      if (network.type === 'SVM') {
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

      await db.discoveredTokens.put({
        id: `${walletAddress}_${network.chainId}_${tokenAddress.toLowerCase()}`,
        walletAddress,
        chainId: network.chainId as number,
        tokenAddress: tokenAddress.toLowerCase(),
        symbol: tokenSymbol,
        name: tokenName,
        decimals: decimals,
        logoURI: logoURI || undefined,
        addedManually: true,
        discoveredAt: Date.now(),
      })

      if (!logoURI && network.type === 'EVM') {
        tokenImageService
          .getTokenImage({
            address: tokenAddress,
            chainId: network.chainId as number,
            symbol: tokenSymbol,
            name: tokenName,
          })
          .catch((err) => console.error('Failed to fetch token image:', err))
      }

      onTokenAdded()

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
    <ModernDialog open={isOpen} onOpenChange={handleClose} width="md">
      <ModernDialogHeader
        icon={<Coins className="w-5 h-5" />}
        title="Add Custom Token"
        subtitle={network.name}
        onClose={handleClose}
      />

      <form onSubmit={handleSubmit} id="add-token-form">
        <ModernDialogSection className="space-y-4 pb-4">
          <ModernInput
            label="Token Address"
            type="text"
            value={tokenAddress}
            onChange={(e) => handleAddressChange(e.target.value)}
            placeholder={network.type === 'EVM' ? '0x...' : 'Token mint address'}
            required
            rightElement={
              autoDetecting ? <Loader2 className="w-4 h-4 text-accent-500 animate-spin" /> : null
            }
          />

          <ModernInput
            label="Token Symbol"
            type="text"
            value={tokenSymbol}
            onChange={(e) => setTokenSymbol(e.target.value)}
            placeholder="e.g., USDC"
            required
            disabled={autoDetecting}
          />

          <ModernInput
            label="Token Name"
            type="text"
            value={tokenName}
            onChange={(e) => setTokenName(e.target.value)}
            placeholder="e.g., USD Coin"
            required
            disabled={autoDetecting}
          />

          <ModernInput
            label="Decimals"
            type="number"
            value={tokenDecimals}
            onChange={(e) => setTokenDecimals(e.target.value)}
            placeholder="18"
            min={0}
            max={18}
            required
            disabled={autoDetecting}
          />

          <ModernInput
            label="Logo URL (optional)"
            type="url"
            value={logoURI}
            onChange={(e) => setLogoURI(e.target.value)}
            placeholder="https://..."
            hint="Leave empty to auto-fetch from token registries"
          />

          {error && (
            <ModernAlert type="error" icon={<AlertCircle className="w-4 h-4" />}>
              {error}
            </ModernAlert>
          )}
        </ModernDialogSection>

        <ModernDialogActions>
          <ModernButton variant="secondary" fullWidth onClick={handleClose} type="button">
            Cancel
          </ModernButton>
          <ModernButton
            variant="primary"
            fullWidth
            disabled={autoDetecting}
            loading={isLoading}
            type="submit"
            icon={<Plus className="w-4 h-4" />}
          >
            Add Token
          </ModernButton>
        </ModernDialogActions>
      </form>
    </ModernDialog>
  )
}