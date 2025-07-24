import { useState, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import * as Tabs from '@radix-ui/react-tabs'
import * as Select from '@radix-ui/react-select'
import { 
  X, 
  Eye, 
  EyeOff, 
  Moon, 
  Sun, 
  Shield, 
  Brain, 
  Palette, 
  AlertCircle,
  Check,
  ChevronDown
} from 'lucide-react'
import { useSettingsStore } from '../../store/settingsStore'
import { useUIStore } from '../../store/uiStore'
import { useAuthStore } from '../../store/authStore'
import { useWalletStore } from '../../store/walletStore'
import { ImageUpload } from '../common/ImageUpload'
import { useTheme } from '../../hooks/useTheme'

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { openRouterApiKey, autoLockTimeout, setOpenRouterApiKey, setAutoLockTimeout } = useSettingsStore()
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
    lockscreenWallpaper,
    setLockscreenWallpaper,
    lockscreenOpacity,
    setLockscreenOpacity,
    syncWallpaper,
    setSyncWallpaper,
    syncOpacity,
    setSyncOpacity
  } = useUIStore()
  const { changePassword } = useAuthStore()
  const { password: currentSessionPassword } = useWalletStore()
  
  const [apiKey, setApiKey] = useState(openRouterApiKey || '')
  const [showApiKey, setShowApiKey] = useState(false)
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
  
  const [activeTab, setActiveTab] = useState('ai')

  // Reset API key to original value when dialog closes
  useEffect(() => {
    if (!open) {
      setApiKey(openRouterApiKey || '')
    }
  }, [open, openRouterApiKey])

  const handleSaveApiKey = async () => {
    await setOpenRouterApiKey(apiKey.trim() || null)
  }

  const isApiKeyChanged = apiKey.trim() !== (openRouterApiKey || '')

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
      await setAutoLockTimeout(0) // 0 means disabled
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
        
        // Update session password if needed
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

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content bg-surface-base rounded-lg shadow-2xl border border-border-subtle w-[800px] h-[600px] flex overflow-hidden">
          <div className="absolute top-4 right-4 z-10">
            <Dialog.Close asChild>
              <button className="p-2 rounded-lg hover:bg-surface-hover transition-colors">
                <X className="w-5 h-5 text-text-secondary" />
              </button>
            </Dialog.Close>
          </div>

          <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="flex-1 flex min-h-0">
            <div className="w-48 bg-surface-elevated border-r border-border-subtle flex-shrink-0">
              <div className="p-4 border-b border-border-subtle">
                <h2 className="text-lg font-semibold text-text-primary">Settings</h2>
              </div>
              <Tabs.List className="flex flex-col space-y-1 p-2">
                <Tabs.Trigger
                  value="ai"
                  className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-hover rounded-lg data-[state=active]:text-accent data-[state=active]:bg-accent/10 transition-colors w-full text-left"
                >
                  <Brain className="w-4 h-4" />
                  AI Configuration
                </Tabs.Trigger>
                <Tabs.Trigger
                  value="security"
                  className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-hover rounded-lg data-[state=active]:text-accent data-[state=active]:bg-accent/10 transition-colors w-full text-left"
                >
                  <Shield className="w-4 h-4" />
                  Security
                </Tabs.Trigger>
                <Tabs.Trigger
                  value="appearance"
                  className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-hover rounded-lg data-[state=active]:text-accent data-[state=active]:bg-accent/10 transition-colors w-full text-left"
                >
                  <Palette className="w-4 h-4" />
                  Appearance
                </Tabs.Trigger>
              </Tabs.List>
            </div>

            <div className="flex-1 overflow-hidden relative min-h-0">
              <div className="absolute inset-0 top-[60px] overflow-hidden">
                <Tabs.Content value="ai" className="h-full overflow-y-auto px-6 py-6 space-y-6 settings-scroll">
                <div>
                  <h3 className="text-lg font-medium text-text-primary mb-4">
                    AI Assistant Settings
                  </h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      OpenRouter API Key
                    </label>
                    <div className="relative">
                      <input
                        type={showApiKey ? 'text' : 'password'}
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="sk-or-v1-..."
                        className={`${themeConfig.styles.input} pr-10`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-surface-hover transition-colors"
                      >
                        {showApiKey ? (
                          <EyeOff className="w-4 h-4 text-text-secondary" />
                        ) : (
                          <Eye className="w-4 h-4 text-text-secondary" />
                        )}
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-text-tertiary">
                      Get your API key from{' '}
                      <a
                        href="https://openrouter.ai/keys"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent hover:text-accent-400 hover:underline transition-colors"
                      >
                        openrouter.ai/keys
                      </a>
                    </p>
                    <div className="mt-3 flex justify-end">
                      <button
                        onClick={handleSaveApiKey}
                        disabled={!isApiKeyChanged}
                        className={`${themeConfig.styles.buttonSettings || themeConfig.styles.buttonPrimary} disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none`}
                        style={themeConfig.dynamicStyles.buttonSettings || themeConfig.dynamicStyles.buttonPrimary}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              </Tabs.Content>

                <Tabs.Content value="security" className="h-full overflow-y-auto px-6 py-6 space-y-6 settings-scroll">
                <div>
                  <h3 className="text-lg font-medium text-text-primary mb-4">
                    Password & Authentication
                  </h3>
                  
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
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-surface-hover transition-colors"
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
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-surface-hover transition-colors"
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
                      disabled={isChangingPassword || !currentPassword || !newPassword || !confirmNewPassword}
                      className={`${themeConfig.styles.buttonSettings || themeConfig.styles.buttonPrimary} disabled:opacity-50 disabled:cursor-not-allowed`}
                      style={themeConfig.dynamicStyles.buttonSettings || themeConfig.dynamicStyles.buttonPrimary}
                    >
                      {isChangingPassword ? (
                        <span className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Re-encrypting wallets...
                        </span>
                      ) : (
                        'Change Password'
                      )}
                    </button>
                  </div>
                </div>

                <div className="border-t border-border-subtle pt-6">
                  <h3 className="text-lg font-medium text-text-primary mb-4">
                    Auto-lock Settings
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-text-secondary">
                          Enable Auto-lock
                        </label>
                        <p className="text-xs text-text-tertiary mt-1">
                          Automatically lock the wallet after inactivity
                        </p>
                      </div>
                      <button
                        onClick={() => handleAutoLockToggle(!autoLockEnabled)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          autoLockEnabled ? 'bg-accent' : 'bg-surface-elevated border border-border-default'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            autoLockEnabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
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
                          onBlur={(e) => {
                            if (!e.target.value || parseInt(e.target.value) < 1) {
                              handleAutoLockTimeoutChange('1')
                            }
                          }}
                          min="1"
                          max="60"
                          className={themeConfig.styles.input}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </Tabs.Content>

                <Tabs.Content value="appearance" className="h-full overflow-y-auto px-6 py-6 space-y-6 settings-scroll">
                <div>
                  <h3 className="text-lg font-medium text-text-primary mb-4">
                    Theme Settings
                  </h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Theme Mode
                    </label>
                    <Select.Root value={theme} onValueChange={(value) => setTheme(value as 'light' | 'dark' | 'xipz')}>
                      <Select.Trigger className="flex items-center gap-2 px-3 py-1.5 text-sm bg-surface-elevated rounded-lg hover:bg-surface-hover transition-colors">
                        <Select.Value>
                          <span className="text-text-primary">
                            {theme === 'xipz' ? 'Xipz Mode' : theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                          </span>
                        </Select.Value>
                        <Select.Icon>
                          <ChevronDown className="w-4 h-4 text-text-secondary" />
                        </Select.Icon>
                      </Select.Trigger>
                      <Select.Portal>
                        <Select.Content className="min-w-[160px] bg-surface-base rounded-lg shadow-lg border border-border-subtle p-1 z-50">
                          <Select.Viewport>
                            <Select.Item
                              value="light"
                              className={`flex items-center justify-between px-3 py-2 text-sm rounded cursor-pointer transition-colors ${
                                theme === 'light'
                                  ? 'bg-accent/10 text-accent'
                                  : 'text-text-primary hover:bg-surface-hover'
                              }`}
                            >
                              <Select.ItemText>
                                <span>Light Mode</span>
                              </Select.ItemText>
                              <Sun className="w-4 h-4" />
                            </Select.Item>
                            <Select.Item
                              value="dark"
                              className={`flex items-center justify-between px-3 py-2 text-sm rounded cursor-pointer transition-colors ${
                                theme === 'dark'
                                  ? 'bg-accent/10 text-accent'
                                  : 'text-text-primary hover:bg-surface-hover'
                              }`}
                            >
                              <Select.ItemText>
                                <span>Dark Mode</span>
                              </Select.ItemText>
                              <Moon className="w-4 h-4" />
                            </Select.Item>
                            <Select.Item
                              value="xipz"
                              className={`flex items-center justify-between px-3 py-2 text-sm rounded cursor-pointer transition-colors ${
                                theme === 'xipz'
                                  ? 'bg-accent/10 text-accent'
                                  : 'text-text-primary hover:bg-surface-hover'
                              }`}
                            >
                              <Select.ItemText>
                                <span>Xipz Mode</span>
                              </Select.ItemText>
                              <Palette className="w-4 h-4" />
                            </Select.Item>
                          </Select.Viewport>
                        </Select.Content>
                      </Select.Portal>
                    </Select.Root>
                    <p className="mt-2 text-xs text-text-tertiary">
                      Choose your preferred theme mode
                    </p>
                  </div>
                  
                  <div className="mt-6 p-4 bg-surface-elevated rounded-lg">
                    <h4 className="text-sm font-medium text-text-primary mb-2">Theme Colors</h4>
                    {theme === 'xipz' ? (
                      <>
                        <p className="text-xs text-text-secondary mb-3">
                          Current theme is based on Panther Black Pearl and Candy Apple Red
                        </p>
                        <div className="flex gap-2">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-gradient-pearlescent rounded" />
                            <span className="text-xs text-text-secondary">Pearlescent</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-gradient-candy-red rounded" />
                            <span className="text-xs text-text-secondary">Candy Red</span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="text-xs text-text-secondary mb-3">
                          Current theme uses Cyan and Hot Pink accent colors
                        </p>
                        <div className="flex gap-2">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded" style={{ backgroundColor: 'rgb(0, 225, 255)' }} />
                            <span className="text-xs text-text-secondary">Cyan</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded" style={{ backgroundColor: 'rgb(255, 0, 153)' }} />
                            <span className="text-xs text-text-secondary">Hot Pink</span>
                          </div>
                        </div>
                      </>
                    )}
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
                      {/* Sync toggles */}
                      <div className="space-y-3 mb-6">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={syncWallpaper}
                            onChange={(e) => setSyncWallpaper(e.target.checked)}
                            className={themeConfig.styles.checkbox}
                          />
                          <span className="text-sm text-text-secondary">
                            Sync Wallpaper
                          </span>
                        </label>
                        <p className="text-xs text-text-tertiary ml-7">
                          Use the same wallpaper for chat and lockscreen
                        </p>
                        
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={syncOpacity}
                            onChange={(e) => setSyncOpacity(e.target.checked)}
                            className={themeConfig.styles.checkbox}
                          />
                          <span className="text-sm text-text-secondary">
                            Sync Opacity
                          </span>
                        </label>
                        <p className="text-xs text-text-tertiary ml-7">
                          Use the same opacity for chat and lockscreen wallpapers
                        </p>
                      </div>
                      
                      {/* Wallpaper settings */}
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
                                <div>
                                  <label className="block text-sm font-medium text-text-secondary mb-2">
                                    Wallpaper Opacity
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
                                        setLockscreenOpacity(opacity)
                                      }}
                                      className="flex-1 h-2 bg-surface-elevated rounded-lg appearance-none cursor-pointer"
                                      style={{
                                        background: `linear-gradient(to right, rgb(var(--color-accent-500)) 0%, rgb(var(--color-accent-500)) ${wallpaperOpacity * 200}%, rgb(var(--color-surface-elevated)) ${wallpaperOpacity * 200}%, rgb(var(--color-surface-elevated)) 100%)`
                                      }}
                                    />
                                    <span className="text-sm text-text-secondary w-12 text-right">
                                      {Math.round(wallpaperOpacity * 100)}%
                                    </span>
                                  </div>
                                  <p className="text-xs text-text-tertiary mt-1">
                                    Adjust the transparency of the wallpaper
                                  </p>
                                </div>
                              ) : (
                                <>
                                  <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-2">
                                      Wallpaper Opacity (Chat)
                                    </label>
                                    <div className="flex items-center gap-4">
                                      <input
                                        type="range"
                                        min="0"
                                        max="50"
                                        step="5"
                                        value={wallpaperOpacity * 100}
                                        onChange={(e) => setWallpaperOpacity(parseInt(e.target.value) / 100)}
                                        className="flex-1 h-2 bg-surface-elevated rounded-lg appearance-none cursor-pointer"
                                        style={{
                                          background: `linear-gradient(to right, rgb(var(--color-accent-500)) 0%, rgb(var(--color-accent-500)) ${wallpaperOpacity * 200}%, rgb(var(--color-surface-elevated)) ${wallpaperOpacity * 200}%, rgb(var(--color-surface-elevated)) 100%)`
                                        }}
                                      />
                                      <span className="text-sm text-text-secondary w-12 text-right">
                                        {Math.round(wallpaperOpacity * 100)}%
                                      </span>
                                    </div>
                                    <p className="text-xs text-text-tertiary mt-1">
                                      Adjust the transparency of the chat wallpaper
                                    </p>
                                  </div>
                                  
                                  <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-2">
                                      Wallpaper Opacity (Lockscreen)
                                    </label>
                                    <div className="flex items-center gap-4">
                                      <input
                                        type="range"
                                        min="0"
                                        max="50"
                                        step="5"
                                        value={lockscreenOpacity * 100}
                                        onChange={(e) => setLockscreenOpacity(parseInt(e.target.value) / 100)}
                                        className="flex-1 h-2 bg-surface-elevated rounded-lg appearance-none cursor-pointer"
                                        style={{
                                          background: `linear-gradient(to right, rgb(var(--color-accent-500)) 0%, rgb(var(--color-accent-500)) ${lockscreenOpacity * 200}%, rgb(var(--color-surface-elevated)) ${lockscreenOpacity * 200}%, rgb(var(--color-surface-elevated)) 100%)`
                                        }}
                                      />
                                      <span className="text-sm text-text-secondary w-12 text-right">
                                        {Math.round(lockscreenOpacity * 100)}%
                                      </span>
                                    </div>
                                    <p className="text-xs text-text-tertiary mt-1">
                                      Adjust the transparency of the lockscreen wallpaper
                                    </p>
                                  </div>
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
                            <div className="mt-4">
                              <label className="block text-sm font-medium text-text-secondary mb-2">
                                Wallpaper Opacity
                              </label>
                              <div className="flex items-center gap-4">
                                <input
                                  type="range"
                                  min="0"
                                  max="50"
                                  step="5"
                                  value={wallpaperOpacity * 100}
                                  onChange={(e) => setWallpaperOpacity(parseInt(e.target.value) / 100)}
                                  className="flex-1 h-2 bg-surface-elevated rounded-lg appearance-none cursor-pointer"
                                  style={{
                                    background: `linear-gradient(to right, rgb(var(--color-accent-500)) 0%, rgb(var(--color-accent-500)) ${wallpaperOpacity * 200}%, rgb(var(--color-surface-elevated)) ${wallpaperOpacity * 200}%, rgb(var(--color-surface-elevated)) 100%)`
                                  }}
                                />
                                <span className="text-sm text-text-secondary w-12 text-right">
                                  {Math.round(wallpaperOpacity * 100)}%
                                </span>
                              </div>
                              <p className="text-xs text-text-tertiary mt-1">
                                Adjust the transparency of the chat wallpaper
                              </p>
                            </div>
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
                              <div className="mt-4">
                                <label className="block text-sm font-medium text-text-secondary mb-2">
                                  Wallpaper Opacity
                                </label>
                                <div className="flex items-center gap-4">
                                  <input
                                    type="range"
                                    min="0"
                                    max="50"
                                    step="5"
                                    value={lockscreenOpacity * 100}
                                    onChange={(e) => setLockscreenOpacity(parseInt(e.target.value) / 100)}
                                    className="flex-1 h-2 bg-surface-elevated rounded-lg appearance-none cursor-pointer"
                                    style={{
                                      background: `linear-gradient(to right, rgb(var(--color-accent-500)) 0%, rgb(var(--color-accent-500)) ${lockscreenOpacity * 200}%, rgb(var(--color-surface-elevated)) ${lockscreenOpacity * 200}%, rgb(var(--color-surface-elevated)) 100%)`
                                    }}
                                  />
                                  <span className="text-sm text-text-secondary w-12 text-right">
                                    {Math.round(lockscreenOpacity * 100)}%
                                  </span>
                                </div>
                                <p className="text-xs text-text-tertiary mt-1">
                                  Adjust the transparency of the lockscreen wallpaper
                                </p>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </Tabs.Content>
              </div>
            </div>
          </Tabs.Root>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}