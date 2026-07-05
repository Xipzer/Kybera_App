/**
 * Code by Xipzer
 *
 * x402 micropayment result cards: X402Card (status, payments modes).
 */

import { CreditCard } from 'lucide-react'
import { formatUSD, formatTokenPrice } from '../../../utils/formatters'
import { useCardTheme, CardShell, StatCell } from './shared'

interface X402Payment {
  id: string
  domain?: string
  amountUsd?: number
}

interface X402Data {
  enabled?: boolean
  dailySpent?: number
  dailyBudget?: number
  totalLifetimeSpent?: number
  totalPaymentCount?: number
  count?: number
  payments?: X402Payment[]
}

export function X402Card({ data, action }: { data: Record<string, unknown>; action: 'status' | 'payments' }) {
  const { card } = useCardTheme()
  const d = data as X402Data

  if (action === 'status') {
    return (
      <CardShell icon={CreditCard} title="x402 Payment Status">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${d.enabled ? 'bg-green-500' : 'bg-gray-400'}`} />
            <span className="text-xs sm:text-base text-text-primary font-medium">{d.enabled ? 'Enabled' : 'Disabled'}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
            <StatCell label="Daily Spent" value={`${formatUSD(Number(d.dailySpent || 0))} / ${formatUSD(Number(d.dailyBudget || 0))}`} />
            <StatCell label="Lifetime" value={formatUSD(Number(d.totalLifetimeSpent || 0))} />
            <StatCell label="Payments" value={String(d.totalPaymentCount || 0)} />
          </div>
        </div>
      </CardShell>
    )
  }
  return (
    <CardShell icon={CreditCard} title={`${d.count || d.payments?.length || 0} x402 Payments`}>
      {d.payments && d.payments.length > 0 ? (
        <div className={`${card.innerBg} border ${card.innerBorder} rounded-xl overflow-hidden`}>
          {d.payments.slice(0, 5).map((p, i) => (
            <div key={p.id} className={`flex items-center justify-between px-3 py-2 sm:px-4 sm:py-2.5 ${i > 0 ? `border-t ${card.innerBorder}` : ''}`}>
              <span className="text-xs sm:text-base text-text-primary">{p.domain}</span>
              <span className="text-2xs sm:text-xs text-text-tertiary">{formatTokenPrice(Number(p.amountUsd || 0))}</span>
            </div>
          ))}
        </div>
      ) : (
        <span className="text-xs sm:text-sm text-text-tertiary">No payments recorded</span>
      )}
    </CardShell>
  )
}
