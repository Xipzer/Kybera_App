/**
 * Code by Xipzer
 */

import { useState } from 'react'
import { Shield, ChevronDown, ChevronUp } from 'lucide-react'

interface SecurityBadgeProps {
  riskScore: number
  riskFlags: string[]
  isHoneypot: boolean
  isMalicious: boolean
  riskSummary: string
}

function getRiskTier(score: number) {
  if (score < 20) return { label: 'Verified', color: 'text-green-500', bg: 'bg-green-500/20', border: 'border-green-500/30' }
  if (score < 40) return { label: 'Low Risk', color: 'text-yellow-500', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30' }
  if (score < 70) return { label: 'Medium Risk', color: 'text-orange-500', bg: 'bg-orange-500/20', border: 'border-orange-500/30' }
  return { label: 'High Risk', color: 'text-red-500', bg: 'bg-red-500/20', border: 'border-red-500/30' }
}

export function SecurityBadge({ riskScore, riskFlags, isHoneypot, isMalicious, riskSummary }: SecurityBadgeProps) {
  const [expanded, setExpanded] = useState(false)
  const tier = getRiskTier(riskScore)

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation()
          setExpanded(!expanded)
        }}
        className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full ${tier.bg} flex items-center gap-1 sm:gap-1.5 flex-shrink-0 transition-colors hover:opacity-80`}
      >
        <Shield className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${tier.color}`} />
        <span className={`text-[10px] sm:text-xs font-medium ${tier.color}`}>
          {tier.label}
        </span>
        {riskFlags.length > 0 && (
          expanded
            ? <ChevronUp className={`w-2.5 h-2.5 sm:w-3 sm:h-3 ${tier.color}`} />
            : <ChevronDown className={`w-2.5 h-2.5 sm:w-3 sm:h-3 ${tier.color}`} />
        )}
      </button>

      {expanded && (
        <div className={`absolute right-0 top-full mt-1.5 z-50 w-64 sm:w-72 rounded-xl border ${tier.border} bg-surface-base shadow-xl p-3 sm:p-4`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Shield className={`w-4 h-4 ${tier.color}`} />
              <span className={`text-sm font-semibold ${tier.color}`}>{tier.label}</span>
            </div>
            <span className={`text-xs font-mono ${tier.color}`}>{riskScore}/100</span>
          </div>

          <div className="w-full h-1.5 bg-surface-elevated rounded-full overflow-hidden mb-3">
            <div
              className={`h-full rounded-full transition-all ${
                riskScore < 20 ? 'bg-green-500'
                  : riskScore < 40 ? 'bg-yellow-500'
                    : riskScore < 70 ? 'bg-orange-500'
                      : 'bg-red-500'
              }`}
              style={{ width: `${riskScore}%` }}
            />
          </div>

          <p className="text-xs text-text-secondary mb-3 leading-relaxed">{riskSummary}</p>

          {(isHoneypot || isMalicious) && (
            <div className="mb-3 p-2 rounded-lg bg-red-500/10 border border-red-500/30">
              <div className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-red-500" />
                <span className="text-xs font-semibold text-red-500">
                  {isHoneypot && isMalicious
                    ? 'Honeypot & Malicious'
                    : isHoneypot
                      ? 'Honeypot Detected'
                      : 'Malicious Contract'}
                </span>
              </div>
            </div>
          )}

          {riskFlags.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] text-text-tertiary uppercase tracking-wide font-medium">
                Risk Flags
              </span>
              <div className="flex flex-wrap gap-1">
                {riskFlags.map((flag) => (
                  <span
                    key={flag}
                    className={`px-1.5 py-0.5 rounded text-[10px] ${tier.bg} ${tier.color} font-medium`}
                  >
                    {flag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {riskFlags.length === 0 && !isHoneypot && !isMalicious && (
            <div className="text-xs text-text-tertiary italic">No risk flags detected</div>
          )}
        </div>
      )}
    </div>
  )
}
