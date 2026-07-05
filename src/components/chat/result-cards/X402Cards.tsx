/**
 * Code by Xipzer
 *
 * x402 micropayment result cards: X402Card (status, payments modes).
 */

import { CreditCard } from 'lucide-react'
import { formatUSD, formatTokenPrice } from '../../../utils/formatters'
import { useCardTheme, CardShell, StatCell } from './shared'

export function X402Card({ data, action }: { data: any; action: 'status' | 'payments' }) {
  const { card } = useCardTheme()

  if (action === 'status') {
    return (
      <CardShell icon={CreditCard} title="x402 Payment Status">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${data.enabled ? 'bg-green-500' : 'bg-gray-400'}`} />
            <span className="text-xs sm:text-base text-text-primary font-medium">{data.enabled ? 'Enabled' : 'Disabled'}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
            <StatCell label="Daily Spent" value={`${formatUSD(Number(data.dailySpent || 0))} / ${formatUSD(Number(data.dailyBudget || 0))}`} />
            <StatCell label="Lifetime" value={formatUSD(Number(data.totalLifetimeSpent || 0))} />
            <StatCell label="Payments" value={String(data.totalPaymentCount || 0)} />
          </div>
        </div>
      </CardShell>
    )
  }
  return (
    <CardShell icon={CreditCard} title={`${data.count || data.payments?.length || 0} x402 Payments`}>
      {data.payments?.length > 0 ? (
        <div className={`${card.innerBg} border ${card.innerBorder} rounded-xl overflow-hidden`}>
          {data.payments.slice(0, 5).map((p: any, i: number) => (
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
