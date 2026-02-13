/**
 * Code by Xipzer
 *
 * Generic/utility result cards: SimpleConfirmCard, FailureCard.
 */

import { CheckCircle2, XCircle, type LucideIcon } from 'lucide-react'
import { CardShell } from './shared'
import type { ActionResultData } from '../../../types/research'

export function SimpleConfirmCard({ icon: Icon, title, message }: {
  icon: LucideIcon
  title: string
  message: string
}) {
  return (
    <CardShell icon={Icon} title={title}>
      <div className="flex items-center gap-2 sm:gap-3">
        <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0" />
        <span className="text-xs sm:text-base text-text-primary">{message}</span>
      </div>
    </CardShell>
  )
}

export function FailureCard({ result }: { result: ActionResultData }) {
  return (
    <CardShell icon={XCircle} title="Action Failed">
      <div className="flex items-center gap-2 sm:gap-3">
        <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 flex-shrink-0" />
        <span className="text-xs sm:text-base text-red-500">{result.message}{result.error ? `: ${result.error}` : ''}</span>
      </div>
    </CardShell>
  )
}
