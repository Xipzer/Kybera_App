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
import type { ProviderId } from '../services/llm/types'
import { getAdapter } from '../services/llm/providers'
import {
  beginOAuth,
  completeOAuth,
  openAuthPopup,
  getStoredCredential,
  clearCredential,
  storeCredential,
} from '../services/llm/oauth/manager'
import type { AuthorizeSession } from '../services/llm/oauth/types'

export function useSettingsState(options?: { isOpen?: boolean }) {
  const isOpen = options?.isOpen ?? true

  const {
    llmProvider,
    llmModel,
    llmAutoConnect,
    coinGeckoApiKey,
    alchemyApiKey,
    heliusApiKey,
    autoLockTimeout,
    setLlmProvider,
    setLlmModel,
    setLlmAutoConnect,
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

  const [provider, setProvider] = useState<ProviderId>(llmProvider)
  const [model, setModel] = useState(llmModel || getAdapter(llmProvider).defaultModel)
  const [autoConnect, setAutoConnect] = useState(llmAutoConnect)
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [isSignedIn, setIsSignedIn] = useState(false)
  const [oauthSession, setOauthSession] = useState<AuthorizeSession | null>(null)
  const [manualCode, setManualCode] = useState('')
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [llmError, setLlmError] = useState('')

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

  useEffect(() => {
    if (!isOpen) {
      setProvider(llmProvider)
      setModel(llmModel || getAdapter(llmProvider).defaultModel)
      setAutoConnect(llmAutoConnect)
      setCgApiKey(coinGeckoApiKey || '')
      setAlchemyKey(alchemyApiKey || '')
      setHeliusKey(heliusApiKey || '')
    }
  }, [isOpen, llmProvider, llmModel, llmAutoConnect, coinGeckoApiKey, alchemyApiKey, heliusApiKey])

  // Reflect whether we already hold a credential for the selected provider.
  useEffect(() => {
    let active = true
    getStoredCredential(provider).then((cred) => {
      if (active) setIsSignedIn(!!cred)
    })
    return () => {
      active = false
    }
  }, [provider])

  // Listen for the OAuth popup relaying its code back via postMessage.
  useEffect(() => {
    if (!oauthSession) return
    const onMessage = async (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return
      const d = e.data as { source?: string; code?: string; state?: string }
      if (d?.source !== 'kybera-oauth' || !d.code) return
      await finishOAuth(`${d.code}${d.state ? `#${d.state}` : ''}`)
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oauthSession])

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

  const handleSelectProvider = async (next: ProviderId) => {
    setProvider(next)
    setModel(getAdapter(next).defaultModel)
    setLlmError('')
    setOauthSession(null)
    await setLlmProvider(next)
  }

  const handleSelectModel = async (next: string) => {
    setModel(next)
    await setLlmModel(next)
  }

  const finishOAuth = async (codeInput: string) => {
    if (!oauthSession) return
    try {
      await completeOAuth(provider, codeInput, oauthSession)
      setIsSignedIn(true)
      setOauthSession(null)
      setManualCode('')
      await connectLLM()
    } catch (error) {
      setLlmError(error instanceof Error ? error.message : 'Sign-in failed')
    }
  }

  const handleStartOAuth = async () => {
    setLlmError('')
    setIsSigningIn(true)
    try {
      const session = await beginOAuth(provider)
      setOauthSession(session)
      openAuthPopup(session)
    } catch (error) {
      setLlmError(error instanceof Error ? error.message : 'Could not start sign-in')
    } finally {
      setIsSigningIn(false)
    }
  }

  const handleSubmitManualCode = async () => {
    if (!manualCode.trim()) return
    await finishOAuth(manualCode.trim())
  }

  const handleSaveApiKey = async () => {
    if (!apiKeyInput.trim()) return
    await storeCredential(provider, { kind: 'apikey', key: apiKeyInput.trim() })
    setApiKeyInput('')
    setIsSignedIn(true)
    await connectLLM()
  }

  const handleSignOut = async () => {
    await clearCredential(provider)
    setIsSignedIn(false)
    if (connectionState === 'connected') disconnect()
  }

  const connectLLM = async () => {
    await setLlmProvider(provider)
    await setLlmModel(model)
    await setLlmAutoConnect(autoConnect)
    try {
      if (connectionState === 'connected') disconnect()
      await connect(provider, model)
    } catch (error) {
      console.error('[Settings] LLM connect failed:', error)
      setLlmError(error instanceof Error ? error.message : 'Connect failed')
    }
  }

  const handleSaveApiKeys = async () => {
    await setAlchemyApiKey(alchemyKey.trim() || null)
    await setHeliusApiKey(heliusKey.trim() || null)
    await setCoinGeckoApiKey(cgApiKey.trim() || null)
  }

  const availableModels = getAdapter(provider).models
  const supportsOAuth = getAdapter(provider).supportsOAuth
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
    await networkService.addCustomNetwork(network)
    await loadNetworks()
    setNetworkDialogOpen(false)
    setNetworkError('')
  }

  const handleUpdateNetwork = async (id: string, updates: Partial<Network>) => {
    await networkService.updateCustomNetwork(id, updates)
    await loadNetworks()
    setNetworkDialogOpen(false)
    setEditingNetwork(undefined)
    setNetworkError('')
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
    provider,
    model,
    availableModels,
    supportsOAuth,
    handleSelectProvider,
    handleSelectModel,
    autoConnect,
    setAutoConnect,
    isSigningIn,
    isSignedIn,
    oauthSession,
    manualCode,
    setManualCode,
    apiKeyInput,
    setApiKeyInput,
    llmError,
    handleStartOAuth,
    handleSubmitManualCode,
    handleSaveApiKey,
    handleSignOut,
    connectionState,
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