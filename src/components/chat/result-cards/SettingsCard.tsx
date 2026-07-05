/**
 * Code by Xipzer
 *
 * Settings result card: SettingsCard.
 */

import { Settings } from 'lucide-react'
import { CardShell } from './shared'

export function SettingsCard({ data }: { data: any }) {
  return (
    <CardShell icon={Settings} title="Current Settings">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
        <div>
          <div className="text-2xs sm:text-xs text-text-tertiary uppercase tracking-wide mb-0.5 sm:mb-1">Alchemy Key</div>
          <div className={`text-xs sm:text-base font-medium ${data.hasAlchemyKey ? 'text-green-500' : 'text-text-tertiary'}`}>
            {data.hasAlchemyKey ? 'Configured' : 'Not set'}
          </div>
        </div>
        <div>
          <div className="text-2xs sm:text-xs text-text-tertiary uppercase tracking-wide mb-0.5 sm:mb-1">Helius Key</div>
          <div className={`text-xs sm:text-base font-medium ${data.hasHeliusKey ? 'text-green-500' : 'text-text-tertiary'}`}>
            {data.hasHeliusKey ? 'Configured' : 'Not set'}
          </div>
        </div>
        <div>
          <div className="text-2xs sm:text-xs text-text-tertiary uppercase tracking-wide mb-0.5 sm:mb-1">CoinGecko Key</div>
          <div className={`text-xs sm:text-base font-medium ${data.hasCoinGeckoKey ? 'text-green-500' : 'text-text-tertiary'}`}>
            {data.hasCoinGeckoKey ? 'Configured' : 'Not set'}
          </div>
        </div>
        <div>
          <div className="text-2xs sm:text-xs text-text-tertiary uppercase tracking-wide mb-0.5 sm:mb-1">AI Provider</div>
          <div className={`text-xs sm:text-base font-medium ${data.llmProvider ? 'text-green-500' : 'text-text-tertiary'}`}>
            {data.llmProvider ? String(data.llmProvider) : 'Not set'}
          </div>
        </div>
      </div>
    </CardShell>
  )
}
