/**
 * Code by Xipzer
 */

/** Payment scheme as defined by x402 spec */
export type PaymentScheme = 'exact' | 'upto'

/** Supported networks for x402 payments */
export type X402Network = 'base' | 'base-sepolia' | 'solana'

/** Payment requirement returned by a 402 response */
export interface PaymentRequirement {
  scheme: PaymentScheme
  network: X402Network
  maxAmountRequired: string // in smallest unit (e.g., wei, lamports)
  resource: string // URL being accessed
  description: string
  mimeType?: string
  // Payment token info
  payToAddress: string
  tokenAddress: string // USDC contract address
  tokenSymbol: string
  tokenDecimals: number
  // Optional
  requiredDeadline?: string // ISO timestamp
  extra?: Record<string, unknown>
}

/** Payment payload sent back to the server */
export interface PaymentPayload {
  x402Version: number
  scheme: PaymentScheme
  network: X402Network
  payload: {
    signature: string
    authorization: any // EIP-3009 or Solana transfer authorization
  }
}

/** Configuration for x402 spending */
export interface X402SpendingConfig {
  enabled: boolean
  // Per-request limits
  maxPerRequestUsd: number // max USD per single payment (default $0.10)
  // Daily limits
  dailyBudgetUsd: number // max daily spend (default $5.00)
  dailySpentUsd: number
  lastResetDate: string
  // Approved domains — only pay these services
  approvedDomains: string[]
  // Block list
  blockedDomains: string[]
  // Wallet to pay from
  paymentWalletId?: string
  // Audit trail
  totalLifetimeSpentUsd: number
  totalPaymentCount: number
}

/** Record of an x402 payment */
export interface X402PaymentRecord {
  id: string
  // What was paid for
  resourceUrl: string
  domain: string
  description: string
  // Payment details
  amountUsd: number
  amountRaw: string
  tokenSymbol: string
  network: X402Network
  payToAddress: string
  // Transaction
  txHash?: string
  // Context
  researchId?: string // if payment was during a research session
  timestamp: number
  status: 'pending' | 'completed' | 'failed' | 'rejected'
  errorMessage?: string
}
