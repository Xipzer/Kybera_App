import { useEffect, useState } from 'react'
import { Network, Wallet } from '../types'
import { BlockchainBalance, blockchainService } from '../services/blockchain/blockchainService'
import { db } from '../services/storage/database'
import { ALL_NETWORKS } from '../utils/networks'

export interface MultiNetworkBalance {
  [networkId: string]: BlockchainBalance & { network: Network }
}

export function useMultiNetworkBalance(
  wallet: Wallet | undefined,
  networkIds: string[] | undefined,
) {
  const [balances, setBalances] = useState<MultiNetworkBalance>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasInitialized, setHasInitialized] = useState(false)

  // Load cached data immediately
  useEffect(() => {
    if (!wallet || !networkIds || networkIds.length === 0) return

    const loadCachedData = async () => {
      try {
        const cachedBalances: MultiNetworkBalance = {}

        for (const networkId of networkIds) {
          const network = ALL_NETWORKS.find((n) => n.id === networkId)
          if (!network || network.type !== wallet.type) continue

          const cachedBalance = await db.walletBalances.get(`${wallet.address}_${network.id}`)
          if (cachedBalance) {
            // Get cached token balances
            const cachedTokens = await db.tokenBalances
              .where('walletAddress')
              .equals(wallet.address)
              .and((item) => item.networkId === network.id)
              .toArray()

            // Calculate total from cached values
            let cachedTokensUSD = 0
            for (const token of cachedTokens) {
              if (token.usdValue) {
                cachedTokensUSD += token.usdValue
              }
            }

            const totalUSD = cachedBalance.nativeUSD + cachedTokensUSD

            cachedBalances[networkId] = {
              native: cachedBalance.nativeBalance,
              nativeUSD: cachedBalance.nativeUSD,
              tokens: cachedTokens.map((t) => ({
                address: t.tokenAddress,
                symbol: t.symbol,
                name: t.name,
                decimals: t.decimals,
                balance: t.balance,
                logoURI: t.logoURI,
              })),
              totalUSD,
              totalUSDChange: 0,
              lastUpdated: cachedBalance.lastUpdated,
              network,
            }
          }
        }

        if (Object.keys(cachedBalances).length > 0 && !hasInitialized) {
          setBalances(cachedBalances)
        }
      } catch (err) {
        console.error('Failed to load cached balances:', err)
      }
    }

    loadCachedData()
  }, [wallet?.address, networkIds, wallet?.type, hasInitialized])

  useEffect(() => {
    if (!wallet || !networkIds || networkIds.length === 0) {
      setHasInitialized(false)
      setBalances({})
      setLoading(false)
      return
    }

    let cancelled = false

    const fetchBalances = async () => {
      try {
        // Only show loading on first fetch, not on refreshes
        if (!hasInitialized) {
          setLoading(true)
        }
        setError(null)

        const newBalances: MultiNetworkBalance = {}
        const promises: Promise<void>[] = []

        for (const networkId of networkIds) {
          const network = ALL_NETWORKS.find((n) => n.id === networkId)

          // Skip networks that don't match wallet type
          if (!network || network.type !== wallet.type) {
            continue
          }

          const promise = blockchainService
            .getBalance(wallet, network)
            .then((result) => {
              if (!cancelled) {
                newBalances[networkId] = { ...result, network }
              }
            })
            .catch((err) => {
              console.error(`Failed to fetch balance for ${network.name}:`, err)
              // Keep cached balance if fetch fails
              if (balances[networkId]) {
                newBalances[networkId] = balances[networkId]
              }
            })

          promises.push(promise)
        }

        await Promise.all(promises)

        if (!cancelled) {
          setBalances(newBalances)
          setHasInitialized(true)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch balances')
          setHasInitialized(true)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchBalances()

    // Refresh balances every 3 minutes
    const interval = setInterval(fetchBalances, 180000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [wallet, networkIds?.join(',')]) // Join networkIds to create a stable dependency

  // Calculate aggregated totals
  const totalUSD = Object.values(balances).reduce(
    (sum, balance) => sum + (balance.totalUSD || 0),
    0,
  )
  const totalTokens = Object.values(balances).reduce(
    (sum, balance) => sum + balance.tokens.length,
    0,
  )

  return {
    balances,
    loading,
    error,
    totalUSD,
    totalTokens,
    refetch: async () => {
      if (!wallet || !networkIds) return

      setError(null)
      try {
        const newBalances: MultiNetworkBalance = {}

        for (const networkId of networkIds) {
          const network = ALL_NETWORKS.find((n) => n.id === networkId)
          if (!network || network.type !== wallet.type) continue

          try {
            const result = await blockchainService.getBalance(wallet, network)
            newBalances[networkId] = { ...result, network }
          } catch (err) {
            console.error(`Failed to fetch balance for ${network.name}:`, err)
            // Keep existing balance on error
            if (balances[networkId]) {
              newBalances[networkId] = balances[networkId]
            }
          }
        }

        setBalances(newBalances)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch balances')
      }
    },
  }
}
