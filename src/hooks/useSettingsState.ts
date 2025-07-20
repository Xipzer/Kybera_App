/**
 * Code by Xipzer
 */

import { useState, useEffect } from 'react'
import { useSettingsStore } from '../store/settingsStore'
import { useUIStore } from '../store/uiStore'
import { useAuthStore } from '../store/authStore'
import { useWalletStore } from '../store/walletStore'
import { useResearchStore } from '../store/researchStore'
import { useTheme } from './useTheme'
import { networkService, NetworkWithVisibility } from '../services/networkService'
import { Network } from '../types'

export function useSettingsState(options?: { isOpen?: boolean }) {
  const isOpen = options?.isOpen ?? true

  const {
    openClawGatewayUrl,
    openClawAuthToken,
    openClawAutoConnect,
    coinGeckoApiKey,
    alchemyApiKey,
    heliusApiKey,
    autoLockTimeout,
    setOpenClawGatewayUrl,
    setOpenClawAuthToken,
    setOpenClawAutoConnect,
    setCoinGeckoApiKey,
    setAlchemyApiKey,
    setHeliusApiKey,
    setAutoLockTimeout,
  } = useSettingsStore()
  const connectionState = useResearchStore((state) => state.connectionState)
  const connect = useResearchStore((state) => state.connect)
  const disconnect = useResearchStore((state) => state.disconnect)
  const { theme: themeConfig } = useTheme()
  const uiStore = useUIStore()
  const { changePassword } = useAuthStore()
  const { password: currentSessionPassword } = useWalletStore()

  const [gatewayUrl, setGatewayUrl] = useState(openClawGatewayUrl || '')
  const [authToken, setAuthToken] = useState(openClawAuthToken || '')
  const [showAuthToken, setShowAuthToken] = useState(false)
  const [autoConnect, setAutoConnect] = useState(openClawAutoConnect)
  const [isTestingConnection, setIsTestingConnection] = useState(false)

  const [cgApiKey, setCgApiKey] = useState(coinGeckoApiKey || '')
  const [showCgApiKey, setShowCgApiKey] = useState(false)

  const [alchemyKey, setAlchemyKey] = useState(alchemyApiKey || '')
  const [showAlchemyKey, setShowAlchemyKey] = useState(false)
  const [heliusKey, setHeliusKey] = useState(heliusApiKey || '')
  const [showHeliusKey, setShowHeliusKey] = useState(false)
  const [lockTimeout, setLockTimeout] = useState(autoLockTimeout.toString())
  const [autoLockEnabled, setAutoLockEnabled] = useState(autoLockTimeout > 0)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  const [networks, setNetworks] = useState<NetworkWithVisibility[]>([])
  const [networkDialogOpen, setNetworkDialogOpen] = useState(false)
  const [editingNetwork, setEditingNetwork] = useState<NetworkWithVisibility | undefined>()
  const [networkError, setNetworkError] = useState('')

  const [activeTab, setActiveTab] = useState('ai')

  const [showImportField, setShowImportField] = useState(false)
  const [importString, setImportString] = useState('')
  const [importError, setImportError] = useState('')

  useEffect(() => {
    if (!isOpen) {
      setGatewayUrl(openClawGatewayUrl || '')
      setAuthToken(openClawAuthToken || '')
      setAutoConnect(openClawAutoConnect)
      setCgApiKey(coinGeckoApiKey || '')
      setAlchemyKey(alchemyApiKey || '')
      setHeliusKey(heliusApiKey || '')
    }
  }, [
    isOpen,
    openClawGatewayUrl,
    openClawAuthToken,
    openClawAutoConnect,
    coinGeckoApiKey,
    alchemyApiKey,
    heliusApiKey,
  ])

  useEffect(() => {
    if (isOpen) {
      loadNetworks()
    }
  }, [isOpen])

  const loadNetworks = async () => {
    try {
      setNetworks(await networkService.getAllNetworks())
    } catch (error) {
      console.error('Failed to load networks:', error)
    }
  }

  const handleImportConnection = () => {
    setImportError('')
    const str = importString.trim()
    if (!str) return

    try {
      if (str.includes('openclaw_url=') || str.includes('openclaw_url%3D')) {
        const url = new URL(str)
        const openclawUrl = url.searchParams.get('openclaw_url')
        const openclawToken = url.searchParams.get('openclaw_token')
        if (openclawUrl) {
          setGatewayUrl(openclawUrl)
          if (openclawToken) setAuthToken(openclawToken)
          setShowImportField(false)
          setImportString('')
          return
        }
      }

      if (str.startsWith('{')) {
        const parsed = JSON.parse(str)
        const url = parsed.url || parsed.gateway_url || parsed.gatewayUrl
        const token = parsed.token || parsed.auth_token || parsed.authToken
        if (url) {
          setGatewayUrl(url)
          if (token) setAuthToken(token)
          setShowImportField(false)
          setImportString('')
          return
        }
      }

      if (
        str.startsWith('ws://') ||
        str.startsWith('wss://') ||
        str.startsWith('http://') ||
        str.startsWith('https://')
      ) {
        setGatewayUrl(str)
        setShowImportField(false)
        setImportString('')
        return
      }

      setImportError('Could not parse connection string. Use a URL, JSON, or connection link.')
    } catch {
      setImportError('Invalid connection string format.')
    }
  }

  const handleSaveOpenClaw = async () => {
    await setOpenClawGatewayUrl(gatewayUrl.trim() || null)
    await setOpenClawAuthToken(authToken.trim() || null)
    await setOpenClawAutoConnect(autoConnect)
    if (!gatewayUrl.trim()) return
    try {
      if (connectionState === 'connected') disconnect()
      await connect(gatewayUrl.trim(), authToken.trim() || undefined)
    } catch (error) {
      console.error('[Settings] Connection failed:', error)
    }
  }

  const handleTestConnection = async () => {
    if (!gatewayUrl.trim()) return
    setIsTestingConnection(true)
    try {
      await handleSaveOpenClaw()
    } finally {
      setIsTestingConnection(false)
    }
  }

  const handleSaveApiKeys = async () => {
    await setAlchemyApiKey(alchemyKey.trim() || null)
    await setHeliusApiKey(heliusKey.trim() || null)
    await setCoinGeckoApiKey(cgApiKey.trim() || null)
  }

  const isOpenClawChanged =
    gatewayUrl.trim() !== (openClawGatewayUrl || '') ||
    authToken.trim() !== (openClawAuthToken || '') ||
    autoConnect !== openClawAutoConnect
  const isCgApiKeyChanged = cgApiKey.trim() !== (coinGeckoApiKey || '')
  const isApiKeysChanged =
    alchemyKey.trim() !== (alchemyApiKey || '') ||
    heliusKey.trim() !== (heliusApiKey || '') ||
    isCgApiKeyChanged

  const handleAutoLockTimeoutChange = async (value: string) => {
    setLockTimeout(value)
    const timeout = parseInt(value) || 1
    if (autoLockEnabled && timeout > 0) {
      await setAutoLockTimeout(timeout)
    }
  }

  const handleAutoLockToggle = async (enabled: boolean) => {
    setAutoLockEnabled(enabled)
    if (enabled) {
      await setAutoLockTimeout(parseInt(lockTimeout) || 1)
    } else {
      await setAutoLockTimeout(0)
    }
  }

  const handlePasswordChange = async () => {
    setPasswordError('')
    setPasswordSuccess(false)

    if (!currentPassword) {
      setPasswordError('Please enter your current password')
      return
    }
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long')
      return
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError('New passwords do not match')
      return
    }
    if (currentPassword === newPassword) {
      setPasswordError('New password must be different from current password')
      return
    }

    setIsChangingPassword(true)
    try {
      if (await changePassword(currentPassword, newPassword)) {
        setPasswordSuccess(true)
        setCurrentPassword('')
        setNewPassword('')
        setConfirmNewPassword('')
        if (currentSessionPassword === currentPassword) {
          useWalletStore.setState({ password: newPassword })
        }
        setTimeout(() => setPasswordSuccess(false), 3000)
      } else {
        setPasswordError('Current password is incorrect or re-encryption failed')
      }
    } catch {
      setPasswordError('Failed to change password. Please try again.')
    } finally {
      setIsChangingPassword(false)
    }
  }

  const handleAddNetwork = async (network: Omit<Network, 'id'>) => {
    try {
      await networkService.addCustomNetwork(network)
      await loadNetworks()
      setNetworkDialogOpen(false)
      setNetworkError('')
    } catch (error: any) {
      throw error
    }
  }

  const handleUpdateNetwork = async (id: string, updates: Partial<Network>) => {
    try {
      await networkService.updateCustomNetwork(id, updates)
      await loadNetworks()
      setNetworkDialogOpen(false)
      setEditingNetwork(undefined)
      setNetworkError('')
    } catch (error: any) {
      throw error
    }
  }

  const handleRemoveNetwork = async (id: string) => {
    if (confirm('Are you sure you want to remove this network?')) {
      try {
        await networkService.removeCustomNetwork(id)
        await loadNetworks()
        setNetworkError('')
      } catch (error: any) {
        setNetworkError(error.message || 'Failed to remove network')
      }
    }
  }

  const handleToggleNetworkVisibility = async (networkId: string) => {
    try {
      await networkService.toggleNetworkVisibility(networkId)
      await loadNetworks()
    } catch (error) {
      console.error('Failed to toggle network visibility:', error)
    }
  }

  return {
    themeConfig,
    uiStore,
    gatewayUrl,
    setGatewayUrl,
    authToken,
    setAuthToken,
    showAuthToken,
    setShowAuthToken,
    autoConnect,
    setAutoConnect,
    isTestingConnection,
    connectionState,
    handleSaveOpenClaw,
    handleTestConnection,
    isOpenClawChanged,
    showImportField,
    setShowImportField,
    importString,
    setImportString,
    importError,
    setImportError,
    handleImportConnection,
    cgApiKey,
    setCgApiKey,
    showCgApiKey,
    setShowCgApiKey,

    alchemyKey,
    setAlchemyKey,
    showAlchemyKey,
    setShowAlchemyKey,
    heliusKey,
    setHeliusKey,
    showHeliusKey,
    setShowHeliusKey,
    handleSaveApiKeys,
    isApiKeysChanged,
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirmNewPassword,
    setConfirmNewPassword,
    showCurrentPassword,
    setShowCurrentPassword,
    showNewPassword,
    setShowNewPassword,
    passwordError,
    passwordSuccess,
    isChangingPassword,
    handlePasswordChange,
    lockTimeout,
    autoLockEnabled,
    handleAutoLockTimeoutChange,
    handleAutoLockToggle,
    networks,
    networkDialogOpen,
    setNetworkDialogOpen,
    editingNetwork,
    setEditingNetwork,
    networkError,
    handleAddNetwork,
    handleUpdateNetwork,
    handleRemoveNetwork,
    handleToggleNetworkVisibility,
    activeTab,
    setActiveTab,
  }
}