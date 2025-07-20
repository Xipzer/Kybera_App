/**
 * Code by Xipzer
 */

import { useEffect, useState } from 'react'
import { useSettingsStore } from '../store/settingsStore'

interface DeepLinkParams {
  url: string
  token?: string
}

export function useOpenClawDeepLink() {
  const [pendingConnection, setPendingConnection] = useState<DeepLinkParams | null>(null)
  const { setOpenClawGatewayUrl, setOpenClawAuthToken } = useSettingsStore()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const openclawUrl = params.get('openclaw_url')

    if (openclawUrl) {
      setPendingConnection({ url: openclawUrl, token: params.get('openclaw_token') || undefined })

      const cleanUrl = new URL(window.location.href)
      cleanUrl.searchParams.delete('openclaw_url')
      cleanUrl.searchParams.delete('openclaw_token')
      window.history.replaceState({}, '', cleanUrl.pathname + cleanUrl.search)
    }
  }, [])

  const acceptConnection = async () => {
    if (!pendingConnection) return
    await setOpenClawGatewayUrl(pendingConnection.url)
    if (pendingConnection.token) {
      await setOpenClawAuthToken(pendingConnection.token)
    }
    setPendingConnection(null)
  }

  const dismissConnection = () => {
    setPendingConnection(null)
  }

  return { pendingConnection, acceptConnection, dismissConnection }
}