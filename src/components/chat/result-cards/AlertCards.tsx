/**
 * Code by Xipzer
 *
 * Alert result cards: AlertsCard.
 */

import { Bell } from 'lucide-react'
import { useCardTheme, CardShell } from './shared'

export function AlertsCard({ data }: { data: any }) {
  const { card } = useCardTheme()

  return (
    <CardShell icon={Bell} title={`${data.total || data.alerts?.length || 0} Alerts`}>
      {data.alerts?.length > 0 ? (
        <div className={`${card.innerBg} border ${card.innerBorder} rounded-xl overflow-hidden`}>
          {data.alerts.map((a: any, i: number) => (
            <div key={a.id} className={`flex items-center justify-between px-3 py-2 sm:px-4 sm:py-2.5 ${i > 0 ? `border-t ${card.innerBorder}` : ''}`}>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${a.enabled ? 'bg-green-500' : 'bg-gray-400'}`} />
                <span className="text-xs sm:text-base text-text-primary">{a.type.replace(/_/g, ' ')}</span>
              </div>
              <span className="text-[10px] sm:text-xs text-text-tertiary">{a.triggerCount}x triggered</span>
            </div>
          ))}
        </div>
      ) : (
        <span className="text-xs sm:text-sm text-text-tertiary">No alerts configured</span>
      )}
    </CardShell>
  )
}
