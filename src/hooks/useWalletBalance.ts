/**
 * Clean wallet balance hook using new blockchain service
 */

import { useEffect, useRef, useState } from 'react'
import { Network, Wallet } from '../types'
import { BlockchainBalance, blockchainService } from '../services/blockchain/blockchainService'

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
      pricesFromCache: false,
    },
  })
  const [loading, setLoading] = useState(false) // Start with false, only true if no cache
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const hasCacheRef = useRef(false)

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
          // Turn off loading after fresh data arrives if it was on
          if (loading) {
            setLoading(false)
          }
        }
      } catch (err) {
        if (!cancelled) {
          const errorMsg = err instanceof Error ? err.message : 'Failed to fetch balance'
          setError(errorMsg)
          console.error('[useWalletBalance] Error fetching balance:', err)
          // Turn off loading on error
          if (loading) {
            setLoading(false)
          }
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
      // 1. Try to load cached data immediately
      const cachedBalance = await blockchainService.loadCachedBalance(wallet, network)

      if (cachedBalance && !cancelled) {
        // Display cached data immediately
        setBalance(cachedBalance)
        hasCacheRef.current = true
        console.log('[useWalletBalance] Loaded cached balance')
      } else {
        // No cache, we need to show loading state
        setLoading(true)
        hasCacheRef.current = false
      }

      // 2. Fetch fresh data in the background (auto-refresh mode)
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
    // Don't set loading to true - we want to show existing data while refreshing
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
    refetch,
  }
}