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
  const [loading, setLoading] = useState(false) // Start with false, only true if no cache
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const hasCacheRef = useRef(false)

  // Store references to avoid dependency issues
  const walletsRef = useRef(wallets)
  const networksRef = useRef(networks)
  walletsRef.current = wallets
  networksRef.current = networks

  // Create stable identifiers for dependency tracking
  const walletIds = wallets
    .map((w) => w.id)
    .sort()
    .join(',')
  const networkIds = networks
    .map((n) => n.id)
    .sort()
    .join(',')

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
    if (!walletsRef.current.length || !networksRef.current.length) {
      setLoading(false)
      setBalances([]) // Clear balances when no wallets
      return
    }

    let cancelled = false

    /**
     * Load cached balances immediately
     */
    const loadCachedBalances = async () => {
      const cachedBalances: BlockchainBalance[] = []

      for (const wallet of walletsRef.current) {
        for (const network of networksRef.current) {
          // Skip incompatible combinations
          if (wallet.type !== network.type) {
            continue
          }

          const cached = await blockchainService.loadCachedBalance(wallet, network)
          if (cached) {
            cachedBalances.push(cached)
          }
        }
      }

      if (cachedBalances.length > 0 && !cancelled) {
        setBalances(cachedBalances)
        hasCacheRef.current = true
        console.log(`[useMultiNetworkBalance] Loaded ${cachedBalances.length} cached balances`)
      } else {
        hasCacheRef.current = false
      }

      return cachedBalances
    }

    /**
     * Fetch balances for all wallet/network combinations progressively
     * @param isManualRefresh - If true, only fetches on-chain data
     * @param existingBalances - Current balances to preserve during updates
     */
    const fetchAllBalances = async (
      isManualRefresh: boolean = false,
      existingBalances: BlockchainBalance[] = [],
    ) => {
      if (cancelled) return

      try {
        setError(null)
        console.log(
          `[useMultiNetworkBalance] Fetching balances for ${walletsRef.current.length} wallets on ${networksRef.current.length} networks`,
        )

        // Track completed fetches to update state progressively
        const fetchedBalances: Map<string, BlockchainBalance> = new Map()

        // Initialize with existing balances to preserve data while updating
        existingBalances.forEach((b) => {
          const key = `${b.walletAddress}_${b.networkId}`
          fetchedBalances.set(key, b)
        })

        // Fetch balances for each wallet/network combination progressively
        const fetchPromises = walletsRef.current.flatMap((wallet) =>
          networksRef.current.map(async (network) => {
            // Skip incompatible combinations
            if (wallet.type !== network.type) {
              return null
            }

            const key = `${wallet.address}_${network.id}`

            try {
              const balance = await blockchainService.getBalance(wallet, network, isManualRefresh)

              if (!cancelled) {
                // Update the map with the fetched balance
                fetchedBalances.set(key, balance)

                // Update state with all balances fetched so far
                setBalances(Array.from(fetchedBalances.values()))

                // Turn off loading if it was on
                if (loading) {
                  setLoading(false)
                }
              }

              return balance
            } catch (error) {
              console.error(
                `[useMultiNetworkBalance] Failed to get balance for ${wallet.address} on ${network.name}`,
                error,
              )
              // Continue with other fetches even if one fails
              return null
            }
          }),
        )

        // Wait for all fetches to complete (but we're updating progressively)
        await Promise.all(fetchPromises.filter((p) => p !== null))
      } catch (err) {
        if (!cancelled) {
          const errorMsg = err instanceof Error ? err.message : 'Failed to fetch balances'
          setError(errorMsg)
          console.error('[useMultiNetworkBalance] Error fetching balances:', err)

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
        console.log('[useMultiNetworkBalance] Auto-refreshing all balances')
        // Use functional state update to get current balances
        setBalances((currentBalances) => {
          fetchAllBalances(false, currentBalances) // Pass current balances
          return currentBalances // Return unchanged for now, will be updated progressively
        })
      }, 180000) // 3 minutes

      return intervalRef.current
    }

    // Initial data load sequence
    const initializeData = async () => {
      // Clear previous wallet's balances to avoid showing stale data
      setBalances([])
      setError(null)

      // 1. Load cached balances immediately
      const cachedBalances = await loadCachedBalances()

      // Only show loading state if no cache exists
      if (cachedBalances.length === 0) {
        setLoading(true)
      }

      // 2. Fetch fresh data in the background (auto-refresh mode)
      await fetchAllBalances(false, cachedBalances)

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
  }, [walletIds, networkIds]) // Re-run when wallet IDs or network IDs change

  /**
   * Manual refresh function
   * Only updates on-chain data, uses cached prices
   */
  const refetch = async () => {
    if (!walletsRef.current.length || !networksRef.current.length) return

    setError(null)
    // Don't set loading to true - we want to show existing data while refreshing

    try {
      console.log('[useMultiNetworkBalance] Manual refresh triggered')

      // Track completed fetches to update state progressively
      const fetchedBalances: Map<string, BlockchainBalance> = new Map()

      // Initialize with existing balances to preserve data while updating
      balances.forEach((b) => {
        const key = `${b.walletAddress}_${b.networkId}`
        fetchedBalances.set(key, b)
      })

      // Fetch balances for each wallet/network combination progressively
      const fetchPromises = walletsRef.current.flatMap((wallet) =>
        networksRef.current.map(async (network) => {
          // Skip incompatible combinations
          if (wallet.type !== network.type) {
            return null
          }

          const key = `${wallet.address}_${network.id}`

          try {
            const balance = await blockchainService.getBalance(wallet, network, true) // Manual refresh

            // Update the map with the fetched balance
            fetchedBalances.set(key, balance)

            // Update state with all balances fetched so far
            setBalances(Array.from(fetchedBalances.values()))

            return balance
          } catch (error) {
            console.error(
              `[useMultiNetworkBalance] Failed to refresh balance for ${wallet.address} on ${network.name}`,
              error,
            )
            // Continue with other fetches even if one fails
            return null
          }
        }),
      )

      // Wait for all fetches to complete (but we're updating progressively)
      await Promise.all(fetchPromises.filter((p) => p !== null))

      // Reset the automatic refresh timer
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      intervalRef.current = setInterval(() => {
        console.log('[useMultiNetworkBalance] Auto-refreshing all balances')
        // Use functional state update to get current balances
        setBalances((currentBalances) => {
          // Fetch progressively with existing balances
          const fetchProgressively = async () => {
            const fetchedBalances: Map<string, BlockchainBalance> = new Map()

            currentBalances.forEach((b) => {
              const key = `${b.walletAddress}_${b.networkId}`
              fetchedBalances.set(key, b)
            })

            const fetchPromises = walletsRef.current.flatMap((wallet) =>
              networksRef.current.map(async (network) => {
                if (wallet.type !== network.type) return null
                const key = `${wallet.address}_${network.id}`

                try {
                  const balance = await blockchainService.getBalance(wallet, network, false)
                  fetchedBalances.set(key, balance)
                  setBalances(Array.from(fetchedBalances.values()))
                  return balance
                } catch (error) {
                  console.error(
                    `[useMultiNetworkBalance] Auto-refresh failed for ${wallet.address} on ${network.name}`,
                    error,
                  )
                  return null
                }
              }),
            )

            await Promise.all(fetchPromises.filter((p) => p !== null))
          }

          fetchProgressively()
          return currentBalances // Return unchanged for now, will be updated progressively
        })
      }, 180000)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch balances'
      setError(errorMsg)
      console.error('[useMultiNetworkBalance] Error on manual refresh:', err)
    }
  }

  // Calculate totals
  const totalUSD = balances.reduce((sum, balance) => sum + balance.totalUSD, 0)

  // Calculate weighted 24h change
  const total24hChange =
    totalUSD > 0
      ? balances.reduce((sum, balance) => {
          const weight = balance.totalUSD / totalUSD
          return sum + balance.total24hChange * weight
        }, 0)
      : 0

  return {
    balances,
    totalUSD,
    total24hChange,
    loading,
    error,
    refetch,
  }
}