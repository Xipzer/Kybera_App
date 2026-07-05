/**
 * Code by Xipzer
 */

export type PaymentScheme = 'exact' | 'upto'

export type X402Network = 'base' | 'base-sepolia' | 'solana'

export interface PaymentRequirement {
  scheme: PaymentScheme
  network: X402Network
  maxAmountRequired: string
  resource: string
  description: string
  mimeType?: string
  payToAddress: string
  tokenAddress: string
  tokenSymbol: string
  tokenDecimals: number
  requiredDeadline?: string
  extra?: Record<string, unknown>
}

export interface PaymentPayload {
  x402Version: number
  scheme: PaymentScheme
  network: X402Network
  payload: {
    signature: string
    authorization: Record<string, unknown>
  }
}

export interface X402SpendingConfig {
  enabled: boolean
  maxPerRequestUsd: number
  dailyBudgetUsd: number
  dailySpentUsd: number
  lastResetDate: string
  approvedDomains: string[]
  blockedDomains: string[]
  paymentWalletId?: string
  totalLifetimeSpentUsd: number
  totalPaymentCount: number
}

export interface X402PaymentRecord {
  id: string
  resourceUrl: string
  domain: string
  description: string
  amountUsd: number
  amountRaw: string
  tokenSymbol: string
  network: X402Network
  payToAddress: string
  txHash?: string
  researchId?: string
  timestamp: number
  status: 'pending' | 'completed' | 'failed' | 'rejected'
  errorMessage?: string
}
