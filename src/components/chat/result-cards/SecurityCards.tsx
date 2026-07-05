/**
 * Code by Xipzer
 *
 * Security-related result cards: SecurityCard, MaliciousCheckCard.
 */

import { Shield, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'
import { useCardTheme, CardShell, AddressChip } from './shared'

interface SecurityData {
  riskScore?: number
  contractAddress?: string
  isHoneypot?: boolean
  isMintable?: boolean
  isProxy?: boolean
  isOpenSource?: boolean
  riskFlags?: string[]
}

export function SecurityCard({ data }: { data: Record<string, unknown> }) {
  const { card } = useCardTheme()
  const d = data as SecurityData
  const riskScore = Number(d.riskScore || 0)
  const riskColor = riskScore > 70 ? 'text-red-500' : riskScore > 40 ? 'text-yellow-500' : 'text-green-500'

  return (
    <CardShell icon={Shield} title="Token Security Report">
      <div className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
          <div>
            <div className="text-2xs sm:text-xs text-text-tertiary uppercase tracking-wide mb-0.5 sm:mb-1">Risk Score</div>
            <div className={`text-sm sm:text-lg font-bold ${riskColor}`}>{riskScore}/100</div>
          </div>
          {d.contractAddress && (
            <div>
              <div className="text-2xs sm:text-xs text-text-tertiary uppercase tracking-wide mb-0.5 sm:mb-1">Contract</div>
              <AddressChip address={d.contractAddress} />
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {d.isHoneypot && <span className="text-2xs sm:text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-500 font-medium">Honeypot</span>}
          {d.isMintable && <span className="text-2xs sm:text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-500 font-medium">Mintable</span>}
          {d.isProxy && <span className="text-2xs sm:text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-500 font-medium">Proxy</span>}
          {d.isOpenSource && <span className="text-2xs sm:text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-500 font-medium">Open Source</span>}
        </div>
        {d.riskFlags && d.riskFlags.length > 0 && (
          <div className={`flex flex-wrap gap-1.5 sm:gap-2 pt-2 border-t ${card.innerBorder}`}>
            {d.riskFlags.map((flag) => (
              <span key={flag} className="text-2xs sm:text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-500">{flag}</span>
            ))}
          </div>
        )}
      </div>
    </CardShell>
  )
}

interface MaliciousCheckData {
  isMalicious?: boolean
  maliciousType?: string
  address?: string
}

export function MaliciousCheckCard({ data }: { data: Record<string, unknown> }) {
  const d = data as MaliciousCheckData
  return (
    <CardShell
      icon={d.isMalicious ? AlertTriangle : Shield}
      title="Address Check"
    >
      <div className="flex items-center gap-2 sm:gap-3">
        {d.isMalicious
          ? <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 flex-shrink-0" />
          : <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0" />
        }
        <span className={`text-xs sm:text-base font-medium ${d.isMalicious ? 'text-red-500' : 'text-green-500'}`}>
          {d.isMalicious ? `Flagged: ${d.maliciousType || 'Malicious'}` : 'Not flagged as malicious'}
        </span>
      </div>
      {d.address && <div className="mt-2"><AddressChip address={d.address} /></div>}
    </CardShell>
  )
}
