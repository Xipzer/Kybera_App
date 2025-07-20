/**
 * Code by Xipzer
 */

import { Zap, Check, X } from 'lucide-react'
import { useOpenClawDeepLink } from '../../hooks/useOpenClawDeepLink'

export function OpenClawDeepLinkBanner() {
  const { pendingConnection, acceptConnection, dismissConnection } = useOpenClawDeepLink()

  if (!pendingConnection) return null

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center gap-3 px-4 py-3 bg-surface-elevated border border-accent-500/30 rounded-xl shadow-lg shadow-black/20 backdrop-blur-xl max-w-md">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent-500/20 flex-shrink-0">
          <Zap className="w-4 h-4 text-accent-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary">OpenClaw Connection</p>
          <p className="text-xs text-text-secondary truncate">{pendingConnection.url}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={acceptConnection}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-500/20 hover:bg-accent-500/30 border border-accent-500/30 rounded-lg text-xs font-medium text-accent-500 transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
            Connect
          </button>
          <button
            onClick={dismissConnection}
            className="p-1.5 text-text-secondary hover:text-text-primary transition-colors rounded-lg hover:bg-white/5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}