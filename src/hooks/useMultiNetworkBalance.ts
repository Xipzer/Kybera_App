/**
 * Code by Xipzer
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Network, Wallet } from '../types'
import { BlockchainBalance, blockchainService } from '../services/blockchain/blockchainService'
import { blockchainEventBus } from '../services/blockchain/eventBus'

export interface MultiNetworkBalance {
  balances: BlockchainBalance[]
  totalUSD: number
  total24hChange: number
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

const MAX_CONCURRENT_PER_NETWORK = 2
const NETWORK_BATCH_DELAY = 100
const DISCOVERY_DEBOUNCE = 2000

export function useMultiNetworkBalance(
  wallets: Wallet[],
  networks: Network[]
): MultiNetworkBalance {
  const [balances, setBalances] = useState<BlockchainBalance[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const fetchingRef = useRef(false)
  const mountIdRef = useRef(0)
  const balancesRef = useRef(balances)
  const discoveryTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const mountedRef = useRef(false)

  balancesRef.current = balances

  const walletsRef = useRef(wallets)
  const networksRef = useRef(networks)
  walletsRef.current = wallets
  networksRef.current = networks

  const walletIds = wallets
    .map((w) => w.id)
    .sort()
    .join(',')
  const networkIds = networks
    .map((n) => n.id)
    .sort()
    .join(',')

  const fetchBalances = useCallback(
    async (isManualRefresh: boolean, existingBalances: BlockchainBalance[] = []) => {
      if (fetchingRef.current) return

      fetchingRef.current = true
      const myMountId = mountIdRef.current

      try {
        setError(null)
        const currentWallets = walletsRef.current
        const currentNetworks = networksRef.current

        if (!currentWallets.length || !currentNetworks.length) return

        const fetchedBalances = new Map<string, BlockchainBalance>()
        existingBalances.forEach((b) => {
          fetchedBalances.set(`${b.walletAddress}_${b.networkId}`, b)
        })

        for (const network of currentNetworks) {
          if (myMountId !== mountIdRef.current) break

          const compatibleWallets = currentWallets.filter((w) => w.type === network.type)
          if (!compatibleWallets.length) continue

          for (let i = 0; i < compatibleWallets.length; i += MAX_CONCURRENT_PER_NETWORK) {
            if (myMountId !== mountIdRef.current) break

            await Promise.all(
              compatibleWallets.slice(i, i + MAX_CONCURRENT_PER_NETWORK).map(async (wallet) => {
                const key = `${wallet.address}_${network.id}`
                try {
                  const balance = await blockchainService.getBalance(
                    wallet,
                    network,
                    isManualRefresh,
                  )
                  if (myMountId === mountIdRef.current) {
                    fetchedBalances.set(key, balance)
                    setBalances(Array.from(fetchedBalances.values()))
                    setLoading(false)
                  }
                } catch (err) {
                  console.error(
                    `[useMultiNetworkBalance] Failed: ${wallet.address} on ${network.name}`,
                    err,
                  )
                }
              }),
            )
          }

          if (myMountId === mountIdRef.current) {
            await new Promise((r) => setTimeout(r, NETWORK_BATCH_DELAY))
          }
        }
      } catch (err) {
        if (myMountId === mountIdRef.current) {
          setError(err instanceof Error ? err.message : 'Failed to fetch balances')
          console.error('[useMultiNetworkBalance] Error:', err)
        }
      } finally {
        if (myMountId === mountIdRef.current) {
          fetchingRef.current = false
        }
        setLoading(false)
      }
    },
    [],
  )

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      mountIdRef.current++
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

  useEffect(() => {
    const unsubscribe = blockchainEventBus.on('token:discovery:complete', () => {
      if (!mountedRef.current) return

      if (discoveryTimeoutRef.current) {
        clearTimeout(discoveryTimeoutRef.current)
      }

      discoveryTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current && !fetchingRef.current) {
          fetchBalances(true, balancesRef.current)
        }
      }, DISCOVERY_DEBOUNCE)
    })
    return () => unsubscribe()
  }, [fetchBalances])

  useEffect(() => {
    if (!walletsRef.current.length || !networksRef.current.length) {
      setLoading(false)
      setBalances([])
      return
    }

    const currentMountId = ++mountIdRef.current
    fetchingRef.current = false

    const initializeData = async () => {
      if (currentMountId !== mountIdRef.current) return

      setError(null)

      const cachedBalances: BlockchainBalance[] = []
      for (const wallet of walletsRef.current) {
        for (const network of networksRef.current) {
          if (wallet.type !== network.type) continue
          const cached = await blockchainService.loadCachedBalance(wallet, network)
          if (cached) cachedBalances.push(cached)
        }
      }

      if (currentMountId !== mountIdRef.current) return

      if (cachedBalances.length > 0) {
        setBalances(cachedBalances)
        setLoading(false)
      } else {
        setLoading(true)
        setBalances([])
      }

      await fetchBalances(false, cachedBalances)

      if (currentMountId !== mountIdRef.current) return

      if (intervalRef.current) clearInterval(intervalRef.current)
      intervalRef.current = setInterval(() => {
        fetchBalances(false, balancesRef.current)
      }, 180000)
    }

    initializeData()

    return () => {
      mountIdRef.current++
      fetchingRef.current = false
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [walletIds, networkIds, fetchBalances])

  const refetch = useCallback(async () => {
    if (!walletsRef.current.length || !networksRef.current.length) return
    await fetchBalances(true, balancesRef.current)

    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => {
      fetchBalances(false, balancesRef.current)
    }, 180000)
  }, [fetchBalances])

  const totalUSD = balances.reduce((sum, balance) => sum + balance.totalUSD, 0)

  const total24hChange =
    totalUSD > 0
      ? balances.reduce((sum, balance) => {
          return sum + (balance.total24hChange * balance.totalUSD) / totalUSD
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