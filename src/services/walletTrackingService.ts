/**
 * Code by Xipzer
 */

import type { ResearchNetwork } from '../types/research'
import type { WatchedWallet, WalletActivity, ActivityType, CopyTradeConfig } from '../types/watchlist'
import { getChainType } from '../utils/networks'
import { useWatchlistStore } from '../store/watchlistStore'
import { useSettingsStore } from '../store/settingsStore'
import { db } from './database'

const API_URLS: Record<ResearchNetwork, string> = {
  base: 'https://api.basescan.org/api',
  ethereum: 'https://api.etherscan.io/api',
  arbitrum: 'https://api.arbiscan.io/api',
  optimism: 'https://api-optimistic.etherscan.io/api',
  solana: '',
}

// Well-known DEX router addresses (lowercase)
const KNOWN_DEX_ROUTERS = new Set([
  '0x7a250d5630b4cf539739df2c5dacb4c659f2488d', // Uniswap V2 Router
  '0xe592427a0aece92de3edee1f18e0157c05861564', // Uniswap V3 Router
  '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45', // Uniswap Universal Router
  '0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad', // Uniswap Universal Router V2
  '0xdef1c0ded9bec7f1a1670819833240f027b25eff', // 0x Exchange Proxy
  '0x1111111254eeb25477b68fb85ed929f73a960582', // 1inch V5 Router
  '0x111111125421ca6dc452d289314280a0f8842a65', // 1inch V6 Router
  '0xd9e1ce17f2641f24ae83637ab66a2cca9c378b9f', // SushiSwap Router
  '0x2b42affd4b7c14d9b7aeb6d1e90360dae6ab5b5a', // Aerodrome Router (Base)
  '0xcf77a3ba9a5ca399b7c97c74d54e5b1beb874e43', // Aerodrome Router V2 (Base)
])

// Approval method signature: approve(address,uint256)
const APPROVAL_METHOD_ID = '0x095ea7b3'

class WalletTrackingService {
  private pollingInterval: ReturnType<typeof setInterval> | null = null
  private isProcessing = false

  /**
   * Starts polling watched wallets at the given interval.
   */
  startMonitoring(intervalMs: number = 60000): void {
    if (this.pollingInterval) {
      console.warn('[WalletTracking] Already monitoring, stopping previous interval')
      this.stopMonitoring()
    }

    console.log(`[WalletTracking] Starting monitoring with ${intervalMs}ms interval`)
    useWatchlistStore.getState().setMonitoring(true)

    // Run immediately, then on interval
    this.pollAllWallets()
    this.pollingInterval = setInterval(() => this.pollAllWallets(), intervalMs)
  }

  /**
   * Stops the polling loop.
   */
  stopMonitoring(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval)
      this.pollingInterval = null
    }
    useWatchlistStore.getState().setMonitoring(false)
    console.log('[WalletTracking] Monitoring stopped')
  }

  /**
   * Polls all watched wallets for new activity.
   */
  private async pollAllWallets(): Promise<void> {
    if (this.isProcessing) {
      console.log('[WalletTracking] Already processing, skipping poll cycle')
      return
    }

    this.isProcessing = true
    const { watchedWallets, copyTradeConfigs } = useWatchlistStore.getState()

    try {
      for (const wallet of watchedWallets) {
        try {
          const activities = await this.checkWalletActivity(wallet)

          for (const activity of activities) {
            // Check if we should trigger an alert
            if (this.shouldTriggerAlert(activity, wallet)) {
              useWatchlistStore.getState().addActivity(activity)

              // Persist to IndexedDB
              await this.persistActivity(activity)

              // Check copy trade configs
              const config = copyTradeConfigs.find(
                (c) => c.watchedWalletId === wallet.id && c.enabled,
              )
              if (config) {
                const evaluation = this.evaluateCopyTrade(activity, config)
                if (evaluation.shouldCopy) {
                  console.log(
                    `[WalletTracking] Copy trade triggered for ${wallet.label}: ${evaluation.reason}`,
                  )
                  // Copy trade execution would be handled by a separate execution service
                }
              }
            }
          }

          // Update last checked timestamp
          useWatchlistStore.getState().updateWallet(wallet.id, {
            lastCheckedAt: Date.now(),
            ...(activities.length > 0 && { lastActivityAt: Date.now() }),
          })
        } catch (error) {
          console.error(`[WalletTracking] Error checking wallet ${wallet.label}:`, error)
        }
      }
    } finally {
      this.isProcessing = false
    }
  }

  /**
   * Fetches recent transactions for a wallet across its configured networks.
   */
  async checkWalletActivity(wallet: WatchedWallet): Promise<WalletActivity[]> {
    const allActivities: WalletActivity[] = []

    for (const networkId of wallet.networks) {
      try {
        const chainType = getChainType(networkId)

        if (chainType === 'SVM') {
          // Solana stub — returns empty for now
          const activities = await this.fetchSolanaTransactions(wallet, networkId)
          allActivities.push(...activities)
        } else {
          const activities = await this.fetchEvmTransactions(wallet, networkId as ResearchNetwork)
          allActivities.push(...activities)
        }
      } catch (error) {
        console.error(
          `[WalletTracking] Error fetching ${networkId} transactions for ${wallet.address}:`,
          error,
        )
      }
    }

    return allActivities
  }

  /**
   * Fetches EVM transactions using Etherscan-compatible APIs.
   */
  private async fetchEvmTransactions(
    wallet: WatchedWallet,
    network: ResearchNetwork,
  ): Promise<WalletActivity[]> {
    const apiUrl = API_URLS[network]
    if (!apiUrl) return []

    const settings = useSettingsStore.getState()
    const params = new URLSearchParams({
      module: 'account',
      action: 'txlist',
      address: wallet.address,
      startblock: '0',
      endblock: '99999999',
      page: '1',
      offset: '20',
      sort: 'desc',
      ...(settings.alchemyApiKey && { apikey: settings.alchemyApiKey }),
    })

    const response = await fetch(`${apiUrl}?${params}`)
    const data = await response.json()

    if (data.status !== '1' || !Array.isArray(data.result)) {
      return []
    }

    // Filter out already-seen transactions
    const existingTxHashes = new Set(
      useWatchlistStore
        .getState()
        .activities.filter((a) => a.watchedWalletId === wallet.id)
        .map((a) => a.txHash),
    )

    const activities: WalletActivity[] = []

    for (const tx of data.result) {
      if (existingTxHashes.has(tx.hash)) continue

      // Only include transactions after the wallet was last checked
      const txTimestamp = parseInt(tx.timeStamp) * 1000
      if (wallet.lastCheckedAt && txTimestamp <= wallet.lastCheckedAt) continue

      const activityType = this.classifyTransaction(tx, wallet.address)
      const methodId = tx.input?.substring(0, 10) || undefined

      const activity: WalletActivity = {
        id: crypto.randomUUID(),
        watchedWalletId: wallet.id,
        walletAddress: wallet.address,
        networkId: network,
        txHash: tx.hash,
        blockNumber: parseInt(tx.blockNumber),
        timestamp: txTimestamp,
        activityType,
        methodId,
        methodName: tx.functionName || undefined,
        // Estimate value from native transfer
        estimatedValueUsd: this.estimateNativeValueUsd(tx.value, network),
      }

      // Enrich based on activity type
      if (activityType === 'transfer_in') {
        activity.counterpartyAddress = tx.from
        activity.amount = this.weiToEth(tx.value)
      } else if (activityType === 'transfer_out') {
        activity.counterpartyAddress = tx.to
        activity.amount = this.weiToEth(tx.value)
      } else if (activityType === 'swap') {
        const swapInfo = this.parseSwapFromTx(tx)
        if (swapInfo) {
          activity.tokenInSymbol = swapInfo.tokenIn
          activity.tokenOutSymbol = swapInfo.tokenOut
          activity.tokenInAmount = swapInfo.amounts.in
          activity.tokenOutAmount = swapInfo.amounts.out
        }
      }

      activities.push(activity)
    }

    return activities
  }

  /**
   * Stub for Solana transaction fetching.
   * Will use Helius/Solana RPC getSignaturesForAddress in the future.
   */
  private async fetchSolanaTransactions(
    _wallet: WatchedWallet,
    _networkId: string,
  ): Promise<WalletActivity[]> {
    // TODO: Implement Solana transaction fetching via Helius RPC
    // const heliusKey = useSettingsStore.getState().heliusApiKey
    // Use getSignaturesForAddress + getTransaction for details
    console.log('[WalletTracking] Solana tracking not yet implemented')
    return []
  }

  /**
   * Determines if a transaction is a swap, transfer, approval, etc.
   */
  classifyTransaction(tx: any, walletAddress: string): ActivityType {
    const from = (tx.from || '').toLowerCase()
    const to = (tx.to || '').toLowerCase()
    const wallet = walletAddress.toLowerCase()
    const input = tx.input || '0x'
    const value = BigInt(tx.value || '0')
    const methodId = input.substring(0, 10)

    // Approval check
    if (methodId === APPROVAL_METHOD_ID) {
      return 'approval'
    }

    // Incoming native transfer
    if (to === wallet && value > 0n) {
      return 'transfer_in'
    }

    // Outgoing to a known DEX router → likely a swap
    if (from === wallet && KNOWN_DEX_ROUTERS.has(to)) {
      return 'swap'
    }

    // Outgoing native transfer
    if (from === wallet && value > 0n) {
      return 'transfer_out'
    }

    // Contract interaction (has calldata)
    if (input !== '0x') {
      return 'contract_interaction'
    }

    return 'unknown'
  }

  /**
   * Attempts to parse swap details from a transaction.
   * This is a best-effort heuristic based on common DEX patterns.
   */
  parseSwapFromTx(tx: any): { tokenIn: string; tokenOut: string; amounts: { in: string; out: string } } | null {
    // Without decoding logs or internal transactions, we can only provide
    // limited information from the top-level transaction
    const input = tx.input || '0x'
    if (input === '0x' || input.length < 10) return null

    const methodId = input.substring(0, 10)

    // Common swap method signatures
    const swapMethods: Record<string, string> = {
      '0x38ed1739': 'swapExactTokensForTokens',
      '0x8803dbee': 'swapTokensForExactTokens',
      '0x7ff36ab5': 'swapExactETHForTokens',
      '0x18cbafe5': 'swapExactTokensForETH',
      '0xfb3bdb41': 'swapETHForExactTokens',
      '0x5c11d795': 'swapExactTokensForTokensSupportingFeeOnTransferTokens',
      '0xb6f9de95': 'swapExactETHForTokensSupportingFeeOnTransferTokens',
      '0x791ac947': 'swapExactTokensForETHSupportingFeeOnTransferTokens',
      '0x04e45aaf': 'exactInputSingle (V3)',
      '0xc04b8d59': 'exactInput (V3)',
      '0x3593564c': 'execute (Universal Router)',
    }

    if (swapMethods[methodId]) {
      const value = BigInt(tx.value || '0')
      const isEthInput = value > 0n

      return {
        tokenIn: isEthInput ? 'ETH' : 'TOKEN',
        tokenOut: isEthInput ? 'TOKEN' : 'ETH',
        amounts: {
          in: isEthInput ? this.weiToEth(tx.value) : 'unknown',
          out: 'unknown',
        },
      }
    }

    return null
  }

  /**
   * Checks if an activity matches the wallet's tracking configuration.
   */
  shouldTriggerAlert(activity: WalletActivity, wallet: WatchedWallet): boolean {
    // Check activity type filters
    if (activity.activityType === 'swap' && !wallet.trackSwaps) return false
    if (
      (activity.activityType === 'transfer_in' || activity.activityType === 'transfer_out') &&
      !wallet.trackTransfers
    )
      return false
    if (activity.activityType === 'approval' && !wallet.trackApprovals) return false

    // Check minimum value threshold
    if (
      wallet.minValueUsd > 0 &&
      activity.estimatedValueUsd !== undefined &&
      activity.estimatedValueUsd < wallet.minValueUsd
    ) {
      return false
    }

    return true
  }

  /**
   * Determines if a copy trade should execute based on the config and activity.
   */
  evaluateCopyTrade(
    activity: WalletActivity,
    config: CopyTradeConfig,
  ): { shouldCopy: boolean; reason: string } {
    // Only copy swaps
    if (activity.activityType !== 'swap') {
      return { shouldCopy: false, reason: 'Activity is not a swap' }
    }

    // Check if config is enabled
    if (!config.enabled) {
      return { shouldCopy: false, reason: 'Copy trade config is disabled' }
    }

    // Check daily trade limit — reset if new day
    const today = new Date().toISOString().split('T')[0]
    if (config.lastResetDate !== today) {
      useWatchlistStore.getState().updateCopyTradeConfig(config.watchedWalletId, {
        dailyTradesUsed: 0,
        lastResetDate: today,
      })
    } else if (config.dailyTradesUsed >= config.maxDailyTrades) {
      return { shouldCopy: false, reason: 'Daily trade limit reached' }
    }

    // Check minimum whale trade size
    if (
      activity.estimatedValueUsd !== undefined &&
      activity.estimatedValueUsd < config.minWhaleTradeUsd
    ) {
      return {
        shouldCopy: false,
        reason: `Trade value ($${activity.estimatedValueUsd}) below minimum ($${config.minWhaleTradeUsd})`,
      }
    }

    // Check token blacklist
    const involvedTokens = [
      activity.tokenInAddress,
      activity.tokenOutAddress,
      activity.tokenAddress,
    ].filter(Boolean) as string[]

    for (const token of involvedTokens) {
      if (config.tokenBlacklist.includes(token.toLowerCase())) {
        return { shouldCopy: false, reason: `Token ${token} is blacklisted` }
      }
    }

    // Check token whitelist (if set, only copy whitelisted tokens)
    if (config.tokenWhitelist.length > 0) {
      const hasWhitelistedToken = involvedTokens.some((t) =>
        config.tokenWhitelist.includes(t.toLowerCase()),
      )
      if (!hasWhitelistedToken) {
        return { shouldCopy: false, reason: 'No whitelisted tokens involved in trade' }
      }
    }

    // Check network match
    if (activity.networkId !== config.executionNetworkId) {
      return {
        shouldCopy: false,
        reason: `Activity network (${activity.networkId}) does not match execution network (${config.executionNetworkId})`,
      }
    }

    // If confirmation is required, we flag it for user approval
    if (config.requireConfirmation) {
      return { shouldCopy: true, reason: 'Awaiting user confirmation' }
    }

    return { shouldCopy: true, reason: 'All checks passed' }
  }

  /**
   * Persists an activity to IndexedDB for historical storage.
   */
  private async persistActivity(activity: WalletActivity): Promise<void> {
    try {
      await db.walletActivities.put({
        id: activity.id,
        watchedWalletId: activity.watchedWalletId,
        walletAddress: activity.walletAddress,
        networkId: activity.networkId,
        txHash: activity.txHash,
        blockNumber: activity.blockNumber,
        timestamp: activity.timestamp,
        activityType: activity.activityType,
        tokenInSymbol: activity.tokenInSymbol,
        tokenOutSymbol: activity.tokenOutSymbol,
        estimatedValueUsd: activity.estimatedValueUsd,
        raw: JSON.stringify(activity),
      })
    } catch (error) {
      console.error('[WalletTracking] Error persisting activity:', error)
    }
  }

  /**
   * Converts wei string to ETH string.
   */
  private weiToEth(weiValue: string): string {
    try {
      const wei = BigInt(weiValue || '0')
      const eth = Number(wei) / 1e18
      return eth.toFixed(6)
    } catch {
      return '0'
    }
  }

  /**
   * Rough USD estimate for native token transfers.
   */
  private estimateNativeValueUsd(weiValue: string, network: string): number {
    try {
      const eth = Number(BigInt(weiValue || '0')) / 1e18
      // Rough price estimates — in production, use live price feeds
      const prices: Record<string, number> = {
        ethereum: 2300,
        base: 2300,
        arbitrum: 2300,
        optimism: 2300,
        solana: 150,
      }
      return eth * (prices[network] || 2300)
    } catch {
      return 0
    }
  }
}

export const walletTrackingService = new WalletTrackingService()
