import { Transaction } from '../../types'
import { db } from '../storage/database'
import { Network } from '../../utils/networks'

export class TransactionMonitor {
  private pendingTransactions: Map<string, NodeJS.Timeout> = new Map()
  private readonly CHECK_INTERVAL = 5000 // 5 seconds
  private readonly MAX_CHECKS = 60 // 5 minutes max

  /**
   * Record a new transaction sent through the platform
   */
  async recordTransaction(
    hash: string,
    from: string,
    to: string,
    value: string,
    network: Network,
    tokenInfo?: {
      address: string
      symbol: string
      decimals: number
    }
  ): Promise<void> {
    const transaction: Transaction = {
      hash,
      from: from.toLowerCase(),
      to: to.toLowerCase(),
      value,
      status: 'pending',
      timestamp: new Date(),
      network: network.id,
      tokenAddress: tokenInfo?.address,
      tokenSymbol: tokenInfo?.symbol,
      tokenDecimals: tokenInfo?.decimals
    }

    // Store in database
    await db.transactions.add({
      ...transaction,
      timestamp: transaction.timestamp.getTime()
    })

    // Start monitoring for confirmation
    this.monitorTransaction(hash, network)
  }

  /**
   * Monitor a transaction for confirmation
   */
  private monitorTransaction(hash: string, network: Network): void {
    let checkCount = 0

    const checkStatus = async () => {
      checkCount++
      
      try {
        const status = await this.checkTransactionStatus(hash, network)
        
        if (status.confirmed || status.failed || checkCount >= this.MAX_CHECKS) {
          // Update transaction status
          await db.transactions.where('hash').equals(hash).modify({
            status: status.failed ? 'failed' : status.confirmed ? 'confirmed' : 'failed',
            gasUsed: status.gasUsed,
            blockNumber: status.blockNumber
          })
          
          // Stop monitoring
          const interval = this.pendingTransactions.get(hash)
          if (interval) {
            clearInterval(interval)
            this.pendingTransactions.delete(hash)
          }
        }
      } catch (error) {
        console.error('Error checking transaction status:', error)
        // Continue monitoring unless we've exceeded max checks
        if (checkCount >= this.MAX_CHECKS) {
          const interval = this.pendingTransactions.get(hash)
          if (interval) {
            clearInterval(interval)
            this.pendingTransactions.delete(hash)
          }
        }
      }
    }

    // Initial check
    checkStatus()

    // Set up interval for subsequent checks
    const interval = setInterval(checkStatus, this.CHECK_INTERVAL)
    this.pendingTransactions.set(hash, interval)
  }

  /**
   * Check transaction status on blockchain
   */
  private async checkTransactionStatus(
    hash: string,
    network: Network
  ): Promise<{
    confirmed: boolean
    failed: boolean
    gasUsed?: string
    blockNumber?: number
  }> {
    if (network.type === 'EVM') {
      return this.checkEVMTransactionStatus(hash, network.rpcUrl)
    } else {
      return this.checkSolanaTransactionStatus(hash, network.rpcUrl)
    }
  }

  /**
   * Check EVM transaction status
   */
  private async checkEVMTransactionStatus(
    hash: string,
    rpcUrl: string
  ): Promise<{
    confirmed: boolean
    failed: boolean
    gasUsed?: string
    blockNumber?: number
  }> {
    try {
      // Get transaction receipt
      const receiptResponse = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getTransactionReceipt',
          params: [hash],
          id: 1
        })
      })

      const receiptData = await receiptResponse.json()
      const receipt = receiptData.result

      if (!receipt) {
        // Transaction is still pending
        return { confirmed: false, failed: false }
      }

      // Check if transaction failed (status 0x0) or succeeded (status 0x1)
      const failed = receipt.status === '0x0'
      
      return {
        confirmed: true,
        failed,
        gasUsed: receipt.gasUsed,
        blockNumber: parseInt(receipt.blockNumber, 16)
      }
    } catch (error) {
      console.error('Error checking EVM transaction:', error)
      return { confirmed: false, failed: false }
    }
  }

  /**
   * Check Solana transaction status
   */
  private async checkSolanaTransactionStatus(
    hash: string,
    rpcUrl: string
  ): Promise<{
    confirmed: boolean
    failed: boolean
    gasUsed?: string
    blockNumber?: number
  }> {
    try {
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'getTransaction',
          params: [
            hash,
            {
              encoding: 'json',
              commitment: 'confirmed',
              maxSupportedTransactionVersion: 0
            }
          ],
          id: 1
        })
      })

      const data = await response.json()
      const transaction = data.result

      if (!transaction) {
        // Transaction not found yet
        return { confirmed: false, failed: false }
      }

      // Check if transaction has error
      const failed = transaction.meta?.err !== null
      
      return {
        confirmed: true,
        failed,
        gasUsed: transaction.meta?.fee?.toString(),
        blockNumber: transaction.slot
      }
    } catch (error) {
      console.error('Error checking Solana transaction:', error)
      return { confirmed: false, failed: false }
    }
  }

  /**
   * Get transaction history for a wallet
   */
  async getTransactionHistory(
    walletAddress: string,
    network?: Network
  ): Promise<Transaction[]> {
    let query = db.transactions.where('from').equals(walletAddress.toLowerCase())

    if (network) {
      // If network is specified, filter by network
      const transactions = await query.toArray()
      return transactions
        .filter(tx => tx.network === network.id)
        .sort((a, b) => b.timestamp - a.timestamp)
        .map(tx => ({
          ...tx,
          timestamp: new Date(tx.timestamp)
        }))
    } else {
      // Return all transactions for the wallet
      const sentTransactions = await query.toArray()
      const receivedTransactions = await db.transactions
        .where('to')
        .equals(walletAddress.toLowerCase())
        .toArray()
      
      // Combine and deduplicate
      const allTransactions = [...sentTransactions, ...receivedTransactions]
      const uniqueTransactions = Array.from(
        new Map(allTransactions.map(tx => [tx.hash, tx])).values()
      )
      
      return uniqueTransactions
        .sort((a, b) => b.timestamp - a.timestamp)
        .map(tx => ({
          ...tx,
          timestamp: new Date(tx.timestamp)
        }))
    }
  }

  /**
   * Stop monitoring all transactions
   */
  stopAllMonitoring(): void {
    for (const interval of this.pendingTransactions.values()) {
      clearInterval(interval)
    }
    this.pendingTransactions.clear()
  }
}

// Export singleton instance
export const transactionMonitor = new TransactionMonitor()