/**
 * Clean Blockchain Service
 * Orchestrates on-chain data fetching and price aggregation
 */

import { Network, Transaction, Wallet } from '../../types'
import { AggregatedBalance, BalanceAggregator } from './balanceAggregator'

export type BlockchainBalance = AggregatedBalance

export class BlockchainService {
  private aggregators: Map<string, BalanceAggregator> = new Map()

  /**
   * Get or create aggregator for a network
   */
  private getAggregator(network: Network): BalanceAggregator {
    if (!this.aggregators.has(network.id)) {
      this.aggregators.set(network.id, new BalanceAggregator(network))
    }
    return this.aggregators.get(network.id)!
  }

  /**
   * Load cached balance immediately without fetching fresh data
   * Returns null if no cache exists
   */
  async loadCachedBalance(wallet: Wallet, network: Network): Promise<AggregatedBalance | null> {
    // Validate wallet/network compatibility
    if (wallet.type !== network.type) {
      return null
    }

    const aggregator = this.getAggregator(network)
    return await aggregator.loadCachedBalance(wallet)
  }

  /**
   * Fetch balance for a wallet on a specific network
   * @param wallet - Wallet to fetch balance for
   * @param network - Network to fetch on
   * @param isManualRefresh - If true, only updates on-chain data (not prices)
   */
  async getBalance(
    wallet: Wallet,
    network: Network,
    isManualRefresh: boolean = false,
  ): Promise<AggregatedBalance> {
    console.log(`[Blockchain] Getting balance for ${wallet.address} on ${network.name}`)

    // Validate wallet/network compatibility
    if (wallet.type !== network.type) {
      throw new Error(`Wallet type ${wallet.type} incompatible with network type ${network.type}`)
    }

    const aggregator = this.getAggregator(network)
    return await aggregator.fetchBalance(wallet, isManualRefresh)
  }

  /**
   * Update blockchain data only (no price fetching)
   * This should be called on a fast interval (30s-1m) to get fresh balances
   * @param wallet - Wallet to fetch balance for
   * @param network - Network to fetch on
   */
  async updateBlockchainOnly(wallet: Wallet, network: Network): Promise<AggregatedBalance> {
    console.log(`[Blockchain] Updating blockchain data only for ${wallet.address} on ${network.name}`)

    // Validate wallet/network compatibility
    if (wallet.type !== network.type) {
      throw new Error(`Wallet type ${wallet.type} incompatible with network type ${network.type}`)
    }

    const aggregator = this.getAggregator(network)
    // isManualRefresh=true means skip price fetching
    return await aggregator.fetchBalance(wallet, true)
  }

  /**
   * Update prices only (no blockchain data fetching)
   * This should be called on a slow interval (5-10m) to respect CoinGecko rate limits
   * @param wallet - Wallet to update prices for
   * @param network - Network the wallet is on
   * @returns Updated balance with fresh prices, or null if no cached data exists
   */
  async updatePricesOnly(wallet: Wallet, network: Network): Promise<AggregatedBalance | null> {
    console.log(`[Blockchain] Updating prices only for ${wallet.address} on ${network.name}`)

    // Validate wallet/network compatibility
    if (wallet.type !== network.type) {
      throw new Error(`Wallet type ${wallet.type} incompatible with network type ${network.type}`)
    }

    const aggregator = this.getAggregator(network)
    return await aggregator.updatePricesOnly(wallet)
  }

  /**
   * Fetch balances for multiple wallets on multiple networks
   * Used by portfolio view
   */
  async getMultiWalletBalances(
    wallets: Wallet[],
    networks: Network[],
    isManualRefresh: boolean = false,
  ): Promise<AggregatedBalance[]> {
    console.log(
      `[Blockchain] Getting balances for ${wallets.length} wallets on ${networks.length} networks`,
    )

    const balances: AggregatedBalance[] = []

    // Fetch balances for each wallet/network combination
    for (const wallet of wallets) {
      for (const network of networks) {
        // Skip incompatible combinations
        if (wallet.type !== network.type) {
          continue
        }

        try {
          const balance = await this.getBalance(wallet, network, isManualRefresh)
          balances.push(balance)
        } catch (error) {
          console.error(
            `[Blockchain] Failed to get balance for ${wallet.address} on ${network.name}`,
            error,
          )
          // Continue with other wallets/networks
        }
      }
    }

    return balances
  }

  /**
   * Add a token to track for a wallet
   */
  async addToken(
    wallet: Wallet,
    network: Network,
    tokenAddress: string,
    symbol: string,
    name: string,
    decimals: number,
  ): Promise<void> {
    const aggregator = this.getAggregator(network)
    await aggregator.addToken(wallet, tokenAddress, symbol, name, decimals)
  }

  /**
   * Remove a token from tracking
   */
  async removeToken(wallet: Wallet, network: Network, tokenAddress: string): Promise<void> {
    const aggregator = this.getAggregator(network)
    await aggregator.removeToken(wallet, tokenAddress)
  }

  /**
   * Clear cache for a wallet on a network
   */
  async clearCache(wallet: Wallet, network: Network): Promise<void> {
    const aggregator = this.getAggregator(network)
    await aggregator.clearCache(wallet)
  }

  /**
   * Clear all caches
   */
  async clearAllCaches(): Promise<void> {
    for (const _aggregator of this.aggregators.values()) {
      // We'd need to track wallets to clear all properly
      // For now, this is a placeholder
    }
    this.aggregators.clear()
    console.log('[Blockchain] Cleared all aggregator caches')
  }

  /**
   * Validate an address for a specific wallet type
   */
  validateAddress(address: string, walletType: 'EVM' | 'SVM'): boolean {
    if (walletType === 'EVM') {
      // Simple EVM address validation
      return /^0x[a-fA-F0-9]{40}$/.test(address)
    } else if (walletType === 'SVM') {
      // Simple Solana address validation (base58 string, 32-44 chars)
      return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)
    }
    return false
  }

  /**
   * Send a transaction (stub - needs implementation)
   */
  async sendTransaction(
    _wallet: Wallet,
    _network: Network,
    _to: string,
    _amount: string,
    _password: string,
  ): Promise<string> {
    // TODO: Implement transaction sending
    console.warn('[Blockchain] sendTransaction not yet implemented')
    throw new Error('Transaction sending not yet implemented in V2')
  }

  /**
   * Send a token transaction (stub - needs implementation)
   */
  async sendToken(
    _wallet: Wallet,
    _network: Network,
    _tokenAddress: string,
    _to: string,
    _amount: string,
    _decimals: number,
    _password: string,
  ): Promise<string> {
    // TODO: Implement token sending
    console.warn('[Blockchain] sendToken not yet implemented')
    throw new Error('Token sending not yet implemented in V2')
  }

  /**
   * Estimate transaction fee (stub - needs implementation)
   */
  async estimateTransactionFee(
    wallet: Wallet,
    _network: Network,
    _to: string,
    _amount: string,
  ): Promise<string> {
    // TODO: Implement proper fee estimation
    // For now, return reasonable defaults
    if (wallet.type === 'EVM') {
      return '0.001' // 0.001 ETH as a default
    } else if (wallet.type === 'SVM') {
      return '0.000005' // 0.000005 SOL as a default
    }
    return '0'
  }

  /**
   * Get transaction history (stub - needs implementation)
   */
  async getTransactionHistory(_wallet: Wallet, _network: Network): Promise<Transaction[]> {
    // TODO: Implement transaction history fetching
    console.warn('[Blockchain] getTransactionHistory not yet implemented')
    return []
  }
}

// Export singleton instance
export const blockchainService = new BlockchainService()