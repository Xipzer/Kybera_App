/**
 * Code by Xipzer
 *
 * Settings result card: SettingsCard.
 */

import { Settings } from 'lucide-react'
import { CardShell } from './shared'

interface SettingsData {
  hasAlchemyKey?: boolean
  hasHeliusKey?: boolean
  hasCoinGeckoKey?: boolean
  llmProvider?: string
}

export function SettingsCard({ data }: { data: Record<string, unknown> }) {
  const d = data as SettingsData
  return (
    <CardShell icon={Settings} title="Current Settings">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
        <div>
          <div className="text-2xs sm:text-xs text-text-tertiary uppercase tracking-wide mb-0.5 sm:mb-1">Alchemy Key</div>
          <div className={`text-xs sm:text-base font-medium ${d.hasAlchemyKey ? 'text-green-500' : 'text-text-tertiary'}`}>
            {d.hasAlchemyKey ? 'Configured' : 'Not set'}
          </div>
        </div>
        <div>
          <div className="text-2xs sm:text-xs text-text-tertiary uppercase tracking-wide mb-0.5 sm:mb-1">Helius Key</div>
          <div className={`text-xs sm:text-base font-medium ${d.hasHeliusKey ? 'text-green-500' : 'text-text-tertiary'}`}>
            {d.hasHeliusKey ? 'Configured' : 'Not set'}
          </div>
        </div>
        <div>
          <div className="text-2xs sm:text-xs text-text-tertiary uppercase tracking-wide mb-0.5 sm:mb-1">CoinGecko Key</div>
          <div className={`text-xs sm:text-base font-medium ${d.hasCoinGeckoKey ? 'text-green-500' : 'text-text-tertiary'}`}>
            {d.hasCoinGeckoKey ? 'Configured' : 'Not set'}
          </div>
        </div>
        <div>
          <div className="text-2xs sm:text-xs text-text-tertiary uppercase tracking-wide mb-0.5 sm:mb-1">AI Provider</div>
          <div className={`text-xs sm:text-base font-medium ${d.llmProvider ? 'text-green-500' : 'text-text-tertiary'}`}>
            {d.llmProvider ? String(d.llmProvider) : 'Not set'}
          </div>
        </div>
      </div>
    </CardShell>
  )
}
