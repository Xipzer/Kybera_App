/**
 * Code by Xipzer
 */

import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import * as Tabs from '@radix-ui/react-tabs'
import {
  X,
  Eye,
  EyeOff,
  Shield,
  Palette,
  AlertCircle,
  Check,
  Plus,
  Edit2,
  Trash2,
  LogIn,
  CreditCard,
  Maximize2,
  Minimize2,
  RotateCcw,
} from 'lucide-react'
import { SiBasicattentiontoken } from 'react-icons/si'
import { ImageUpload } from '../common/ImageUpload'
import { useTheme } from '../../hooks/useTheme'
import { useSettingsState } from '../../hooks/useSettingsState'
import { useUIStore } from '../../store/uiStore'
import { NetworkManagementDialog } from './NetworkManagementDialog'
import { NetworkIcon } from '../NetworkIcons'
import { ModernToggle, ModernButton, ModernAlert } from '../ModernDialog'
import {
  ConnectionBadge,
  ConnectionDot,
  ModelSelect,
  ProviderSelect,
  PROVIDER_LABELS,
  SecretInput,
  ThemeSelector,
  OpacitySlider,
} from './SettingsPanel'
import { X402Settings } from './X402Settings'

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  maximized?: boolean
}

export function SettingsDialog({ open, onOpenChange, maximized = false }: SettingsDialogProps) {
  const s = useSettingsState({ isOpen: open })
  const { theme: themeConfig } = useTheme()
  const [showApiKey, setShowApiKey] = useState(false)
  const {
    theme,
    setTheme,
    profilePicture,
    setProfilePicture,
    chatWallpaper,
    setChatWallpaper,
    wallpaperOpacity,
    setWallpaperOpacity,
    lockscreenWallpaper,
    setLockscreenWallpaper,
    lockscreenOpacity,
    setLockscreenOpacity,
    syncWallpaper,
    setSyncWallpaper,
    syncOpacity,
    setSyncOpacity,
    particlesLockscreen,
    setParticlesLockscreen,
    particlesApp,
    setParticlesApp,
  } = s.uiStore

  const setSettingsMaximized = useUIStore((st) => st.setSettingsMaximized)
  const resetUI = useUIStore((st) => st.resetUI)

  const handleMaximize = () => {
    setSettingsMaximized(true)
  }

  const handleMinimize = () => {
    setSettingsMaximized(false)
  }

  const tabTriggerClass = "flex items-center gap-2 sm:gap-3 px-3 py-2 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-hover rounded-lg data-[state=active]:text-accent-500 data-[state=active]:bg-accent-500/10 transition-colors sm:w-full text-left whitespace-nowrap touch-manipulation min-h-[44px]"

  const settingsContent = (
    <Tabs.Root
      value={s.activeTab}
      onValueChange={s.setActiveTab}
      className="flex-1 flex flex-col sm:flex-row min-h-0"
    >
      <div className={`${maximized ? 'sm:w-56' : 'sm:w-48'} bg-surface-elevated border-b sm:border-b-0 sm:border-r border-border-subtle flex-shrink-0`}>
        {!maximized && (
          <>
            <div className="hidden sm:block p-4 border-b border-border-subtle">
              <h2 className="text-lg font-semibold text-text-primary">Settings</h2>
            </div>
            <div className="flex sm:hidden items-center justify-between p-4 border-b border-border-subtle">
              <h2 className="text-lg font-semibold text-text-primary">Settings</h2>
            </div>
          </>
        )}
        <Tabs.List className="flex sm:flex-col gap-1 sm:space-y-1 p-2 overflow-x-auto sm:overflow-x-visible">
                  <Tabs.Trigger value="ai" className={tabTriggerClass}>
                    <SiBasicattentiontoken className="w-4 h-4" />
                    <span className="hidden sm:inline">Configuration</span>
                    <span className="sm:hidden">Config</span>
                  </Tabs.Trigger>
                  <Tabs.Trigger value="payments" className={tabTriggerClass}>
                    <CreditCard className="w-4 h-4" />
                    x402 Payments
                  </Tabs.Trigger>
                  <Tabs.Trigger value="security" className={tabTriggerClass}>
                    <Shield className="w-4 h-4" />
                    Security
                  </Tabs.Trigger>
                  <Tabs.Trigger value="appearance" className={tabTriggerClass}>
                    <Palette className="w-4 h-4" />
                    <span className="hidden sm:inline">Interface</span>
                    <span className="sm:hidden">Theme</span>
                  </Tabs.Trigger>
                </Tabs.List>
              </div>

              <div className="flex-1 overflow-hidden relative min-h-0">
                <div className={`absolute inset-0 ${maximized ? '' : 'sm:top-[60px]'} overflow-hidden`}>
                  <Tabs.Content
                    value="ai"
                    className="h-full overflow-y-auto px-4 sm:px-6 py-4 sm:py-6 space-y-6 settings-scroll"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-text-primary">AI Provider</h3>
                        <ConnectionBadge connectionState={s.connectionState} size="md" />
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-text-secondary mb-2">
                            Provider
                          </label>
                          <ProviderSelect provider={s.provider} onSelect={s.handleSelectProvider} />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-text-secondary mb-2">
                            Model
                          </label>
                          <ModelSelect
                            model={s.model}
                            models={s.availableModels}
                            onSelect={s.handleSelectModel}
                          />
                        </div>

                        {s.isSignedIn ? (
                          <div className="flex items-center justify-between p-3 bg-surface-elevated rounded-lg border border-border-subtle">
                            <div className="flex items-center gap-2">
                              <ConnectionDot connectionState={s.connectionState} />
                              <span className="text-sm text-text-primary">
                                Connected as {PROVIDER_LABELS[s.provider]}
                              </span>
                            </div>
                            <ModernButton variant="ghost" size="sm" onClick={s.handleSignOut}>
                              Sign out
                            </ModernButton>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {s.supportsOAuth && (
                              <>
                                <ModernButton
                                  variant="primary"
                                  onClick={s.handleStartOAuth}
                                  loading={s.isSigningIn}
                                  icon={<LogIn className="w-4 h-4" />}
                                >
                                  {s.isSigningIn
                                    ? 'Signing in...'
                                    : `Sign in with ${PROVIDER_LABELS[s.provider]}`}
                                </ModernButton>

                                {s.oauthSession && (
                                  <div className="p-3 bg-surface-elevated rounded-lg border border-border-subtle space-y-2">
                                    <label className="block text-xs font-medium text-text-secondary">
                                      After signing in, your browser lands on a page that won't load
                                      — copy the code (or full URL) from the address bar and paste it
                                      here.
                                    </label>
                                    <input
                                      type="text"
                                      value={s.manualCode}
                                      onChange={(e) => s.setManualCode(e.target.value)}
                                      placeholder="Paste code or redirect URL..."
                                      className={themeConfig.styles.input}
                                      style={{ fontSize: '16px' }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') s.handleSubmitManualCode()
                                      }}
                                    />
                                    <ModernButton
                                      variant="primary"
                                      size="sm"
                                      onClick={s.handleSubmitManualCode}
                                      disabled={!s.manualCode.trim()}
                                      icon={<Check className="w-3.5 h-3.5" />}
                                    >
                                      Submit code
                                    </ModernButton>
                                  </div>
                                )}

                                <div className="flex items-center gap-3">
                                  <div className="flex-1 border-t border-border-subtle" />
                                  <span className="text-xs text-text-tertiary">
                                    or use an API key
                                  </span>
                                  <div className="flex-1 border-t border-border-subtle" />
                                </div>
                              </>
                            )}

                            <SecretInput
                              label="API Key"
                              value={s.apiKeyInput}
                              onChange={s.setApiKeyInput}
                              show={showApiKey}
                              onToggle={() => setShowApiKey(!showApiKey)}
                              placeholder={`Enter your ${PROVIDER_LABELS[s.provider]} API key...`}
                              inputClassName={themeConfig.styles.input}
                            />
                            <div className="flex justify-end">
                              <ModernButton
                                variant="secondary"
                                onClick={s.handleSaveApiKey}
                                disabled={!s.apiKeyInput.trim()}
                              >
                                Save key
                              </ModernButton>
                            </div>
                          </div>
                        )}

                        <ModernToggle
                          checked={s.autoConnect}
                          onChange={s.setAutoConnect}
                          label="Auto-connect"
                          description="Automatically connect on startup"
                        />

                        {s.llmError && (
                          <ModernAlert type="error" icon={<AlertCircle className="w-4 h-4" />}>
                            {s.llmError}
                          </ModernAlert>
                        )}
                      </div>
                    </div>

                    <div className="border-t border-border-subtle pt-6">
                      <h3 className="text-lg font-medium text-text-primary mb-1">API Keys</h3>
                      <p className="text-xs text-text-tertiary mb-4">
                        Override .env values at runtime. Clearing a field falls back to .env.
                      </p>

                      <div className="space-y-4">
                        <SecretInput
                          label="Alchemy API Key"
                          value={s.alchemyKey}
                          onChange={s.setAlchemyKey}
                          show={s.showAlchemyKey}
                          onToggle={() => s.setShowAlchemyKey(!s.showAlchemyKey)}
                          placeholder="Enter Alchemy key..."
                          inputClassName={themeConfig.styles.input}
                          helpLink="https://www.alchemy.com/"
                        />
                        <SecretInput
                          label="Helius API Key"
                          value={s.heliusKey}
                          onChange={s.setHeliusKey}
                          show={s.showHeliusKey}
                          onToggle={() => s.setShowHeliusKey(!s.showHeliusKey)}
                          placeholder="Enter Helius key..."
                          inputClassName={themeConfig.styles.input}
                          helpLink="https://www.helius.dev/"
                        />
                        <SecretInput
                          label="CoinGecko API Key"
                          value={s.cgApiKey}
                          onChange={s.setCgApiKey}
                          show={s.showCgApiKey}
                          onToggle={() => s.setShowCgApiKey(!s.showCgApiKey)}
                          placeholder="CG-..."
                          inputClassName={themeConfig.styles.input}
                          helpLink="https://www.coingecko.com/en/api/pricing"
                        />
                        <div className="flex justify-end">
                          <ModernButton
                            variant="primary"
                            onClick={s.handleSaveApiKeys}
                            disabled={!s.isApiKeysChanged}
                          >
                            Save
                          </ModernButton>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-border-subtle pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-text-primary">
                          Network Management
                        </h3>
                        <button
                          onClick={() => {
                            s.setEditingNetwork(undefined)
                            s.setNetworkDialogOpen(true)
                          }}
                          className={`${themeConfig.styles.buttonIcon} p-2 rounded-lg`}
                          title="Add Network"
                        >
                          <Plus className="w-4 h-4 text-text-secondary" />
                        </button>
                      </div>

                      {s.networkError && (
                        <div className="mb-4">
                          <ModernAlert type="error" icon={<AlertCircle className="w-4 h-4" />}>
                            {s.networkError}
                          </ModernAlert>
                        </div>
                      )}

                      <div className="space-y-2">
                        {s.networks.map((network) => (
                          <div
                            key={network.id}
                            className={`flex items-center justify-between p-3 rounded-lg border ${
                              network.isHidden
                                ? 'bg-surface-hover/50 border-border-subtle opacity-60'
                                : 'bg-surface-elevated border-border-subtle'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <NetworkIcon
                                networkId={network.id}
                                logoURI={network.logoURI}
                                name={network.name}
                                size={32}
                              />
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-text-primary">
                                    {network.name}
                                  </span>
                                  {network.isCustom && (
                                    <span className="text-xs px-2 py-0.5 bg-accent-500/10 text-accent-500 rounded">
                                      Custom
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 text-xs text-text-tertiary">
                                  <span>{network.type}</span>
                                  <span>•</span>
                                  <span>Chain ID: {network.chainId}</span>
                                  <span>•</span>
                                  <span>{network.symbol}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => s.handleToggleNetworkVisibility(network.id)}
                                className="p-1.5 rounded hover:bg-surface-hover transition-colors"
                                title={network.isHidden ? 'Show network' : 'Hide network'}
                                aria-label={network.isHidden ? 'Show network' : 'Hide network'}
                              >
                                {network.isHidden ? (
                                  <EyeOff className="w-4 h-4 text-text-secondary" />
                                ) : (
                                  <Eye className="w-4 h-4 text-text-secondary" />
                                )}
                              </button>

                              {network.isCustom && (
                                <>
                                  <button
                                    onClick={() => {
                                      s.setEditingNetwork(network)
                                      s.setNetworkDialogOpen(true)
                                    }}
                                    className="p-1.5 rounded hover:bg-surface-hover transition-colors"
                                    aria-label="Edit network"
                                  >
                                    <Edit2 className="w-4 h-4 text-text-secondary" />
                                  </button>
                                  <button
                                    onClick={() => s.handleRemoveNetwork(network.id)}
                                    className="p-1.5 rounded hover:bg-surface-hover transition-colors hover:text-accent-500"
                                    aria-label="Delete network"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      <p className="mt-4 text-xs text-text-tertiary">
                        Add custom networks or hide default networks that you don't use. Hidden
                        networks won't appear in the network selector.
                      </p>
                    </div>

                  </Tabs.Content>

                  <Tabs.Content
                    value="security"
                    className="h-full overflow-y-auto px-4 sm:px-6 py-4 sm:py-6 space-y-6 settings-scroll"
                  >
                    <div>
                      <h3 className="text-lg font-medium text-text-primary mb-4">
                        Password & Authentication
                      </h3>

                      <div className="space-y-4">
                        <SecretInput
                          label="Current Password"
                          value={s.currentPassword}
                          onChange={s.setCurrentPassword}
                          show={s.showCurrentPassword}
                          onToggle={() => s.setShowCurrentPassword(!s.showCurrentPassword)}
                          placeholder="Enter current password"
                          inputClassName={themeConfig.styles.input}
                        />

                        <SecretInput
                          label="New Password"
                          value={s.newPassword}
                          onChange={s.setNewPassword}
                          show={s.showNewPassword}
                          onToggle={() => s.setShowNewPassword(!s.showNewPassword)}
                          placeholder="Enter new password"
                          inputClassName={themeConfig.styles.input}
                        />

                        <div>
                          <label className="block text-sm font-medium text-text-secondary mb-2">
                            Confirm New Password
                          </label>
                          <input
                            type="password"
                            value={s.confirmNewPassword}
                            onChange={(e) => s.setConfirmNewPassword(e.target.value)}
                            placeholder="Confirm new password"
                            className={themeConfig.styles.input}
                            style={{ fontSize: '16px' }}
                          />
                        </div>

                        {s.passwordError && (
                          <ModernAlert type="error" icon={<AlertCircle className="w-4 h-4" />}>
                            {s.passwordError}
                          </ModernAlert>
                        )}

                        {s.passwordSuccess && (
                          <ModernAlert type="success" icon={<Check className="w-4 h-4" />}>
                            Password changed successfully!
                          </ModernAlert>
                        )}

                        <ModernButton
                          variant="primary"
                          onClick={s.handlePasswordChange}
                          disabled={!s.currentPassword || !s.newPassword || !s.confirmNewPassword}
                          loading={s.isChangingPassword}
                        >
                          {s.isChangingPassword ? 'Re-encrypting wallets...' : 'Change Password'}
                        </ModernButton>
                      </div>
                    </div>

                    <div className="border-t border-border-subtle pt-6">
                      <h3 className="text-lg font-medium text-text-primary mb-4">
                        Auto-lock Settings
                      </h3>

                      <div className="space-y-4">
                        <ModernToggle
                          checked={s.autoLockEnabled}
                          onChange={s.handleAutoLockToggle}
                          label="Enable Auto-lock"
                          description="Automatically lock the wallet after inactivity"
                        />

                        {s.autoLockEnabled && (
                          <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">
                              Timeout (minutes)
                            </label>
                            <input
                              type="number"
                              value={s.lockTimeout}
                              onChange={(e) => s.handleAutoLockTimeoutChange(e.target.value)}
                              onBlur={(e) => {
                                if (!e.target.value || parseInt(e.target.value) < 1) {
                                  s.handleAutoLockTimeoutChange('1')
                                }
                              }}
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

                  <Tabs.Content
                    value="appearance"
                    className="h-full overflow-y-auto px-4 sm:px-6 py-4 sm:py-6 space-y-6 settings-scroll"
                  >
                    <div>
                      <h3 className="text-lg font-medium text-text-primary mb-4">Theme Settings</h3>

                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">
                          Theme Mode
                        </label>
                        <ThemeSelector theme={theme} setTheme={setTheme} />
                        <p className="mt-2 text-xs text-text-tertiary">
                          Choose your preferred theme mode
                        </p>
                      </div>

                      <div className="mt-6 space-y-4">
                        <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                          Particle Effects
                        </p>
                        <ModernToggle
                          checked={particlesLockscreen}
                          onChange={setParticlesLockscreen}
                          label="Lockscreen"
                          description="Animated particles on the lock screen"
                        />
                        <ModernToggle
                          checked={particlesApp}
                          onChange={setParticlesApp}
                          label="App"
                          description="Animated particles in the wallet drawer and chat header"
                        />
                      </div>
                    </div>

                    <div className="border-t border-border-subtle pt-6">
                      <h3 className="text-lg font-medium text-text-primary mb-4">
                        Personalization
                      </h3>

                      <div className="space-y-6">
                        <ImageUpload
                          currentImage={profilePicture}
                          onImageChange={setProfilePicture}
                          label="Profile Picture"
                          description="This image will appear on the lock screen and in chats"
                          aspectRatio="square"
                          maxSizeInMB={2}
                        />

                        <div className="mt-6">
                          <div className="space-y-4 mb-6">
                            <ModernToggle
                              checked={syncWallpaper}
                              onChange={setSyncWallpaper}
                              label="Sync Wallpaper"
                              description="Use the same wallpaper for chat and lockscreen"
                            />
                            <ModernToggle
                              checked={syncOpacity}
                              onChange={setSyncOpacity}
                              label="Sync Opacity"
                              description="Use the same opacity for chat and lockscreen wallpapers"
                            />
                          </div>

                          {syncWallpaper ? (
                            <>
                              <ImageUpload
                                currentImage={chatWallpaper}
                                onImageChange={(url) => {
                                  setChatWallpaper(url)
                                  setLockscreenWallpaper(url)
                                }}
                                label="Wallpaper"
                                description="Set a custom wallpaper to be used for the chat and lockscreen"
                                maxSizeInMB={5}
                              />

                              {chatWallpaper && (
                                <div className="mt-4 space-y-4">
                                  {syncOpacity ? (
                                    <OpacitySlider
                                      label="Wallpaper Opacity"
                                      value={wallpaperOpacity}
                                      onChange={(v) => {
                                        setWallpaperOpacity(v)
                                        setLockscreenOpacity(v)
                                      }}
                                      description="Adjust the transparency of the wallpaper"
                                    />
                                  ) : (
                                    <>
                                      <OpacitySlider
                                        label="Wallpaper Opacity (Chat)"
                                        value={wallpaperOpacity}
                                        onChange={setWallpaperOpacity}
                                        description="Adjust the transparency of the chat wallpaper"
                                      />
                                      <OpacitySlider
                                        label="Wallpaper Opacity (Lockscreen)"
                                        value={lockscreenOpacity}
                                        onChange={setLockscreenOpacity}
                                        description="Adjust the transparency of the lockscreen wallpaper"
                                      />
                                    </>
                                  )}
                                </div>
                              )}
                            </>
                          ) : (
                            <>
                              <ImageUpload
                                currentImage={chatWallpaper}
                                onImageChange={setChatWallpaper}
                                label="Chat Wallpaper"
                                description="Set a custom wallpaper for the chat interface"
                                maxSizeInMB={5}
                              />

                              {chatWallpaper && (
                                <OpacitySlider
                                  label="Wallpaper Opacity"
                                  value={wallpaperOpacity}
                                  onChange={setWallpaperOpacity}
                                  description="Adjust the transparency of the chat wallpaper"
                                />
                              )}

                              <div className="mt-6">
                                <ImageUpload
                                  currentImage={lockscreenWallpaper}
                                  onImageChange={setLockscreenWallpaper}
                                  label="Lockscreen Wallpaper"
                                  description="Set a custom background for the lock screen"
                                  maxSizeInMB={5}
                                />

                                {lockscreenWallpaper && (
                                  <OpacitySlider
                                    label="Wallpaper Opacity"
                                    value={lockscreenOpacity}
                                    onChange={setLockscreenOpacity}
                                    description="Adjust the transparency of the lockscreen wallpaper"
                                  />
                                )}
                              </div>
                            </>
                          )}
                         </div>
                      </div>
                    </div>

                    <div className="border-t border-border-subtle pt-6">
                      <h3 className="text-lg font-medium text-text-primary mb-2">Restore Defaults</h3>
                      <p className="text-sm text-text-secondary mb-4">
                        Reset all interface settings to their defaults, including theme, wallpapers, particle effects, and panel positions.
                      </p>
                      <button
                        onClick={() => {
                          if (confirm('Reset all interface settings to defaults? This cannot be undone.')) {
                            resetUI()
                          }
                        }}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/30 rounded-lg transition-all duration-200"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Reset Interface Settings
                      </button>
                    </div>
                  </Tabs.Content>

                  <Tabs.Content
                    value="payments"
                    className="h-full overflow-y-auto px-4 sm:px-6 py-4 sm:py-6 space-y-6 settings-scroll"
                  >
                    <X402Settings />
                  </Tabs.Content>
                </div>
              </div>
            </Tabs.Root>
  )

  if (maximized) {
    return (
      <>
        <div className="h-full flex flex-col bg-surface-base overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle bg-surface-elevated flex-shrink-0">
            <h2 className="text-lg font-semibold text-text-primary">Settings</h2>
            <div className="flex items-center gap-1">
              <button
                onClick={handleMinimize}
                className="p-2 rounded-lg hover:bg-surface-hover transition-colors"
                title="Pop out to dialog"
                aria-label="Pop out to dialog"
              >
                <Minimize2 className="w-4 h-4 text-text-secondary" />
              </button>
              <button
                onClick={() => onOpenChange(false)}
                className="p-2 rounded-lg hover:bg-surface-hover transition-colors"
                title="Close settings"
                aria-label="Close settings"
              >
                <X className="w-5 h-5 text-text-secondary" />
              </button>
            </div>
          </div>
          <div className="flex-1 flex min-h-0">
            {settingsContent}
          </div>
        </div>

        <NetworkManagementDialog
          open={s.networkDialogOpen}
          onOpenChange={s.setNetworkDialogOpen}
          network={s.editingNetwork}
          onSave={s.handleAddNetwork}
          onUpdate={s.handleUpdateNetwork}
        />
      </>
    )
  }

  return (
    <>
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content
            aria-describedby={undefined}
            className="dialog-content bg-surface-base rounded-none sm:rounded-xl shadow-2xl border-0 sm:border border-border-subtle w-full h-full sm:w-[95vw] sm:max-w-[800px] sm:h-[85vh] sm:max-h-[600px] flex overflow-hidden"
          >
            <Dialog.Title className="sr-only">Settings</Dialog.Title>
            <div className="absolute top-4 right-4 z-10 flex items-center gap-1">
              <button
                onClick={handleMaximize}
                className="p-2 rounded-lg hover:bg-surface-hover transition-colors"
                title="Maximize settings"
                aria-label="Maximize settings"
              >
                <Maximize2 className="w-4 h-4 text-text-secondary" />
              </button>
              <Dialog.Close asChild>
                <button
                  className="p-2 rounded-lg hover:bg-surface-hover transition-colors"
                  aria-label="Close settings"
                >
                  <X className="w-5 h-5 text-text-secondary" />
                </button>
              </Dialog.Close>
            </div>

            {settingsContent}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <NetworkManagementDialog
        open={s.networkDialogOpen}
        onOpenChange={s.setNetworkDialogOpen}
        network={s.editingNetwork}
        onSave={s.handleAddNetwork}
        onUpdate={s.handleUpdateNetwork}
      />
    </>
  )
}