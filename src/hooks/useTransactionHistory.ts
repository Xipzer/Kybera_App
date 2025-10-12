import { useEffect, useState } from 'react'
import { Network, Transaction, Wallet } from '../types'
import { blockchainService } from '../services/blockchain/blockchainService'

export function useTransactionHistory(wallet: Wallet | undefined, network: Network) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!wallet) return

    let cancelled = false

    const fetchTransactions = async () => {
      try {
        setLoading(true)
        setError(null)

        const txs = await blockchainService.getTransactionHistory(wallet, network)

        if (!cancelled) {
          // Sort by timestamp, newest first
          setTransactions(txs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()))
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch transactions')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchTransactions()

    // Refresh transactions every 3 minutes
    const interval = setInterval(fetchTransactions, 180000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [wallet, network])

  return { transactions, loading, error }
}