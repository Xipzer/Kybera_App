/**
 * SettingsPanel Component
 * Mobile-friendly settings panel that slides in from the bottom nav
 * Uses the same content as SettingsDialog but without the dialog wrapper
 */

import { useState, useEffect } from 'react'
import * as Tabs from '@radix-ui/react-tabs'
import * as Select from '@radix-ui/react-select'
import {
  Eye,
  EyeOff,
  Moon,
  Sun,
  Shield,
  Brain,
  Palette,
  AlertCircle,
  Check,
  ChevronDown,
  Wifi,
  WifiOff,
  Loader2,
  Zap,
} from 'lucide-react'
import { useSettingsStore } from '../../store/settingsStore'
import { useUIStore } from '../../store/uiStore'
import { useAuthStore } from '../../store/authStore'
import { useWalletStore } from '../../store/walletStore'
import { useResearchStore } from '../../store/researchStore'
import { ImageUpload } from '../common/ImageUpload'
import { useTheme } from '../../hooks/useTheme'
import { networkService } from '../../services/network/networkService'
import { NetworkManagementDialog } from './NetworkManagementDialog'
import { Network } from '../../types'

export function SettingsPanel() {
  const {
    openClawGatewayUrl,
    openClawAuthToken,
    openClawAutoConnect,
    coinGeckoApiKey,
    autoLockTimeout,
    setOpenClawGatewayUrl,
    setOpenClawAuthToken,
    setOpenClawAutoConnect,
    setCoinGeckoApiKey,
    setAutoLockTimeout,
  } = useSettingsStore()
  const connectionState = useResearchStore((state) => state.connectionState)
  const connect = useResearchStore((state) => state.connect)
  const disconnect = useResearchStore((state) => state.disconnect)
  const { theme: themeConfig } = useTheme()
  const {
    theme,
    setTheme,
    profilePicture,
    setProfilePicture,
    chatWallpaper,
    setChatWallpaper,
    wallpaperOpacity,
    setWallpaperOpacity,
    setLockscreenWallpaper,
    setLockscreenOpacity,
    syncWallpaper,
    syncOpacity,
  } = useUIStore()
  const { changePassword } = useAuthStore()
  const { password: currentSessionPassword } = useWalletStore()

  const [gatewayUrl, setGatewayUrl] = useState(openClawGatewayUrl || '')
  const [authToken, setAuthToken] = useState(openClawAuthToken || '')
  const [showAuthToken, setShowAuthToken] = useState(false)
  const [autoConnect, setAutoConnect] = useState(openClawAutoConnect)
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const [cgApiKey, setCgApiKey] = useState(coinGeckoApiKey || '')
  const [showCgApiKey, setShowCgApiKey] = useState(false)
  const [lockTimeout, setLockTimeout] = useState(autoLockTimeout.toString())
  const [autoLockEnabled, setAutoLockEnabled] = useState(autoLockTimeout > 0)

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  // Network management state (not fully used in mobile panel yet)
  const [, setNetworks] = useState<unknown[]>([])
  const [networkDialogOpen, setNetworkDialogOpen] = useState(false)
  const [editingNetwork, setEditingNetwork] = useState<
    (Network & { isCustom?: boolean }) | undefined
  >()
  const [, setNetworkError] = useState('')

  const [activeTab, setActiveTab] = useState('ai')

  // Load networks on mount
  useEffect(() => {
    loadNetworks()
  }, [])

  const loadNetworks = async () => {
    try {
      const allNetworks = await networkService.getAllNetworks()
      setNetworks(allNetworks)
    } catch (error) {
      console.error('Failed to load networks:', error)
    }
  }

  const handleSaveOpenClaw = async () => {
    await setOpenClawGatewayUrl(gatewayUrl.trim() || null)
    await setOpenClawAuthToken(authToken.trim() || null)
    await setOpenClawAutoConnect(autoConnect)
  }

  const handleTestConnection = async () => {
    if (!gatewayUrl.trim()) return
    setIsTestingConnection(true)
    try {
      if (connectionState === 'connected') disconnect()
      await handleSaveOpenClaw()
      await connect(gatewayUrl.trim(), authToken.trim() || undefined)
    } catch (error) {
      console.error('[Settings] Connection test failed:', error)
    } finally {
      setIsTestingConnection(false)
    }
  }

  const handleSaveCgApiKey = async () => {
    await setCoinGeckoApiKey(cgApiKey.trim() || null)
  }

  const isOpenClawChanged =
    gatewayUrl.trim() !== (openClawGatewayUrl || '') ||
    authToken.trim() !== (openClawAuthToken || '') ||
    autoConnect !== openClawAutoConnect
  const isCgApiKeyChanged = cgApiKey.trim() !== (coinGeckoApiKey || '')

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
      const timeout = parseInt(lockTimeout) || 1
      await setAutoLockTimeout(timeout)
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
      const success = await changePassword(currentPassword, newPassword)
      if (success) {
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
    } catch (error) {
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

  return (
    <>
      <div className="h-full flex flex-col bg-surface-base">
        {/* Tabs - no separate header, tabs serve as navigation */}
        <Tabs.Root
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col min-h-0"
        >
          <Tabs.List className="flex gap-1 p-3 border-b border-border-subtle overflow-x-auto flex-shrink-0 bg-surface-elevated">
            <Tabs.Trigger
              value="ai"
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-hover rounded-lg data-[state=active]:text-accent data-[state=active]:bg-accent/10 transition-colors whitespace-nowrap touch-manipulation min-h-[44px]"
            >
              <Brain className="w-4 h-4" />
              Config
            </Tabs.Trigger>
            <Tabs.Trigger
              value="security"
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-hover rounded-lg data-[state=active]:text-accent data-[state=active]:bg-accent/10 transition-colors whitespace-nowrap touch-manipulation min-h-[44px]"
            >
              <Shield className="w-4 h-4" />
              Security
            </Tabs.Trigger>
            <Tabs.Trigger
              value="appearance"
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-hover rounded-lg data-[state=active]:text-accent data-[state=active]:bg-accent/10 transition-colors whitespace-nowrap touch-manipulation min-h-[44px]"
            >
              <Palette className="w-4 h-4" />
              Theme
            </Tabs.Trigger>
          </Tabs.List>

          {/* Config Tab */}
          <Tabs.Content value="ai" className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* OpenClaw Gateway */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-medium text-text-primary">OpenClaw Gateway</h3>
                <div
                  className={`flex items-center gap-2 px-2 py-1 rounded-full text-xs ${
                    connectionState === 'connected'
                      ? 'bg-green-500/20 text-green-400'
                      : connectionState === 'connecting' || connectionState === 'reconnecting'
                        ? 'bg-cyan-500/20 text-cyan-400'
                        : connectionState === 'error'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-white/5 text-text-tertiary'
                  }`}
                >
                  {connectionState === 'connected' ? (
                    <>
                      <Wifi className="w-3 h-3" /> Connected
                    </>
                  ) : connectionState === 'connecting' || connectionState === 'reconnecting' ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />{' '}
                      {connectionState === 'reconnecting' ? 'Reconnecting...' : 'Connecting...'}
                    </>
                  ) : connectionState === 'error' ? (
                    <>
                      <AlertCircle className="w-3 h-3" /> Error
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-3 h-3" /> Disconnected
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Gateway URL
                  </label>
                  <input
                    type="text"
                    value={gatewayUrl}
                    onChange={(e) => setGatewayUrl(e.target.value)}
                    placeholder="ws://localhost:8080"
                    className={themeConfig.styles.input}
                    style={{ fontSize: '16px' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Auth Token (Optional)
                  </label>
                  <div className="relative">
                    <input
                      type={showAuthToken ? 'text' : 'password'}
                      value={authToken}
                      onChange={(e) => setAuthToken(e.target.value)}
                      placeholder="Your auth token..."
                      className={`${themeConfig.styles.input} pr-10`}
                      style={{ fontSize: '16px' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowAuthToken(!showAuthToken)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded touch-manipulation"
                    >
                      {showAuthToken ? (
                        <EyeOff className="w-4 h-4 text-text-secondary" />
                      ) : (
                        <Eye className="w-4 h-4 text-text-secondary" />
                      )}
                    </button>
                  </div>
                </div>

                <label className="flex items-center gap-3 cursor-pointer min-h-[44px]">
                  <input
                    type="checkbox"
                    checked={autoConnect}
                    onChange={(e) => setAutoConnect(e.target.checked)}
                    className={themeConfig.styles.checkbox}
                  />
                  <span className="text-sm text-text-secondary">Auto-connect on startup</span>
                </label>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={handleTestConnection}
                    disabled={!gatewayUrl.trim() || isTestingConnection}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 min-h-[44px] bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 rounded-lg text-sm font-medium text-cyan-400 transition-colors disabled:opacity-50 touch-manipulation"
                  >
                    {isTestingConnection ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Testing...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" /> Test
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleSaveOpenClaw}
                    disabled={!isOpenClawChanged}
                    className={`flex-1 min-h-[44px] ${themeConfig.styles.buttonSettings || themeConfig.styles.buttonPrimary} disabled:opacity-50 touch-manipulation`}
                    style={
                      themeConfig.dynamicStyles.buttonSettings ||
                      themeConfig.dynamicStyles.buttonPrimary
                    }
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>

            {/* CoinGecko API */}
            <div className="border-t border-border-subtle pt-6">
              <h3 className="text-base font-medium text-text-primary mb-4">Market Data</h3>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  CoinGecko API Key
                </label>
                <div className="relative">
                  <input
                    type={showCgApiKey ? 'text' : 'password'}
                    value={cgApiKey}
                    onChange={(e) => setCgApiKey(e.target.value)}
                    placeholder="CG-..."
                    className={`${themeConfig.styles.input} pr-10`}
                    style={{ fontSize: '16px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCgApiKey(!showCgApiKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded touch-manipulation"
                  >
                    {showCgApiKey ? (
                      <EyeOff className="w-4 h-4 text-text-secondary" />
                    ) : (
                      <Eye className="w-4 h-4 text-text-secondary" />
                    )}
                  </button>
                </div>
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={handleSaveCgApiKey}
                    disabled={!isCgApiKeyChanged}
                    className={`min-h-[44px] ${themeConfig.styles.buttonSettings || themeConfig.styles.buttonPrimary} disabled:opacity-50 touch-manipulation`}
                    style={
                      themeConfig.dynamicStyles.buttonSettings ||
                      themeConfig.dynamicStyles.buttonPrimary
                    }
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </Tabs.Content>

          {/* Security Tab */}
          <Tabs.Content value="security" className="flex-1 overflow-y-auto p-4 space-y-6">
            <div>
              <h3 className="text-base font-medium text-text-primary mb-4">Change Password</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      className={`${themeConfig.styles.input} pr-10`}
                      style={{ fontSize: '16px' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded touch-manipulation"
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="w-4 h-4 text-text-secondary" />
                      ) : (
                        <Eye className="w-4 h-4 text-text-secondary" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className={`${themeConfig.styles.input} pr-10`}
                      style={{ fontSize: '16px' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded touch-manipulation"
                    >
                      {showNewPassword ? (
                        <EyeOff className="w-4 h-4 text-text-secondary" />
                      ) : (
                        <Eye className="w-4 h-4 text-text-secondary" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className={themeConfig.styles.input}
                    style={{ fontSize: '16px' }}
                  />
                </div>

                {passwordError && (
                  <div className="flex items-center gap-2 p-3 bg-accent/10 border border-accent/30 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-accent flex-shrink-0" />
                    <p className="text-sm text-accent-400">{passwordError}</p>
                  </div>
                )}

                {passwordSuccess && (
                  <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <p className="text-sm text-green-400">Password changed successfully!</p>
                  </div>
                )}

                <button
                  onClick={handlePasswordChange}
                  disabled={
                    isChangingPassword || !currentPassword || !newPassword || !confirmNewPassword
                  }
                  className={`w-full min-h-[44px] ${themeConfig.styles.buttonSettings || themeConfig.styles.buttonPrimary} disabled:opacity-50 touch-manipulation`}
                  style={
                    themeConfig.dynamicStyles.buttonSettings ||
                    themeConfig.dynamicStyles.buttonPrimary
                  }
                >
                  {isChangingPassword ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </div>

            <div className="border-t border-border-subtle pt-6">
              <h3 className="text-base font-medium text-text-primary mb-4">Auto-lock</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between min-h-[44px]">
                  <span className="text-sm text-text-secondary">Enable Auto-lock</span>
                  <button
                    onClick={() => handleAutoLockToggle(!autoLockEnabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors touch-manipulation ${
                      autoLockEnabled
                        ? 'bg-accent'
                        : 'bg-surface-elevated border border-border-default'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${autoLockEnabled ? 'translate-x-6' : 'translate-x-1'}`}
                    />
                  </button>
                </div>

                {autoLockEnabled && (
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Timeout (minutes)
                    </label>
                    <input
                      type="number"
                      value={lockTimeout}
                      onChange={(e) => handleAutoLockTimeoutChange(e.target.value)}
                      min="1"
                      max="60"
                      className={themeConfig.styles.input}
                      style={{ fontSize: '16px' }}
                    />
                  </div>
                )}
              </div>
            </div>
          </Tabs.Content>

          {/* Appearance Tab */}
          <Tabs.Content value="appearance" className="flex-1 overflow-y-auto p-4 space-y-6">
            <div>
              <h3 className="text-base font-medium text-text-primary mb-4">Theme</h3>
              <Select.Root
                value={theme}
                onValueChange={(value) => setTheme(value as 'light' | 'dark' | 'xipz')}
              >
                <Select.Trigger className="w-full flex items-center justify-between gap-2 px-4 py-3 min-h-[44px] text-sm bg-surface-elevated rounded-lg border border-border-subtle touch-manipulation">
                  <Select.Value>
                    <span className="text-text-primary">
                      {theme === 'xipz'
                        ? 'Xipz Mode'
                        : theme === 'dark'
                          ? 'Dark Mode'
                          : 'Light Mode'}
                    </span>
                  </Select.Value>
                  <Select.Icon>
                    <ChevronDown className="w-4 h-4 text-text-secondary" />
                  </Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content className="min-w-[200px] bg-surface-base rounded-lg shadow-lg border border-border-subtle p-1 z-[100]">
                    <Select.Viewport>
                      <Select.Item
                        value="light"
                        className="flex items-center justify-between px-4 py-3 min-h-[44px] text-sm rounded cursor-pointer transition-colors text-text-primary hover:bg-surface-hover data-[highlighted]:bg-surface-hover touch-manipulation"
                      >
                        <Select.ItemText>Light Mode</Select.ItemText>
                        <Sun className="w-4 h-4" />
                      </Select.Item>
                      <Select.Item
                        value="dark"
                        className="flex items-center justify-between px-4 py-3 min-h-[44px] text-sm rounded cursor-pointer transition-colors text-text-primary hover:bg-surface-hover data-[highlighted]:bg-surface-hover touch-manipulation"
                      >
                        <Select.ItemText>Dark Mode</Select.ItemText>
                        <Moon className="w-4 h-4" />
                      </Select.Item>
                      <Select.Item
                        value="xipz"
                        className="flex items-center justify-between px-4 py-3 min-h-[44px] text-sm rounded cursor-pointer transition-colors text-text-primary hover:bg-surface-hover data-[highlighted]:bg-surface-hover touch-manipulation"
                      >
                        <Select.ItemText>Xipz Mode</Select.ItemText>
                        <Palette className="w-4 h-4" />
                      </Select.Item>
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
            </div>

            <div className="border-t border-border-subtle pt-6">
              <h3 className="text-base font-medium text-text-primary mb-4">Profile</h3>
              <ImageUpload
                currentImage={profilePicture}
                onImageChange={setProfilePicture}
                label="Profile Picture"
                description="Appears on lock screen and in chats"
                aspectRatio="square"
                maxSizeInMB={2}
              />
            </div>

            <div className="border-t border-border-subtle pt-6">
              <h3 className="text-base font-medium text-text-primary mb-4">Wallpaper</h3>
              <ImageUpload
                currentImage={chatWallpaper}
                onImageChange={(url) => {
                  setChatWallpaper(url)
                  if (syncWallpaper) setLockscreenWallpaper(url)
                }}
                label="Chat Wallpaper"
                description="Background for the chat interface"
                maxSizeInMB={5}
              />

              {chatWallpaper && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Opacity
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="0"
                      max="50"
                      step="5"
                      value={wallpaperOpacity * 100}
                      onChange={(e) => {
                        const opacity = parseInt(e.target.value) / 100
                        setWallpaperOpacity(opacity)
                        if (syncOpacity) setLockscreenOpacity(opacity)
                      }}
                      className="flex-1 h-2 bg-surface-elevated rounded-lg appearance-none cursor-pointer"
                    />
                    <span className="text-sm text-text-secondary w-12 text-right">
                      {Math.round(wallpaperOpacity * 100)}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          </Tabs.Content>
        </Tabs.Root>
      </div>

      <NetworkManagementDialog
        open={networkDialogOpen}
        onOpenChange={setNetworkDialogOpen}
        network={editingNetwork}
        onSave={handleAddNetwork}
        onUpdate={handleUpdateNetwork}
      />
    </>
  )
}
