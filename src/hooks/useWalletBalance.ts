/**
 * Clean wallet balance hook using new blockchain service
 */

import { useEffect, useRef, useState } from 'react'
import { Network, Wallet } from '../types'
import { BlockchainBalance, blockchainService } from '../services/blockchain/blockchainService'
import { db } from '../services/storage/database'

export function useWalletBalance(wallet: Wallet | undefined, network: Network) {
  const [balance, setBalance] = useState<BlockchainBalance>({
    walletAddress: '',
    networkId: network.id,
    native: '0',
    nativeUSD: 0,
    native24hChange: 0,
    tokens: [],
    totalUSD: 0,
    total24hChange: 0,
    lastUpdated: Date.now(),
    dataQuality: {
      onChainFromCache: false,
      pricesFromCache: false
    }
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!wallet) {
      setLoading(false)
      return
    }

    // Check for network type mismatch
    if (wallet.type !== network.type) {
      setError(`Network type mismatch: wallet is ${wallet.type} but network is ${network.type}`)
      setLoading(false)
      return
    }

    let cancelled = false

    /**
     * Load cached balance immediately for better UX
     */
    const loadCachedBalance = async () => {
      try {
        const cached = await db.walletBalances.get(`${wallet.address}_${network.id}`)
        if (cached && !cancelled) {
          const cachedTokens = await db.tokenBalances
            .where('walletAddress')
            .equals(wallet.address)
            .and(item => item.networkId === network.id)
            .toArray()

          setBalance({
            walletAddress: wallet.address,
            networkId: network.id,
            native: cached.nativeBalance,
            nativeUSD: cached.nativeUSD,
            native24hChange: 0,
            tokens: cachedTokens.map(t => ({
              address: t.tokenAddress,
              symbol: t.symbol,
              name: t.name,
              decimals: t.decimals,
              balance: t.balance,
              usdValue: t.usdValue || 0,
              usd24hChange: 0,
              fromCache: true,
              logoURI: t.logoURI
            })),
            totalUSD: cached.totalUSD,
            total24hChange: 0,
            lastUpdated: cached.lastUpdated,
            dataQuality: {
              onChainFromCache: true,
              pricesFromCache: true
            }
          })
        }
      } catch (err) {
        console.error('[useWalletBalance] Failed to load cached balance:', err)
      }
    }

    /**
     * Fetch fresh balance from blockchain
     * @param isManualRefresh - If true, only fetches on-chain data
     */
    const fetchBalance = async (isManualRefresh: boolean = false) => {
      if (cancelled) return

      try {
        setError(null)
        const freshBalance = await blockchainService.getBalance(wallet, network, isManualRefresh)

        if (!cancelled) {
          setBalance(freshBalance)
        }
      } catch (err) {
        if (!cancelled) {
          const errorMsg = err instanceof Error ? err.message : 'Failed to fetch balance'
          setError(errorMsg)
          console.error('[useWalletBalance] Error fetching balance:', err)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    /**
     * Setup automatic refresh interval (3 minutes)
     */
    const setupInterval = () => {
      // Clear existing interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }

      // Set up new interval
      intervalRef.current = setInterval(() => {
        console.log('[useWalletBalance] Auto-refreshing balance')
        fetchBalance(false) // Auto-refresh includes prices
      }, 180000) // 3 minutes

      return intervalRef.current
    }

    // Initial data load sequence
    const initializeData = async () => {
      // 1. Load cached data immediately
      await loadCachedBalance()

      // 2. Fetch fresh data (auto-refresh mode)
      await fetchBalance(false)

      // 3. Setup automatic refresh
      setupInterval()
    }

    initializeData()

    return () => {
      cancelled = true
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [wallet, network])

  /**
   * Manual refresh function
   * Only updates on-chain data, uses cached prices
   */
  const refetch = async () => {
    if (!wallet) return

    setError(null)
    try {
      const freshBalance = await blockchainService.getBalance(wallet, network, true)
      setBalance(freshBalance)

      // Reset the automatic refresh timer
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      intervalRef.current = setInterval(() => {
        console.log('[useWalletBalance] Auto-refreshing balance')
        blockchainService.getBalance(wallet, network, false).then(setBalance).catch(console.error)
      }, 180000)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch balance'
      setError(errorMsg)
      console.error('[useWalletBalance] Error on manual refresh:', err)
    }
  }

  return {
    balance,
    loading,
    error,
    refetch
  }
}