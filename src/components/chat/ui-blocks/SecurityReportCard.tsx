/**
 * Code by Xipzer
 *
 * Security Report UI Block — token security findings from GoPlus or similar
 * providers, with risk score, flags, and summary.
 */

import { Shield, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import { useTheme } from '../../../hooks/useTheme'
import type { SecurityReportBlock } from '../../../types/research'

const SEVERITY_ICON: Record<string, { Icon: typeof Shield; color: string }> = {
  safe: { Icon: CheckCircle2, color: 'text-green-400' },
  caution: { Icon: AlertTriangle, color: 'text-yellow-400' },
  danger: { Icon: XCircle, color: 'text-red-400' },
}

function getRiskColor(score: number): { color: string; bg: string; label: string } {
  if (score <= 30) return { color: 'text-green-400', bg: 'bg-green-500/20', label: 'LOW RISK' }
  if (score <= 60) return { color: 'text-yellow-400', bg: 'bg-yellow-500/20', label: 'MEDIUM RISK' }
  if (score <= 80) return { color: 'text-orange-400', bg: 'bg-orange-500/20', label: 'HIGH RISK' }
  return { color: 'text-red-400', bg: 'bg-red-500/20', label: 'CRITICAL' }
}

function truncateAddress(addr: string): string {
  if (addr.length <= 12) return addr
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

export function SecurityReportCard({ block }: { block: SecurityReportBlock }) {
  const { theme } = useTheme()
  const d = block.data
  const sendGradient = theme.styles.chatInterface.sendGradient
  const risk = getRiskColor(d.riskScore)

  return (
    <div className="bg-surface-elevated/30 border border-border-subtle rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-3 px-3 py-2 sm:px-4 sm:py-3 border-b border-border-subtle/50">
        <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-r ${sendGradient} flex items-center justify-center flex-shrink-0`}>
          <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
        </div>
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm sm:text-lg font-semibold text-text-primary">Security Report</span>
          <span className="text-xs text-text-tertiary">${d.symbol}</span>
        </div>
        <div className={`ml-auto px-2 py-0.5 rounded-full ${risk.bg}`}>
          <span className={`text-[10px] font-bold ${risk.color}`}>{risk.label}</span>
        </div>
      </div>

      <div className="p-3 sm:p-4 space-y-3">
        {/* Risk score + honeypot/malicious badges */}
        <div className="flex items-center gap-3">
          <div className="bg-surface-elevated/50 border border-border-subtle/50 rounded-xl p-2.5 sm:p-3 flex-1 text-center">
            <div className="text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wide mb-0.5">Risk Score</div>
            <div className={`text-lg sm:text-2xl font-bold ${risk.color}`}>{d.riskScore}/100</div>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${d.isHoneypot ? 'bg-red-500/20' : 'bg-green-500/20'}`}>
              {d.isHoneypot ? (
                <XCircle className="w-3 h-3 text-red-400" />
              ) : (
                <CheckCircle2 className="w-3 h-3 text-green-400" />
              )}
              <span className={`text-[10px] font-bold ${d.isHoneypot ? 'text-red-400' : 'text-green-400'}`}>
                {d.isHoneypot ? 'HONEYPOT' : 'NOT HONEYPOT'}
              </span>
            </div>
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${d.isMalicious ? 'bg-red-500/20' : 'bg-green-500/20'}`}>
              {d.isMalicious ? (
                <XCircle className="w-3 h-3 text-red-400" />
              ) : (
                <CheckCircle2 className="w-3 h-3 text-green-400" />
              )}
              <span className={`text-[10px] font-bold ${d.isMalicious ? 'text-red-400' : 'text-green-400'}`}>
                {d.isMalicious ? 'MALICIOUS' : 'NOT MALICIOUS'}
              </span>
            </div>
          </div>
        </div>

        {/* Contract info */}
        <div className="bg-surface-elevated/50 border border-border-subtle/50 rounded-xl p-2.5 sm:p-3">
          <div className="flex justify-between">
            <span className="text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wide">Contract</span>
            <span className="text-xs sm:text-sm text-text-primary font-mono">{truncateAddress(d.contractAddress)}</span>
          </div>
          {d.network && (
            <div className="flex justify-between mt-1">
              <span className="text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wide">Network</span>
              <span className="text-xs sm:text-sm text-text-primary font-medium capitalize">{d.network}</span>
            </div>
          )}
        </div>

        {/* Flags */}
        {d.flags && d.flags.length > 0 && (
          <div className="space-y-1">
            <div className="text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wide">Security Flags</div>
            <div className="flex flex-wrap gap-1.5">
              {d.flags.map((flag, i) => {
                const cfg = SEVERITY_ICON[flag.severity] ?? SEVERITY_ICON.caution
                return (
                  <div
                    key={i}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${
                      flag.severity === 'safe' ? 'bg-green-500/10 border border-green-500/20' :
                      flag.severity === 'danger' ? 'bg-red-500/10 border border-red-500/20' :
                      'bg-yellow-500/10 border border-yellow-500/20'
                    }`}
                  >
                    <cfg.Icon className={`w-2.5 h-2.5 ${cfg.color}`} />
                    <span className={`text-[10px] ${cfg.color}`}>{flag.label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Summary */}
        {d.summary && (
          <p className="text-xs text-text-secondary leading-relaxed">{d.summary}</p>
        )}
      </div>
    </div>
  )
}
