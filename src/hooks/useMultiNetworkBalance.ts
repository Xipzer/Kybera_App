/**
 * Clean multi-network balance hook using new blockchain service
 * Fetches balances sequentially per network to avoid rate limiting
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Network, Wallet } from '../types'
import { BlockchainBalance, blockchainService } from '../services/blockchain/blockchainService'
import { blockchainEventBus } from '../services/blockchain/core/eventBus'

export interface MultiNetworkBalance {
  balances: BlockchainBalance[]
  totalUSD: number
  total24hChange: number
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

// Concurrency limit per network to avoid rate limiting
const MAX_CONCURRENT_PER_NETWORK = 2
// Delay between network batches (ms)
const NETWORK_BATCH_DELAY = 100
// Debounce time for discovery events (ms)
const DISCOVERY_DEBOUNCE = 2000

export function useMultiNetworkBalance(
  wallets: Wallet[],
  networks: Network[]
): MultiNetworkBalance {
  const [balances, setBalances] = useState<BlockchainBalance[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const fetchingRef = useRef(false) // Prevent concurrent fetches
  const abortRef = useRef(false)
  const balancesRef = useRef(balances) // Stable ref for event handler
  const discoveryTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const mountedRef = useRef(false)

  // Keep balancesRef in sync
  balancesRef.current = balances

  // Store references to avoid dependency issues
  const walletsRef = useRef(wallets)
  const networksRef = useRef(networks)
  walletsRef.current = wallets
  networksRef.current = networks

  // Create stable identifiers for dependency tracking
  const walletIds = wallets.map((w) => w.id).sort().join(',')
  const networkIds = networks.map((n) => n.id).sort().join(',')

  /**
   * Fetch balances with rate limiting - sequential per network
   */
  const fetchBalances = useCallback(async (
    isManualRefresh: boolean,
    existingBalances: BlockchainBalance[] = []
  ) => {
    // Prevent concurrent fetches
    if (fetchingRef.current) {
      console.log('[useMultiNetworkBalance] Fetch already in progress, skipping')
      return
    }

    fetchingRef.current = true
    abortRef.current = false

    try {
      setError(null)
      const currentWallets = walletsRef.current
      const currentNetworks = networksRef.current

      if (!currentWallets.length || !currentNetworks.length) return

      console.log(`[useMultiNetworkBalance] Fetching: ${currentWallets.length} wallets × ${currentNetworks.length} networks`)

      // Initialize with existing balances
      const fetchedBalances = new Map<string, BlockchainBalance>()
      existingBalances.forEach((b) => {
        fetchedBalances.set(`${b.walletAddress}_${b.networkId}`, b)
      })

      // Group wallets by type for each network
      for (const network of currentNetworks) {
        if (abortRef.current) break

        const compatibleWallets = currentWallets.filter((w) => w.type === network.type)
        if (!compatibleWallets.length) continue

        // Process wallets for this network with limited concurrency
        for (let i = 0; i < compatibleWallets.length; i += MAX_CONCURRENT_PER_NETWORK) {
          if (abortRef.current) break

          const batch = compatibleWallets.slice(i, i + MAX_CONCURRENT_PER_NETWORK)

          await Promise.all(
            batch.map(async (wallet) => {
              const key = `${wallet.address}_${network.id}`
              try {
                const balance = await blockchainService.getBalance(wallet, network, isManualRefresh)
                if (!abortRef.current) {
                  fetchedBalances.set(key, balance)
                  setBalances(Array.from(fetchedBalances.values()))
                  setLoading(false)
                }
              } catch (err) {
                console.error(`[useMultiNetworkBalance] Failed: ${wallet.address} on ${network.name}`, err)
              }
            })
          )
        }

        // Small delay between networks to spread load
        if (!abortRef.current) {
          await new Promise((r) => setTimeout(r, NETWORK_BATCH_DELAY))
        }
      }
    } catch (err) {
      if (!abortRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch balances')
        console.error('[useMultiNetworkBalance] Error:', err)
      }
    } finally {
      fetchingRef.current = false
      setLoading(false)
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      abortRef.current = true
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      if (discoveryTimeoutRef.current) {
        clearTimeout(discoveryTimeoutRef.current)
        discoveryTimeoutRef.current = null
      }
    }
  }, [])

  // Listen for token discovery events - stable listener, no dependencies on balances
  useEffect(() => {
    const unsubscribe = blockchainEventBus.on('token:discovery:complete', (event) => {
      if (!mountedRef.current) return
      
      console.log(`[useMultiNetworkBalance] Token discovery found ${event.count} new tokens`)
      
      // Debounce discovery events - wait for all discoveries to settle
      if (discoveryTimeoutRef.current) {
        clearTimeout(discoveryTimeoutRef.current)
      }
      
      discoveryTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current && !fetchingRef.current) {
          console.log('[useMultiNetworkBalance] Refetching after discovery settled')
          fetchBalances(true, balancesRef.current)
        }
      }, DISCOVERY_DEBOUNCE)
    })
    return () => unsubscribe()
  }, [fetchBalances]) // Only depends on fetchBalances, uses refs for balances

  // Main effect - load cached then fetch fresh
  // Uses a mount ID to handle StrictMode double-mount correctly
  const mountIdRef = useRef(0)
  
  useEffect(() => {
    if (!walletsRef.current.length || !networksRef.current.length) {
      setLoading(false)
      setBalances([])
      return
    }

    // Increment mount ID - only the latest mount should fetch
    const currentMountId = ++mountIdRef.current
    abortRef.current = false

    const initializeData = async () => {
      // Check if this mount is still the active one
      if (currentMountId !== mountIdRef.current) {
        console.log('[useMultiNetworkBalance] Stale mount, skipping fetch')
        return
      }

      setError(null)

      // 1. Load cached balances
      const cachedBalances: BlockchainBalance[] = []
      for (const wallet of walletsRef.current) {
        for (const network of networksRef.current) {
          if (wallet.type !== network.type) continue
          const cached = await blockchainService.loadCachedBalance(wallet, network)
          if (cached) cachedBalances.push(cached)
        }
      }

      // Check again after async operations
      if (currentMountId !== mountIdRef.current) return

      if (cachedBalances.length > 0) {
        setBalances(cachedBalances)
        console.log(`[useMultiNetworkBalance] Loaded ${cachedBalances.length} cached balances`)
      } else {
        setLoading(true)
        setBalances([])
      }

      // 2. Fetch fresh data (will update UI progressively)
      await fetchBalances(false, cachedBalances)

      // Check again after fetch
      if (currentMountId !== mountIdRef.current) return

      // 3. Setup auto-refresh (3 minutes)
      if (intervalRef.current) clearInterval(intervalRef.current)
      intervalRef.current = setInterval(() => {
        console.log('[useMultiNetworkBalance] Auto-refresh')
        fetchBalances(false, balancesRef.current)
      }, 180000)
    }

    initializeData()

    return () => {
      abortRef.current = true
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [walletIds, networkIds, fetchBalances])

  /**
   * Manual refresh
   */
  const refetch = useCallback(async () => {
    if (!walletsRef.current.length || !networksRef.current.length) return
    console.log('[useMultiNetworkBalance] Manual refresh')
    await fetchBalances(true, balancesRef.current)

    // Reset auto-refresh timer
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => {
      fetchBalances(false, balancesRef.current)
    }, 180000)
  }, [fetchBalances])

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