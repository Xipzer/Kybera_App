/**
 * Code by Xipzer
 *
 * Security-related result cards: SecurityCard, MaliciousCheckCard.
 */

import { Shield, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'
import { useCardTheme, CardShell, AddressChip } from './shared'

export function SecurityCard({ data }: { data: any }) {
  const { card } = useCardTheme()
  const riskScore = Number(data.riskScore || 0)
  const riskColor = riskScore > 70 ? 'text-red-500' : riskScore > 40 ? 'text-yellow-500' : 'text-green-500'

  return (
    <CardShell icon={Shield} title="Token Security Report">
      <div className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
          <div>
            <div className="text-2xs sm:text-xs text-text-tertiary uppercase tracking-wide mb-0.5 sm:mb-1">Risk Score</div>
            <div className={`text-sm sm:text-lg font-bold ${riskColor}`}>{riskScore}/100</div>
          </div>
          {data.contractAddress && (
            <div>
              <div className="text-2xs sm:text-xs text-text-tertiary uppercase tracking-wide mb-0.5 sm:mb-1">Contract</div>
              <AddressChip address={data.contractAddress} />
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {data.isHoneypot && <span className="text-2xs sm:text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-500 font-medium">Honeypot</span>}
          {data.isMintable && <span className="text-2xs sm:text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-500 font-medium">Mintable</span>}
          {data.isProxy && <span className="text-2xs sm:text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-500 font-medium">Proxy</span>}
          {data.isOpenSource && <span className="text-2xs sm:text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-500 font-medium">Open Source</span>}
        </div>
        {data.riskFlags?.length > 0 && (
          <div className={`flex flex-wrap gap-1.5 sm:gap-2 pt-2 border-t ${card.innerBorder}`}>
            {data.riskFlags.map((flag: string) => (
              <span key={flag} className="text-2xs sm:text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-500">{flag}</span>
            ))}
          </div>
        )}
      </div>
    </CardShell>
  )
}

export function MaliciousCheckCard({ data }: { data: any }) {
  return (
    <CardShell
      icon={data.isMalicious ? AlertTriangle : Shield}
      title="Address Check"
    >
      <div className="flex items-center gap-2 sm:gap-3">
        {data.isMalicious
          ? <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 flex-shrink-0" />
          : <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0" />
        }
        <span className={`text-xs sm:text-base font-medium ${data.isMalicious ? 'text-red-500' : 'text-green-500'}`}>
          {data.isMalicious ? `Flagged: ${data.maliciousType || 'Malicious'}` : 'Not flagged as malicious'}
        </span>
      </div>
      {data.address && <div className="mt-2"><AddressChip address={data.address} /></div>}
    </CardShell>
  )
}
