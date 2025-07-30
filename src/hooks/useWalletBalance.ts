import { useState, useEffect } from 'react'
import { Wallet, Network } from '../types'
import { BlockchainService, BlockchainBalance } from '../services/blockchain/blockchainService'
import { db } from '../services/storage/database'

// Create a singleton instance
const blockchainService = new BlockchainService()

export function useWalletBalance(wallet: Wallet | undefined, network: Network) {
  const [balance, setBalance] = useState<BlockchainBalance>({
    native: '0',
    nativeUSD: 0,
    tokens: [],
    totalUSD: 0
  })
  const [loading, setLoading] = useState(true) // Start with loading true
  const [error, setError] = useState<string | null>(null)
  const [hasInitialized, setHasInitialized] = useState(false)
  
  // Try to load cached data immediately
  useEffect(() => {
    if (!wallet || wallet.type !== network.type) return
    
    const loadCachedData = async () => {
      try {
        const cachedBalance = await db.walletBalances.get(`${wallet.address}_${network.id}`)
        if (cachedBalance && !hasInitialized) {
          // Get cached token balances
          const cachedTokens = await db.tokenBalances
            .where('walletAddress')
            .equals(wallet.address)
            .and(item => item.networkId === network.id)
            .toArray()
          
          // Calculate total from cached values
          let cachedTokensUSD = 0
          for (const token of cachedTokens) {
            if (token.usdValue) {
              cachedTokensUSD += token.usdValue
            }
          }
          
          const totalUSD = cachedBalance.nativeUSD + cachedTokensUSD
          
          setBalance({
            native: cachedBalance.nativeBalance,
            nativeUSD: cachedBalance.nativeUSD,
            tokens: cachedTokens.map(t => ({
              address: t.tokenAddress,
              symbol: t.symbol,
              name: t.name,
              decimals: t.decimals,
              balance: t.balance,
              logoURI: t.logoURI
            })),
            totalUSD,
            totalUSDChange: 0,
            lastUpdated: cachedBalance.lastUpdated
          })
        }
      } catch (err) {
        console.error('Failed to load cached balance:', err)
      }
    }
    
    loadCachedData()
  }, [wallet?.address, network.id, wallet?.type, network.type, hasInitialized])

  useEffect(() => {
    if (!wallet) {
      setHasInitialized(false)
      blockchainService.stopAllPolling()
      return
    }

    // Check for network type mismatch
    if (wallet.type !== network.type) {
      console.error('useWalletBalance: Network type mismatch', {
        walletType: wallet.type,
        networkType: network.type,
        walletAddress: wallet.address,
        networkName: network.name
      })
      setError(`Network type mismatch: wallet is ${wallet.type} but network is ${network.type}`)
      setLoading(false)
      return
    }

    // Start polling with the simple blockchain service
    setError(null)
    if (!hasInitialized) {
      setLoading(true)
    }

    blockchainService.startPolling(wallet, network, (newBalance) => {
      setBalance(newBalance)
      setHasInitialized(true)
      setLoading(false)
    })

    return () => {
      blockchainService.stopPolling(wallet, network)
    }
  }, [wallet, network])

  return { balance, loading, error, refetch: async () => {
    if (wallet) {
      setError(null)
      try {
        const result = await blockchainService.getBalance(wallet, network)
        setBalance(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch balance')
        // Don't reset balance - keep showing cached value
      }
    }
  }}
}