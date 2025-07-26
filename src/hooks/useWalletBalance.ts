import { useState, useEffect } from 'react'
import { Wallet, Network } from '../types'
import { blockchainService, BlockchainBalance } from '../services/blockchain/blockchainService'

export function useWalletBalance(wallet: Wallet | undefined, network: Network) {
  const [balance, setBalance] = useState<BlockchainBalance>({
    native: '0',
    nativeUSD: 0,
    tokens: [],
    totalUSD: 0
  })
  const [loading, setLoading] = useState(true) // Start with loading true
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!wallet) return

    let cancelled = false

    const fetchBalance = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const result = await blockchainService.getBalance(wallet, network)
        
        if (!cancelled) {
          setBalance(result)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch balance')
          // Don't reset balance to default - keep the cached value
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchBalance()
    
    // Refresh balance every 30 seconds
    const interval = setInterval(fetchBalance, 30000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [wallet, network])

  return { balance, loading, error, refetch: () => {
    if (wallet) {
      setLoading(true)
      setError(null)
      blockchainService.getBalance(wallet, network)
        .then(setBalance)
        .catch(err => {
          setError(err instanceof Error ? err.message : 'Failed to fetch balance')
          // Don't reset balance - keep showing cached value
        })
        .finally(() => setLoading(false))
    }
  }}
}