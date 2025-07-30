import { EVMWalletService } from './evmWallet'
import { SVMWalletService } from './svmWallet'
import { Wallet, Network } from '../../types'

export interface SimpleBlockchainBalance {
  native: string
  tokens: {
    address: string
    symbol: string
    name: string
    decimals: number
    balance: string
  }[]
}

// Development mode detection
const isDevelopment = import.meta.env.DEV

export class SimpleBlockchainService {
  private static instance: SimpleBlockchainService
  private mountCount = 0
  private cleanupTimeouts: Map<string, NodeJS.Timeout> = new Map()
  
  static getInstance(): SimpleBlockchainService {
    if (!SimpleBlockchainService.instance) {
      SimpleBlockchainService.instance = new SimpleBlockchainService()
    }
    return SimpleBlockchainService.instance
  }
  
  /**
   * Track component mounts in development
   */
  trackMount(): number {
    this.mountCount++
    return this.mountCount
  }
  
  /**
   * Track component unmounts with delayed cleanup
   */
  trackUnmount(mountId: number, cleanupFn: () => void): void {
    if (!isDevelopment) {
      // In production, cleanup immediately
      cleanupFn()
      return
    }
    
    // In development, delay cleanup to handle StrictMode double mounting
    const timeoutId = setTimeout(() => {
      // Only cleanup if this was the last mount
      if (mountId === this.mountCount) {
        cleanupFn()
      }
      this.cleanupTimeouts.delete(`mount-${mountId}`)
    }, 100) // Small delay to handle StrictMode cleanup/remount cycle
    
    // Store timeout for potential cancellation
    const key = `mount-${mountId}`
    const existingTimeout = this.cleanupTimeouts.get(key)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }
    this.cleanupTimeouts.set(key, timeoutId)
  }
  
  /**
   * Get balance for a wallet on a specific network
   */
  async getBalance(wallet: Wallet, network: Network): Promise<SimpleBlockchainBalance> {
    // Validate network type matches wallet type
    if (wallet.type !== network.type) {
      throw new Error(
        `Network type mismatch: wallet is ${wallet.type} but network is ${network.type}`
      )
    }

    let nativeBalance: string

    if (wallet.type === 'EVM') {
      nativeBalance = await EVMWalletService.getBalance(wallet.address, network.rpcUrl)
    } else {
      // Solana
      nativeBalance = await SVMWalletService.getBalance(wallet.address, network.rpcUrl)
    }

    return {
      native: nativeBalance,
      tokens: [] // Simple service doesn't fetch tokens
    }
  }
  
  /**
   * Clear all pending cleanups
   */
  clearPendingCleanups(): void {
    for (const timeout of this.cleanupTimeouts.values()) {
      clearTimeout(timeout)
    }
    this.cleanupTimeouts.clear()
  }
}

// Export singleton instance
export const simpleBlockchainService = SimpleBlockchainService.getInstance()