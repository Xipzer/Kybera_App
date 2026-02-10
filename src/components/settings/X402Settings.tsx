/**
 * Code by Xipzer
 */

import { useState } from 'react'
import {
  Plus,
  X,
  DollarSign,
  Globe,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
} from 'lucide-react'
import { useTheme } from '../../hooks/useTheme'
import { useX402Store } from '../../store/x402Store'
import { useWalletStore } from '../../store/walletStore'
import { ModernToggle, ModernButton } from '../ModernDialog'

export function X402Settings() {
  const { theme: themeConfig } = useTheme()
  const [newDomain, setNewDomain] = useState('')

  const config = useX402Store((s) => s.config)
  const paymentHistory = useX402Store((s) => s.paymentHistory)
  const setEnabled = useX402Store((s) => s.setEnabled)
  const setMaxPerRequest = useX402Store((s) => s.setMaxPerRequest)
  const setDailyBudget = useX402Store((s) => s.setDailyBudget)
  const setPaymentWallet = useX402Store((s) => s.setPaymentWallet)
  const addApprovedDomain = useX402Store((s) => s.addApprovedDomain)
  const removeApprovedDomain = useX402Store((s) => s.removeApprovedDomain)
  const getSpendingSummary = useX402Store((s) => s.getSpendingSummary)

  const wallets = useWalletStore((s) => s.wallets)
  const summary = getSpendingSummary()
  const spendingPercent = summary.todayBudget > 0
    ? Math.min(100, (summary.todaySpent / summary.todayBudget) * 100)
    : 0

  const handleAddDomain = () => {
    const trimmed = newDomain.trim().toLowerCase()
    if (!trimmed) return
    addApprovedDomain(trimmed)
    setNewDomain('')
  }

  const statusIcon = (status: string) => {
    if (status === 'completed') return <CheckCircle className="w-3.5 h-3.5 text-green-500" />
    if (status === 'failed' || status === 'rejected') return <XCircle className="w-3.5 h-3.5 text-red-500" />
    if (status === 'pending') return <Loader2 className="w-3.5 h-3.5 text-yellow-500 animate-spin" />
    return <Clock className="w-3.5 h-3.5 text-text-tertiary" />
  }

  const barColor = spendingPercent >= 90
    ? 'bg-red-500'
    : spendingPercent >= 70
      ? 'bg-orange-500'
      : 'bg-green-500'

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-text-primary mb-4">x402 Auto-Payments</h3>

        <div className="space-y-4">
          <ModernToggle
            checked={config.enabled}
            onChange={setEnabled}
            label="Enable x402 payments"
            description="Automatically pay for 402 Payment Required resources during research"
          />

          <div>
            <h4 className="text-sm font-medium text-text-primary mb-4">Payment Wallet</h4>
            <select
              value={config.paymentWalletId || ''}
              onChange={(e) => setPaymentWallet(e.target.value)}
              className={themeConfig.styles.input}
              style={{ fontSize: '16px' }}
            >
              <option value="">Select a wallet...</option>
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.address.slice(0, 6)}...{w.address.slice(-4)})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="border-t border-border-subtle pt-6">
        <h3 className="text-lg font-medium text-text-primary mb-1">Spending Limits</h3>
        <p className="text-xs text-text-tertiary mb-4">
          Control how much can be spent automatically per request and per day.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Daily Budget (USD)
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
              <input
                type="number"
                value={config.dailyBudgetUsd}
                onChange={(e) => setDailyBudget(Math.max(0, parseFloat(e.target.value) || 0))}
                min="0"
                step="0.50"
                className={`${themeConfig.styles.input} pl-9`}
                style={{ fontSize: '16px' }}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Per-Request Limit (USD)
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
              <input
                type="number"
                value={config.maxPerRequestUsd}
                onChange={(e) => setMaxPerRequest(Math.max(0, parseFloat(e.target.value) || 0))}
                min="0"
                step="0.01"
                className={`${themeConfig.styles.input} pl-9`}
                style={{ fontSize: '16px' }}
              />
            </div>
          </div>

          <div className="mt-4 p-4 bg-surface-elevated rounded-lg border border-border-subtle">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-text-secondary">
                ${summary.todaySpent.toFixed(2)} / ${summary.todayBudget.toFixed(2)}
              </span>
              <span className="text-text-tertiary">
                {spendingPercent.toFixed(0)}%
              </span>
            </div>
            <div className="w-full h-2.5 bg-surface-base rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                style={{ width: `${spendingPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-text-tertiary mt-2">
              <span>{summary.paymentCount} payments total</span>
              <span>${summary.lifetimeSpent.toFixed(2)} lifetime</span>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-border-subtle pt-6">
        <h3 className="text-lg font-medium text-text-primary mb-1">Approved Domains</h3>
        <p className="text-xs text-text-tertiary mb-4">
          Only these domains can trigger auto-payments. Leave empty to allow all.
        </p>

        <div className="flex items-center gap-2 mb-3">
          <input
            type="text"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddDomain()}
            placeholder="api.example.com"
            className={themeConfig.styles.input}
            style={{ fontSize: '16px' }}
          />
          <ModernButton
            variant="secondary"
            onClick={handleAddDomain}
            disabled={!newDomain.trim()}
            icon={<Plus className="w-4 h-4" />}
          >
            Add
          </ModernButton>
        </div>

        {config.approvedDomains.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {config.approvedDomains.map((domain) => (
              <div
                key={domain}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-surface-elevated border border-border-subtle rounded-full text-xs text-text-secondary"
              >
                <Globe className="w-3 h-3 text-text-tertiary" />
                {domain}
                <button
                  onClick={() => removeApprovedDomain(domain)}
                  className="p-0.5 hover:bg-surface-hover rounded-full transition-colors"
                >
                  <X className="w-3 h-3 text-text-tertiary hover:text-red-400" />
                </button>
              </div>
            ))}
          </div>
        )}

        {config.approvedDomains.length === 0 && (
          <div className="text-xs text-text-tertiary italic py-2">
            No approved domains — all domains are allowed
          </div>
        )}
      </div>

      <div className="border-t border-border-subtle pt-6">
        <h3 className="text-lg font-medium text-text-primary mb-4">Recent Payments</h3>
        {paymentHistory.length === 0 ? (
          <div className="text-sm text-text-tertiary italic py-4 text-center">
            No payments yet
          </div>
        ) : (
          <div className="rounded-xl border border-border-subtle overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-elevated">
                  <th className="px-3 py-2 text-left text-xs font-medium text-text-tertiary uppercase tracking-wide">Date</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-text-tertiary uppercase tracking-wide">Domain</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-text-tertiary uppercase tracking-wide">Amount</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-text-tertiary uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody>
                {paymentHistory.slice(0, 10).map((payment) => (
                  <tr key={payment.id} className="border-t border-border-subtle">
                    <td className="px-3 py-2 text-text-secondary text-xs whitespace-nowrap">
                      {new Date(payment.timestamp).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2 text-text-primary text-xs truncate max-w-[140px]">
                      {payment.domain}
                    </td>
                    <td className="px-3 py-2 text-right text-text-primary text-xs font-medium">
                      ${payment.amountUsd.toFixed(4)}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-center gap-1">
                        {statusIcon(payment.status)}
                        <span className={`text-xs capitalize ${
                          payment.status === 'completed' ? 'text-green-500'
                            : payment.status === 'failed' || payment.status === 'rejected' ? 'text-red-500'
                              : 'text-yellow-500'
                        }`}>
                          {payment.status}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
