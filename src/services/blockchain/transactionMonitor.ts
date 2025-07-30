import { ethers, JsonRpcProvider, TransactionReceipt } from 'ethers'
import { Transaction, Network } from '../../types'
import { db } from '../storage/database'

export interface PendingTransaction {
  hash: string
  from: string
  to: string
  value: string
  network: Network
  timestamp: Date
  nonce?: number
}

export class TransactionMonitor {
  private providers: Map<string, JsonRpcProvider> = new Map()
  private listeners: Map<string, (tx: Transaction) => void> = new Map()
  private pendingTransactions: Map<string, PendingTransaction> = new Map()
  private monitoringIntervals: Map<string, NodeJS.Timeout> = new Map()
  
  /**
   * Add a transaction listener
   */
  addListener(id: string, callback: (tx: Transaction) => void): void {
    this.listeners.set(id, callback)
  }
  
  /**
   * Remove a transaction listener
   */
  removeListener(id: string): void {
    this.listeners.delete(id)
  }
  
  /**
   * Notify all listeners of a transaction update
   */
  private notifyListeners(tx: Transaction): void {
    this.listeners.forEach(callback => {
      try {
        callback(tx)
      } catch (error) {
        console.error('Error in transaction listener:', error)
      }
    })
  }
  
  /**
   * Get or create provider for a network
   */
  private getProvider(network: Network): JsonRpcProvider {
    if (!this.providers.has(network.id)) {
      this.providers.set(network.id, new JsonRpcProvider(network.rpcUrl))
    }
    return this.providers.get(network.id)!
  }
  
  /**
   * Add a pending transaction to monitor
   */
  async addPendingTransaction(
    hash: string,
    from: string,
    to: string,
    value: string,
    network: Network
  ): Promise<void> {
    const pendingTx: PendingTransaction = {
      hash,
      from,
      to,
      value,
      network,
      timestamp: new Date()
    }
    
    this.pendingTransactions.set(hash, pendingTx)
    
    // Store in database
    await db.pendingTransactions.put({
      id: hash,
      hash,
      from,
      to,
      value,
      networkId: network.id,
      status: 'pending',
      timestamp: Date.now()
    })
    
    // Notify listeners of pending transaction
    this.notifyListeners({
      hash,
      from,
      to,
      value,
      status: 'pending',
      timestamp: new Date(),
      network: network.name
    })
    
    // Start monitoring this transaction
    this.monitorTransaction(hash, network)
  }
  
  /**
   * Monitor a specific transaction for confirmation
   */
  private async monitorTransaction(hash: string, network: Network): Promise<void> {
    const provider = this.getProvider(network)
    const maxAttempts = 60 // 5 minutes with 5 second intervals
    let attempts = 0
    
    const checkTransaction = async () => {
      try {
        const receipt = await provider.getTransactionReceipt(hash)
        
        if (receipt) {
          // Transaction is mined
          const status = receipt.status === 1 ? 'confirmed' : 'failed'
          
          // Update database
          const dbTx = await db.pendingTransactions.get(hash)
          if (dbTx) {
            await db.pendingTransactions.update(hash, {
              status,
              blockNumber: receipt.blockNumber,
              gasUsed: receipt.gasUsed.toString()
            })
          }
          
          // Get the pending transaction data
          const pendingTx = this.pendingTransactions.get(hash)
          if (pendingTx) {
            // Notify listeners
            this.notifyListeners({
              hash,
              from: pendingTx.from,
              to: pendingTx.to,
              value: pendingTx.value,
              status,
              timestamp: pendingTx.timestamp,
              network: network.name
            })
            
            // Clean up
            this.pendingTransactions.delete(hash)
          }
          
          // Stop monitoring
          const interval = this.monitoringIntervals.get(hash)
          if (interval) {
            clearInterval(interval)
            this.monitoringIntervals.delete(hash)
          }
        } else {
          // Still pending
          attempts++
          
          if (attempts >= maxAttempts) {
            // Transaction is taking too long, mark as potentially stuck
            console.warn(`Transaction ${hash} is taking too long to confirm`)
            
            // Stop monitoring
            const interval = this.monitoringIntervals.get(hash)
            if (interval) {
              clearInterval(interval)
              this.monitoringIntervals.delete(hash)
            }
          }
        }
      } catch (error) {
        console.error(`Error monitoring transaction ${hash}:`, error)
        
        // If we get consistent errors, stop monitoring
        attempts++
        if (attempts >= 5) {
          const interval = this.monitoringIntervals.get(hash)
          if (interval) {
            clearInterval(interval)
            this.monitoringIntervals.delete(hash)
          }
        }
      }
    }
    
    // Check immediately
    await checkTransaction()
    
    // Then check every 5 seconds
    const interval = setInterval(checkTransaction, 5000)
    this.monitoringIntervals.set(hash, interval)
  }
  
  /**
   * Get all pending transactions
   */
  async getPendingTransactions(walletAddress?: string): Promise<Transaction[]> {
    const pendingTxs = await db.pendingTransactions
      .where('status')
      .equals('pending')
      .toArray()
    
    // Filter by wallet if provided
    const filtered = walletAddress
      ? pendingTxs.filter(tx => tx.from.toLowerCase() === walletAddress.toLowerCase())
      : pendingTxs
    
    return filtered.map(tx => ({
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      value: tx.value,
      status: 'pending' as const,
      timestamp: new Date(tx.timestamp),
      network: tx.networkId
    }))
  }
  
  /**
   * Resume monitoring for pending transactions on startup
   */
  async resumeMonitoring(): Promise<void> {
    const pendingTxs = await db.pendingTransactions
      .where('status')
      .equals('pending')
      .toArray()
    
    // Resume monitoring for each pending transaction
    for (const tx of pendingTxs) {
      const network = ALL_NETWORKS.find(n => n.id === tx.networkId)
      if (network) {
        this.pendingTransactions.set(tx.hash, {
          hash: tx.hash,
          from: tx.from,
          to: tx.to,
          value: tx.value,
          network,
          timestamp: new Date(tx.timestamp)
        })
        
        this.monitorTransaction(tx.hash, network)
      }
    }
  }
  
  /**
   * Clear old pending transactions (older than 24 hours)
   */
  async clearOldPendingTransactions(): Promise<void> {
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000)
    
    const oldTxs = await db.pendingTransactions
      .where('timestamp')
      .below(oneDayAgo)
      .and(tx => tx.status === 'pending')
      .toArray()
    
    for (const tx of oldTxs) {
      await db.pendingTransactions.delete(tx.id)
    }
  }
  
  /**
   * Stop all monitoring
   */
  stopAllMonitoring(): void {
    // Clear all intervals
    this.monitoringIntervals.forEach(interval => clearInterval(interval))
    this.monitoringIntervals.clear()
    
    // Clear providers
    this.providers.clear()
    
    // Clear pending transactions
    this.pendingTransactions.clear()
  }
}

// Export singleton instance
export const transactionMonitor = new TransactionMonitor()

// Import networks
import { ALL_NETWORKS } from '../../utils/networks'