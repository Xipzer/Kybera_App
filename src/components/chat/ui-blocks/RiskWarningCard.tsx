/**
 * Code by Xipzer
 *
 * Risk Warning UI Block — severity-colored callout for risk warnings,
 * info notices, and critical alerts.
 */

import { Info, AlertTriangle, Shield } from 'lucide-react'
import type { RiskWarningBlock } from '../../../types/research'

const SEVERITY_CONFIG: Record<string, { border: string; bg: string; iconColor: string; Icon: typeof Info }> = {
  info: {
    border: 'border-blue-500/20',
    bg: 'bg-blue-500/5',
    iconColor: 'text-blue-400',
    Icon: Info,
  },
  warning: {
    border: 'border-orange-500/30',
    bg: 'bg-orange-500/5',
    iconColor: 'text-orange-400',
    Icon: AlertTriangle,
  },
  critical: {
    border: 'border-red-500/30',
    bg: 'bg-red-500/5',
    iconColor: 'text-red-400',
    Icon: Shield,
  },
}

export function RiskWarningCard({ block }: { block: RiskWarningBlock }) {
  const d = block.data
  const config = SEVERITY_CONFIG[d.severity] ?? SEVERITY_CONFIG.warning
  const { Icon } = config

  return (
    <div className={`${config.bg} border ${config.border} rounded-2xl overflow-hidden`}>
      <div className="px-3 py-2.5 sm:px-4 sm:py-3 flex items-start gap-2 sm:gap-3">
        <Icon className={`w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 mt-0.5 ${config.iconColor}`} />
        <div className="space-y-0.5 min-w-0">
          <div className={`text-sm sm:text-base font-semibold ${config.iconColor}`}>{d.title}</div>
          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">{d.message}</p>
        </div>
      </div>
    </div>
  )
}
