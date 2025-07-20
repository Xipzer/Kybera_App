import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, Eye, EyeOff, Moon, Sun } from 'lucide-react'
import { useSettingsStore } from '../../store/settingsStore'
import { useUIStore } from '../../store/uiStore'

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { openRouterApiKey, autoLockTimeout, setOpenRouterApiKey, setAutoLockTimeout } = useSettingsStore()
  const { theme, toggleTheme } = useUIStore()
  const [apiKey, setApiKey] = useState(openRouterApiKey || '')
  const [showApiKey, setShowApiKey] = useState(false)
  const [lockTimeout, setLockTimeout] = useState(autoLockTimeout.toString())

  const handleSave = async () => {
    await setOpenRouterApiKey(apiKey.trim() || null)
    await setAutoLockTimeout(parseInt(lockTimeout) || 15)
    onOpenChange(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] bg-surface-base rounded-lg shadow-2xl border border-border-subtle w-[500px] max-h-[85vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <Dialog.Title className="text-xl font-semibold text-text-primary">
                Settings
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="p-1 rounded hover:bg-surface-hover transition-colors">
                  <X className="w-5 h-5 text-text-secondary" />
                </button>
              </Dialog.Close>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-text-primary mb-4">
                  AI Configuration
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

              <div>
                <h3 className="text-sm font-medium text-text-primary mb-4">
                  Security
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

              <div>
                <h3 className="text-sm font-medium text-text-primary mb-4">
                  Appearance
                </h3>
                
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Theme
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
                </div>
              </div>

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
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}