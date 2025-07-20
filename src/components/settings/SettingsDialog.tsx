import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import * as Tabs from '@radix-ui/react-tabs'
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
  Check
} from 'lucide-react'
import { useSettingsStore } from '../../store/settingsStore'
import { useUIStore } from '../../store/uiStore'
import { useAuthStore } from '../../store/authStore'
import { useWalletStore } from '../../store/walletStore'
import { ImageUpload } from '../common/ImageUpload'

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { openRouterApiKey, autoLockTimeout, setOpenRouterApiKey, setAutoLockTimeout } = useSettingsStore()
  const { theme, toggleTheme, profilePicture, setProfilePicture, chatWallpaper, setChatWallpaper, wallpaperOpacity, setWallpaperOpacity } = useUIStore()
  const { changePassword } = useAuthStore()
  const { password: currentSessionPassword } = useWalletStore()
  
  const [apiKey, setApiKey] = useState(openRouterApiKey || '')
  const [showApiKey, setShowApiKey] = useState(false)
  const [lockTimeout, setLockTimeout] = useState(autoLockTimeout.toString())
  
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

  const handleSave = async () => {
    await setOpenRouterApiKey(apiKey.trim() || null)
    await setAutoLockTimeout(parseInt(lockTimeout) || 15)
    onOpenChange(false)
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
        setPasswordError('Current password is incorrect')
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
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-md z-40" />
        <Dialog.Content className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] bg-surface-base rounded-lg shadow-2xl border border-border-subtle w-[650px] h-[600px] flex flex-col z-50 overflow-hidden">
          <div className="p-6 border-b border-border-subtle flex-shrink-0 bg-surface-base relative z-10">
            <div className="flex items-center justify-between">
              <Dialog.Title className="text-xl font-semibold text-text-primary">
                Settings
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="p-1 rounded hover:bg-surface-hover transition-colors">
                  <X className="w-5 h-5 text-text-secondary" />
                </button>
              </Dialog.Close>
            </div>
          </div>

          <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <Tabs.List className="flex border-b border-border-subtle px-6 flex-shrink-0">
              <Tabs.Trigger
                value="ai"
                className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-text-secondary hover:text-text-primary data-[state=active]:text-accent-500 data-[state=active]:border-b-2 data-[state=active]:border-accent-500 transition-colors"
              >
                <Brain className="w-4 h-4" />
                AI Configuration
              </Tabs.Trigger>
              <Tabs.Trigger
                value="security"
                className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-text-secondary hover:text-text-primary data-[state=active]:text-accent-500 data-[state=active]:border-b-2 data-[state=active]:border-accent-500 transition-colors"
              >
                <Shield className="w-4 h-4" />
                Security
              </Tabs.Trigger>
              <Tabs.Trigger
                value="appearance"
                className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-text-secondary hover:text-text-primary data-[state=active]:text-accent-500 data-[state=active]:border-b-2 data-[state=active]:border-accent-500 transition-colors"
              >
                <Palette className="w-4 h-4" />
                Appearance
              </Tabs.Trigger>
            </Tabs.List>

            <div className="flex-1 overflow-hidden relative min-h-0">
              <Tabs.Content value="ai" className="absolute inset-0 overflow-y-auto p-6 space-y-6 settings-scroll">
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
                        className="w-full px-3 py-2 pr-10 border border-border-default rounded-lg bg-surface-elevated text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-colors"
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
                        className="text-accent-500 hover:text-accent-400 hover:underline transition-colors"
                      >
                        openrouter.ai/keys
                      </a>
                    </p>
                  </div>
                </div>
              </Tabs.Content>

              <Tabs.Content value="security" className="absolute inset-0 overflow-y-auto p-6 space-y-6 settings-scroll">
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
                          className="w-full px-3 py-2 pr-10 border border-border-default rounded-lg bg-surface-elevated text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-colors"
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
                          className="w-full px-3 py-2 pr-10 border border-border-default rounded-lg bg-surface-elevated text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-colors"
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
                        className="w-full px-3 py-2 border border-border-default rounded-lg bg-surface-elevated text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-colors"
                      />
                    </div>
                    
                    {passwordError && (
                      <div className="flex items-center gap-2 p-3 bg-accent-500/10 border border-accent-500/30 rounded-lg">
                        <AlertCircle className="w-4 h-4 text-accent-500 flex-shrink-0" />
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
                      className="px-4 py-2 bg-gradient-candy-red text-white rounded-lg hover:shadow-lg hover:shadow-accent-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-medium"
                    >
                      {isChangingPassword ? (
                        <span className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Changing Password...
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
                  
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Auto-lock Timeout (minutes)
                    </label>
                    <input
                      type="number"
                      value={lockTimeout}
                      onChange={(e) => setLockTimeout(e.target.value)}
                      min="1"
                      max="60"
                      className="w-full px-3 py-2 border border-border-default rounded-lg bg-surface-elevated text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-colors"
                    />
                    <p className="mt-1 text-xs text-text-tertiary">
                      Automatically lock the wallet after this period of inactivity
                    </p>
                  </div>
                </div>
              </Tabs.Content>

              <Tabs.Content value="appearance" className="absolute inset-0 overflow-y-auto p-6 space-y-6 settings-scroll">
                <div>
                  <h3 className="text-lg font-medium text-text-primary mb-4">
                    Theme Settings
                  </h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Theme Mode
                    </label>
                    <button
                      type="button"
                      onClick={toggleTheme}
                      className="flex items-center gap-2 px-4 py-2 border border-border-default rounded-lg hover:bg-surface-hover transition-colors text-text-primary"
                    >
                      {theme === 'dark' ? (
                        <>
                          <Moon className="w-4 h-4 text-text-secondary" />
                          <span>Dark Mode</span>
                        </>
                      ) : (
                        <>
                          <Sun className="w-4 h-4 text-text-secondary" />
                          <span>Light Mode</span>
                        </>
                      )}
                    </button>
                    <p className="mt-2 text-xs text-text-tertiary">
                      Switch between light and dark theme modes
                    </p>
                  </div>
                  
                  <div className="mt-6 p-4 bg-surface-elevated rounded-lg">
                    <h4 className="text-sm font-medium text-text-primary mb-2">Theme Colors</h4>
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
                    
                    <div className="border-t border-border-subtle pt-6">
                      <ImageUpload
                        currentImage={chatWallpaper}
                        onImageChange={setChatWallpaper}
                        label="Chat Background"
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
                            Adjust the transparency of the background image
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Tabs.Content>
            </div>

            <div className="p-6 border-t border-border-subtle flex-shrink-0 bg-surface-base">
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => onOpenChange(false)}
                  className="px-4 py-2 border border-border-default rounded-lg hover:bg-surface-hover transition-colors text-text-primary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-gradient-candy-red text-white rounded-lg hover:shadow-lg hover:shadow-accent-500/30 transition-all duration-300 font-medium"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </Tabs.Root>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}