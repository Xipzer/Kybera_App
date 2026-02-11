/**
 * Code by Xipzer
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Wallet } from '../types'
import { blockchainService } from '../services/blockchain/blockchainService'
import { blockchainEventBus } from '../services/blockchain/eventBus'
import { getNetworksByType } from '../utils/networks'

export function useWalletListBalances(wallets: Wallet[]): Map<string, number> {
  const [balanceMap, setBalanceMap] = useState<Map<string, number>>(new Map())
  const mountedRef = useRef(true)
  const walletsRef = useRef(wallets)
  walletsRef.current = wallets

  const loadCached = useCallback(async () => {
    const current = walletsRef.current
    if (!current.length) {
      setBalanceMap(new Map())
      return
    }

    const totals = new Map<string, number>()

    await Promise.all(
      current.map(async (wallet) => {
        let walletTotal = 0
        const networks = getNetworksByType(wallet.type)

        await Promise.all(
          networks.map(async (network) => {
            try {
              const cached = await blockchainService.loadCachedBalance(wallet, network)
              if (cached) walletTotal += cached.totalUSD
            } catch {}
          }),
        )

        totals.set(wallet.id, walletTotal)
      }),
    )

    if (mountedRef.current) setBalanceMap(totals)
  }, [])

  useEffect(() => {
    mountedRef.current = true
    loadCached()
    return () => {
      mountedRef.current = false
    }
  }, [wallets.map((w) => w.id).join(','), loadCached])

  useEffect(() => {
    const unsubscribe = blockchainEventBus.on('token:discovery:complete', () => {
      setTimeout(() => {
        if (mountedRef.current) loadCached()
      }, 2500)
    })
    return () => unsubscribe()
  }, [loadCached])

  return balanceMap
}
