/**
 * Code by Xipzer
 */

import { Network, Transaction, Wallet } from '../../types'
import { AggregatedBalance, BalanceAggregator } from './balanceAggregator'
import { isValidAddress } from '../../utils/networks'

export type BlockchainBalance = AggregatedBalance

export class BlockchainService {
  private aggregators: Map<string, BalanceAggregator> = new Map()

  private getAggregator(network: Network): BalanceAggregator {
    if (!this.aggregators.has(network.id)) {
      this.aggregators.set(network.id, new BalanceAggregator(network))
    }
    return this.aggregators.get(network.id)!
  }

  async loadCachedBalance(wallet: Wallet, network: Network): Promise<AggregatedBalance | null> {
    if (wallet.type !== network.type) {
      return null
    }

    return await this.getAggregator(network).loadCachedBalance(wallet)
  }

  async getBalance(
    wallet: Wallet,
    network: Network,
    isManualRefresh: boolean = false,
  ): Promise<AggregatedBalance> {
    if (wallet.type !== network.type) {
      throw new Error(`Wallet type ${wallet.type} incompatible with network type ${network.type}`)
    }

    return await this.getAggregator(network).fetchBalance(wallet, isManualRefresh)
  }

  async updateBlockchainOnly(wallet: Wallet, network: Network): Promise<AggregatedBalance> {
    if (wallet.type !== network.type) {
      throw new Error(`Wallet type ${wallet.type} incompatible with network type ${network.type}`)
    }

    return await this.getAggregator(network).fetchBalance(wallet, true)
  }

  async updatePricesOnly(wallet: Wallet, network: Network): Promise<AggregatedBalance | null> {
    if (wallet.type !== network.type) {
      throw new Error(`Wallet type ${wallet.type} incompatible with network type ${network.type}`)
    }

    return await this.getAggregator(network).updatePricesOnly(wallet)
  }

  async getMultiWalletBalances(
    wallets: Wallet[],
    networks: Network[],
    isManualRefresh: boolean = false,
  ): Promise<AggregatedBalance[]> {
    const balances: AggregatedBalance[] = []

    for (const wallet of wallets) {
      for (const network of networks) {
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
        }
      }
    }

    return balances
  }

  async addToken(
    wallet: Wallet,
    network: Network,
    tokenAddress: string,
    symbol: string,
    name: string,
    decimals: number,
  ): Promise<void> {
    await this.getAggregator(network).addToken(wallet, tokenAddress, symbol, name, decimals)
  }

  async removeToken(wallet: Wallet, network: Network, tokenAddress: string): Promise<void> {
    await this.getAggregator(network).removeToken(wallet, tokenAddress)
  }

  async clearCache(wallet: Wallet, network: Network): Promise<void> {
    await this.getAggregator(network).clearCache(wallet)
  }

  async clearAllCaches(): Promise<void> {
    this.aggregators.clear()
  }

  validateAddress(address: string, _walletType: 'EVM' | 'SVM'): boolean {
    return isValidAddress(address)
  }

  async sendTransaction(
    _wallet: Wallet,
    _network: Network,
    _to: string,
    _amount: string,
    _password: string,
  ): Promise<string> {
    throw new Error('Transaction sending not yet implemented')
  }

  async sendToken(
    _wallet: Wallet,
    _network: Network,
    _tokenAddress: string,
    _to: string,
    _amount: string,
    _decimals: number,
    _password: string,
  ): Promise<string> {
    throw new Error('Token sending not yet implemented')
  }

  async estimateTransactionFee(
    wallet: Wallet,
    _network: Network,
    _to: string,
    _amount: string,
  ): Promise<string> {
    if (wallet.type === 'EVM') {
      return '0.001'
    } else if (wallet.type === 'SVM') {
      return '0.000005'
    }
    return '0'
  }

  async getTransactionHistory(_wallet: Wallet, _network: Network): Promise<Transaction[]> {
    return []
  }
}

export const blockchainService = new BlockchainService()