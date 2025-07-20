/**
 * Code by Xipzer
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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const blockchainIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const priceIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const hasCacheRef = useRef(false)

  useEffect(() => {
    return () => {
      if (blockchainIntervalRef.current) {
        clearInterval(blockchainIntervalRef.current)
        blockchainIntervalRef.current = null
      }
      if (priceIntervalRef.current) {
        clearInterval(priceIntervalRef.current)
        priceIntervalRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!wallet) {
      setLoading(false)
      return
    }

    if (wallet.type !== network.type) {
      setError(`Network type mismatch: wallet is ${wallet.type} but network is ${network.type}`)
      setLoading(false)
      return
    }

    let cancelled = false

    const fetchBalance = async (isManualRefresh: boolean = false) => {
      if (cancelled) return

      try {
        setError(null)
        const freshBalance = await blockchainService.getBalance(wallet, network, isManualRefresh)

        if (!cancelled) {
          setBalance(freshBalance)
          if (loading) {
            setLoading(false)
          }
        }
      } catch (err) {
        if (!cancelled) {
          const errorMsg = err instanceof Error ? err.message : 'Failed to fetch balance'
          setError(errorMsg)
          console.error('[useWalletBalance] Error fetching balance:', err)
          if (loading) {
            setLoading(false)
          }
        }
      }
    }

    const setupIntervals = () => {
      if (blockchainIntervalRef.current) {
        clearInterval(blockchainIntervalRef.current)
      }
      if (priceIntervalRef.current) {
        clearInterval(priceIntervalRef.current)
      }

      blockchainIntervalRef.current = setInterval(() => {
        fetchBalance(true)
      }, 30000)

      priceIntervalRef.current = setInterval(() => {
        blockchainService
          .updatePricesOnly(wallet, network)
          .then((updatedBalance) => {
            if (updatedBalance && !cancelled) {
              setBalance(updatedBalance)
            }
          })
          .catch((err) => {
            console.error('[useWalletBalance] Error updating prices:', err)
          })
      }, 300000)
    }

    const initializeData = async () => {
      setBalance({
        walletAddress: wallet.address,
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
      setError(null)

      const cachedBalance = await blockchainService.loadCachedBalance(wallet, network)

      if (cachedBalance && !cancelled) {
        setBalance(cachedBalance)
        hasCacheRef.current = true
      } else {
        setLoading(true)
        hasCacheRef.current = false
      }

      await fetchBalance(false)

      setupIntervals()
    }

    initializeData()

    return () => {
      cancelled = true
      if (blockchainIntervalRef.current) {
        clearInterval(blockchainIntervalRef.current)
        blockchainIntervalRef.current = null
      }
      if (priceIntervalRef.current) {
        clearInterval(priceIntervalRef.current)
        priceIntervalRef.current = null
      }
    }
  }, [wallet, network])

  const refetch = async () => {
    if (!wallet) return

    setError(null)
    try {
      setBalance(await blockchainService.getBalance(wallet, network, true))

      if (blockchainIntervalRef.current) {
        clearInterval(blockchainIntervalRef.current)
      }
      if (priceIntervalRef.current) {
        clearInterval(priceIntervalRef.current)
      }

      blockchainIntervalRef.current = setInterval(() => {
        blockchainService.updateBlockchainOnly(wallet, network).then(setBalance).catch(console.error)
      }, 30000)

      priceIntervalRef.current = setInterval(() => {
        blockchainService.updatePricesOnly(wallet, network)
          .then(updated => updated && setBalance(updated))
          .catch(console.error)
      }, 300000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch balance')
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