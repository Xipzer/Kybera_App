/**
 * Code by Xipzer
 */

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
import { ImageUpload } from '../common/ImageUpload'
import { useTheme } from '../../hooks/useTheme'
import { useSettingsState } from '../../hooks/useSettingsState'
import { NetworkManagementDialog } from './NetworkManagementDialog'
import { ModernToggle, ModernButton, ModernAlert } from '../ModernDialog'

export function SettingsPanel() {
  const s = useSettingsState()
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
  } = s.uiStore

  return (
    <>
      <div className="h-full flex flex-col bg-surface-base">
        <Tabs.Root
          value={s.activeTab}
          onValueChange={s.setActiveTab}
          className="flex-1 flex flex-col min-h-0"
        >
          <Tabs.List className="flex justify-center gap-1 p-3 border-b border-border-subtle overflow-x-auto flex-shrink-0">
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

          <Tabs.Content value="ai" className="flex-1 overflow-y-auto p-4 space-y-6">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-medium text-text-primary">OpenClaw Gateway</h3>
                <ConnectionBadge connectionState={s.connectionState} size="sm" />
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Gateway URL
                  </label>
                  <input
                    type="text"
                    value={s.gatewayUrl}
                    onChange={(e) => s.setGatewayUrl(e.target.value)}
                    placeholder="ws://localhost:8080"
                    className={themeConfig.styles.input}
                    style={{ fontSize: '16px' }}
                  />
                </div>

                <SecretInput
                  label="Auth Token (Optional)"
                  value={s.authToken}
                  onChange={s.setAuthToken}
                  show={s.showAuthToken}
                  onToggle={() => s.setShowAuthToken(!s.showAuthToken)}
                  placeholder="Your auth token..."
                  inputClassName={themeConfig.styles.input}
                />

                <ModernToggle
                  checked={s.autoConnect}
                  onChange={s.setAutoConnect}
                  label="Auto-connect on startup"
                  description="Automatically connect to OpenClaw when app starts"
                />

                <div className="flex items-center gap-3 pt-2">
                  <ModernButton
                    variant="secondary"
                    onClick={s.handleTestConnection}
                    disabled={!s.gatewayUrl.trim()}
                    loading={s.isTestingConnection}
                    fullWidth
                    icon={<Zap className="w-4 h-4" />}
                  >
                    {s.isTestingConnection ? 'Testing...' : 'Test'}
                  </ModernButton>
                  <ModernButton
                    variant="primary"
                    onClick={s.handleSaveOpenClaw}
                    disabled={!s.isOpenClawChanged}
                    fullWidth
                  >
                    Save
                  </ModernButton>
                </div>
              </div>
            </div>

            <div className="border-t border-border-subtle pt-6">
              <h3 className="text-base font-medium text-text-primary mb-1">API Keys</h3>
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
          </Tabs.Content>

          <Tabs.Content value="security" className="flex-1 overflow-y-auto p-4 space-y-6">
            <div>
              <h3 className="text-base font-medium text-text-primary mb-4">Change Password</h3>
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
                  fullWidth
                >
                  {s.isChangingPassword ? 'Re-encrypting wallets...' : 'Change Password'}
                </ModernButton>
              </div>
            </div>

            <div className="border-t border-border-subtle pt-6">
              <h3 className="text-base font-medium text-text-primary mb-4">Auto-lock</h3>
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

          <Tabs.Content value="appearance" className="flex-1 overflow-y-auto p-4 space-y-6">
            <div>
              <h3 className="text-base font-medium text-text-primary mb-4">Theme</h3>
              <ThemeSelector theme={theme} setTheme={setTheme} />
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
                <OpacitySlider
                  label="Opacity"
                  value={wallpaperOpacity}
                  onChange={(v) => {
                    setWallpaperOpacity(v)
                    if (syncOpacity) setLockscreenOpacity(v)
                  }}
                />
              )}
            </div>
          </Tabs.Content>
        </Tabs.Root>
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

export function ConnectionBadge({
  connectionState,
  size = 'md',
}: {
  connectionState: string
  size?: 'sm' | 'md'
}) {
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'
  const padding = size === 'sm' ? 'px-2 py-1' : 'px-3 py-1.5'
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm'

  const styles =
    connectionState === 'connected'
      ? 'bg-green-500/20 text-green-400'
      : connectionState === 'connecting' || connectionState === 'reconnecting'
        ? 'bg-accent-500/20 text-accent-500'
        : connectionState === 'error'
          ? 'bg-red-500/20 text-red-400'
          : 'bg-white/5 text-text-tertiary'

  return (
    <div className={`flex items-center gap-2 ${padding} rounded-full ${textSize} ${styles}`}>
      {connectionState === 'connected' ? (
        <>
          <Wifi className={iconSize} /> Connected
        </>
      ) : connectionState === 'connecting' || connectionState === 'reconnecting' ? (
        <>
          <Loader2 className={`${iconSize} animate-spin`} />{' '}
          {connectionState === 'reconnecting' ? 'Reconnecting...' : 'Connecting...'}
        </>
      ) : connectionState === 'error' ? (
        <>
          <AlertCircle className={iconSize} /> Error
        </>
      ) : (
        <>
          <WifiOff className={iconSize} /> Disconnected
        </>
      )}
    </div>
  )
}

export function SecretInput({
  label,
  value,
  onChange,
  show,
  onToggle,
  placeholder,
  inputClassName,
  helpLink,
  helpText,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  show: boolean
  onToggle: () => void
  placeholder?: string
  inputClassName?: string
  helpLink?: string
  helpText?: string
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-text-secondary">{label}</label>
        {helpLink && (
          <a
            href={helpLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-accent-500 hover:text-accent-400 transition-colors"
          >
            {helpText || 'Get a free key'}
          </a>
        )}
      </div>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`${inputClassName} pr-10`}
          style={{ fontSize: '16px' }}
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded touch-manipulation hover:bg-surface-hover transition-colors"
        >
          {show ? (
            <EyeOff className="w-4 h-4 text-text-secondary" />
          ) : (
            <Eye className="w-4 h-4 text-text-secondary" />
          )}
        </button>
      </div>
    </div>
  )
}

export function ThemeSelector({
  theme,
  setTheme,
}: {
  theme: string
  setTheme: (value: 'light' | 'dark' | 'xipz' | 'ogDark' | 'ogLight') => void
}) {
  const themeLabel =
    theme === 'xipz'
      ? 'Xipz Mode'
      : theme === 'dark'
        ? 'Dark Mode'
        : theme === 'ogDark'
          ? 'OG Dark Mode'
          : theme === 'ogLight'
            ? 'OG Light Mode'
            : 'Light Mode'

  const themeOptions = [
    { value: 'light', label: 'Light Mode', icon: Sun },
    { value: 'dark', label: 'Dark Mode', icon: Moon },
    { value: 'xipz', label: 'Xipz Mode', icon: Palette },
    { value: 'ogDark', label: 'OG Dark Mode', icon: Zap },
    { value: 'ogLight', label: 'OG Light Mode', icon: Zap },
  ] as const

  return (
    <Select.Root
      value={theme}
      onValueChange={(value) => setTheme(value as 'light' | 'dark' | 'xipz' | 'ogDark' | 'ogLight')}
    >
      <Select.Trigger className="w-full flex items-center justify-between gap-2 px-4 py-3 min-h-[44px] text-sm bg-surface-elevated rounded-lg border border-border-subtle touch-manipulation">
        <Select.Value>
          <span className="text-text-primary">{themeLabel}</span>
        </Select.Value>
        <Select.Icon>
          <ChevronDown className="w-4 h-4 text-text-secondary" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content className="min-w-[200px] bg-surface-base rounded-lg shadow-lg border border-border-subtle p-1 z-[100]">
          <Select.Viewport>
            {themeOptions.map((opt) => (
              <Select.Item
                key={opt.value}
                value={opt.value}
                className="flex items-center justify-between px-4 py-3 min-h-[44px] text-sm rounded cursor-pointer transition-colors text-text-primary hover:bg-surface-hover data-[highlighted]:bg-surface-hover touch-manipulation"
              >
                <Select.ItemText>{opt.label}</Select.ItemText>
                <opt.icon className="w-4 h-4" />
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  )
}

export function OpacitySlider({
  label,
  value,
  onChange,
  description,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  description?: string
}) {
  return (
    <div className="mt-4">
      <label className="block text-sm font-medium text-text-secondary mb-2">{label}</label>
      <div className="flex items-center gap-4">
        <input
          type="range"
          min="0"
          max="50"
          step="5"
          value={value * 100}
          onChange={(e) => onChange(parseInt(e.target.value) / 100)}
          className="flex-1 h-2 bg-surface-elevated rounded-lg appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, rgb(var(--color-accent-500)) 0%, rgb(var(--color-accent-500)) ${value * 200}%, rgb(var(--color-surface-elevated)) ${value * 200}%, rgb(var(--color-surface-elevated)) 100%)`,
          }}
        />
        <span className="text-sm text-text-secondary w-12 text-right">
          {Math.round(value * 100)}%
        </span>
      </div>
      {description && <p className="text-xs text-text-tertiary mt-1">{description}</p>}
    </div>
  )
}