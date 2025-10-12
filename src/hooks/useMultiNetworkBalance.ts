/**
 * Clean multi-network balance hook using new blockchain service
 */

import { useEffect, useRef, useState } from 'react'
import { Network, Wallet } from '../types'
import { BlockchainBalance, blockchainService } from '../services/blockchain/blockchainService'

export interface MultiNetworkBalance {
  balances: BlockchainBalance[]
  totalUSD: number
  total24hChange: number
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useMultiNetworkBalance(
  wallets: Wallet[],
  networks: Network[]
): MultiNetworkBalance {
  const [balances, setBalances] = useState<BlockchainBalance[]>([])
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
    if (!wallets.length || !networks.length) {
      setLoading(false)
      return
    }

    let cancelled = false

    /**
     * Fetch balances for all wallet/network combinations
     * @param isManualRefresh - If true, only fetches on-chain data
     */
    const fetchAllBalances = async (isManualRefresh: boolean = false) => {
      if (cancelled) return

      try {
        setError(null)
        console.log(`[useMultiNetworkBalance] Fetching balances for ${wallets.length} wallets on ${networks.length} networks`)

        const allBalances = await blockchainService.getMultiWalletBalances(
          wallets,
          networks,
          isManualRefresh
        )

        if (!cancelled) {
          setBalances(allBalances)
        }
      } catch (err) {
        if (!cancelled) {
          const errorMsg = err instanceof Error ? err.message : 'Failed to fetch balances'
          setError(errorMsg)
          console.error('[useMultiNetworkBalance] Error fetching balances:', err)
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
        console.log('[useMultiNetworkBalance] Auto-refreshing all balances')
        fetchAllBalances(false) // Auto-refresh includes prices
      }, 180000) // 3 minutes

      return intervalRef.current
    }

    // Initial fetch (auto-refresh mode)
    fetchAllBalances(false)

    // Setup automatic refresh
    setupInterval()

    return () => {
      cancelled = true
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [wallets.length, networks.length]) // Only re-run if number of wallets/networks changes

  /**
   * Manual refresh function
   * Only updates on-chain data, uses cached prices
   */
  const refetch = async () => {
    if (!wallets.length || !networks.length) return

    setError(null)
    setLoading(true)

    try {
      const allBalances = await blockchainService.getMultiWalletBalances(
        wallets,
        networks,
        true // Manual refresh - on-chain data only
      )
      setBalances(allBalances)

      // Reset the automatic refresh timer
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      intervalRef.current = setInterval(async () => {
        console.log('[useMultiNetworkBalance] Auto-refreshing all balances')
        const freshBalances = await blockchainService.getMultiWalletBalances(
          wallets,
          networks,
          false
        )
        setBalances(freshBalances)
      }, 180000)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch balances'
      setError(errorMsg)
      console.error('[useMultiNetworkBalance] Error on manual refresh:', err)
    } finally {
      setLoading(false)
    }
  }

  // Calculate totals
  const totalUSD = balances.reduce((sum, balance) => sum + balance.totalUSD, 0)

  // Calculate weighted 24h change
  const total24hChange = totalUSD > 0
    ? balances.reduce((sum, balance) => {
        const weight = balance.totalUSD / totalUSD
        return sum + (balance.total24hChange * weight)
      }, 0)
    : 0

  return {
    balances,
    totalUSD,
    total24hChange,
    loading,
    error,
    refetch
  }
}