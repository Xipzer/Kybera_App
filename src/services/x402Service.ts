/**
 * Code by Xipzer
 */

import { useX402Store } from '../store/x402Store'
import {
  PaymentPayload,
  PaymentRequirement,
  X402Network,
  X402PaymentRecord,
} from '../types/x402'

class X402Service {
  // ─── State queries ──────────────────────────────────────────────────

  isEnabled(): boolean {
    const { config } = useX402Store.getState()
    return config.enabled && !!config.paymentWalletId
  }

  canAfford(amountUsd: number): boolean {
    const { config } = useX402Store.getState()
    const today = new Date().toISOString().split('T')[0]

    // Check per-request limit
    if (amountUsd > config.maxPerRequestUsd) {
      return false
    }

    // Check daily budget (auto-reset if new day)
    const dailySpent = config.lastResetDate === today ? config.dailySpentUsd : 0
    return dailySpent + amountUsd <= config.dailyBudgetUsd
  }

  getDailySpending(): { spent: number; budget: number; remaining: number } {
    const { config } = useX402Store.getState()
    const today = new Date().toISOString().split('T')[0]
    const spent = config.lastResetDate === today ? config.dailySpentUsd : 0

    return {
      spent,
      budget: config.dailyBudgetUsd,
      remaining: Math.max(0, config.dailyBudgetUsd - spent),
    }
  }

  getPaymentHistory(limit?: number): X402PaymentRecord[] {
    const { paymentHistory } = useX402Store.getState()
    return limit ? paymentHistory.slice(0, limit) : paymentHistory
  }

  resetDailyBudget(): void {
    useX402Store.getState().resetDaily()
  }

  approveDomain(domain: string): void {
    useX402Store.getState().addApprovedDomain(domain)
  }

  blockDomain(domain: string): void {
    useX402Store.getState().addBlockedDomain(domain)
  }

  // ─── 402 Response handling ──────────────────────────────────────────

  parsePaymentRequirement(response: Response): PaymentRequirement | null {
    try {
      const header = response.headers.get('x-payment') || response.headers.get('payment-required')
      if (!header) {
        console.warn('[x402] No payment requirement header found in 402 response')
        return null
      }

      const parsed = JSON.parse(header)

      // Validate required fields
      if (!parsed.scheme || !parsed.network || !parsed.maxAmountRequired || !parsed.payToAddress) {
        console.warn('[x402] Invalid payment requirement: missing required fields', parsed)
        return null
      }

      return {
        scheme: parsed.scheme,
        network: parsed.network as X402Network,
        maxAmountRequired: String(parsed.maxAmountRequired),
        resource: parsed.resource || response.url,
        description: parsed.description || 'Premium data access',
        mimeType: parsed.mimeType,
        payToAddress: parsed.payToAddress,
        tokenAddress: parsed.tokenAddress || '',
        tokenSymbol: parsed.tokenSymbol || 'USDC',
        tokenDecimals: parsed.tokenDecimals ?? 6,
        requiredDeadline: parsed.requiredDeadline,
        extra: parsed.extra,
      } satisfies PaymentRequirement
    } catch (err) {
      console.error('[x402] Failed to parse payment requirement:', err)
      return null
    }
  }

  async handlePaymentRequired(
    response: Response,
    originalRequest: Request,
  ): Promise<Response | null> {
    if (!this.isEnabled()) {
      console.warn('[x402] Payment required but x402 is not enabled')
      return null
    }

    const store = useX402Store.getState()
    store.setIsProcessingPayment(true)

    try {
      // 1. Parse the payment requirement
      const requirement = this.parsePaymentRequirement(response)
      if (!requirement) {
        return null
      }

      // 2. Extract domain and check domain permissions
      const domain = new URL(requirement.resource).hostname
      const { config } = store

      if (config.blockedDomains.includes(domain)) {
        console.warn(`[x402] Domain ${domain} is blocked`)
        this.recordPayment({
          resourceUrl: requirement.resource,
          domain,
          description: requirement.description,
          amountUsd: 0,
          amountRaw: requirement.maxAmountRequired,
          tokenSymbol: requirement.tokenSymbol,
          network: requirement.network,
          payToAddress: requirement.payToAddress,
          status: 'rejected',
          errorMessage: 'Domain is blocked',
        })
        return null
      }

      if (config.approvedDomains.length > 0 && !config.approvedDomains.includes(domain)) {
        console.warn(`[x402] Domain ${domain} is not in the approved list`)
        this.recordPayment({
          resourceUrl: requirement.resource,
          domain,
          description: requirement.description,
          amountUsd: 0,
          amountRaw: requirement.maxAmountRequired,
          tokenSymbol: requirement.tokenSymbol,
          network: requirement.network,
          payToAddress: requirement.payToAddress,
          status: 'rejected',
          errorMessage: 'Domain is not in the approved list',
        })
        return null
      }

      // 3. Convert raw amount to USD estimate (simplified: assume USDC at $1)
      const amountUsd = Number(requirement.maxAmountRequired) / 10 ** requirement.tokenDecimals

      // 4. Check spending limits
      if (!this.canAfford(amountUsd)) {
        console.warn(`[x402] Cannot afford $${amountUsd} — exceeds budget or per-request limit`)
        this.recordPayment({
          resourceUrl: requirement.resource,
          domain,
          description: requirement.description,
          amountUsd,
          amountRaw: requirement.maxAmountRequired,
          tokenSymbol: requirement.tokenSymbol,
          network: requirement.network,
          payToAddress: requirement.payToAddress,
          status: 'rejected',
          errorMessage: 'Exceeds spending limits',
        })
        return null
      }

      // 5. Sign the payment
      const paymentPayload = await this.signPayment(requirement)
      if (!paymentPayload) {
        this.recordPayment({
          resourceUrl: requirement.resource,
          domain,
          description: requirement.description,
          amountUsd,
          amountRaw: requirement.maxAmountRequired,
          tokenSymbol: requirement.tokenSymbol,
          network: requirement.network,
          payToAddress: requirement.payToAddress,
          status: 'failed',
          errorMessage: 'Payment signing not yet implemented',
        })
        return null
      }

      // 6. Resend the original request with the payment header
      const paidResponse = await fetch(originalRequest.url, {
        method: originalRequest.method,
        headers: {
          ...Object.fromEntries(originalRequest.headers.entries()),
          'X-PAYMENT': JSON.stringify(paymentPayload),
        },
        body: originalRequest.method !== 'GET' ? await originalRequest.clone().text() : undefined,
      })

      // 7. Record the successful payment
      this.recordPayment({
        resourceUrl: requirement.resource,
        domain,
        description: requirement.description,
        amountUsd,
        amountRaw: requirement.maxAmountRequired,
        tokenSymbol: requirement.tokenSymbol,
        network: requirement.network,
        payToAddress: requirement.payToAddress,
        status: paidResponse.ok ? 'completed' : 'failed',
        errorMessage: paidResponse.ok ? undefined : `Server returned ${paidResponse.status}`,
      })

      return paidResponse.ok ? paidResponse : null
    } catch (err) {
      console.error('[x402] handlePaymentRequired error:', err)
      return null
    } finally {
      useX402Store.getState().setIsProcessingPayment(false)
    }
  }

  // ─── Payment signing (stub) ─────────────────────────────────────────

  private async signPayment(requirement: PaymentRequirement): Promise<PaymentPayload | null> {
    // TODO: Implement EIP-3009 signing for EVM (USDC transferWithAuthorization)
    // TODO: Implement Solana transfer authorization
    // For now, return null indicating payment signing is not yet implemented
    console.warn('[x402] Payment signing not yet implemented')
    return null
  }

  // ─── Payment recording ──────────────────────────────────────────────

  recordPayment(record: Omit<X402PaymentRecord, 'id' | 'timestamp'>): void {
    const fullRecord: X402PaymentRecord = {
      ...record,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    }

    useX402Store.getState().recordPayment(fullRecord)
    console.log(
      `[x402] Payment recorded: ${record.status} — $${record.amountUsd} to ${record.domain}`,
    )
  }
}

export const x402Service = new X402Service()
