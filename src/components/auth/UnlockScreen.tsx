import { useState, useEffect } from 'react'
import { Lock, Wallet, Sun, Moon, Palette } from 'lucide-react'
import { useWalletStore } from '../../store/walletStore'
import { useAuthStore } from '../../store/authStore'
import { useUIStore } from '../../store/uiStore'
import { useTheme } from '../../hooks/useTheme'

export function UnlockScreen() {
  const { unlock } = useWalletStore()
  const { isInitialized, initializePassword, verifyPassword } = useAuthStore()
  const { 
    profilePicture, 
    theme: uiTheme, 
    setTheme: setUiTheme,
    lockscreenWallpaper,
    lockscreenOpacity,
    syncWallpaper,
    chatWallpaper,
    syncOpacity,
    wallpaperOpacity
  } = useUIStore()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { theme } = useTheme()
  
  // Determine which wallpaper to use
  const wallpaper = syncWallpaper ? chatWallpaper : lockscreenWallpaper
  const opacity = syncOpacity ? wallpaperOpacity : lockscreenOpacity
  
  const cycleTheme = () => {
    const themes = ['light', 'dark', 'xipz'] as const
    const currentIndex = themes.indexOf(uiTheme)
    const nextTheme = themes[(currentIndex + 1) % themes.length]
    setUiTheme(nextTheme)
  }
  
  const getThemeIcon = () => {
    switch (uiTheme) {
      case 'light':
        return <Sun className="w-5 h-5" />
      case 'dark':
        return <Moon className="w-5 h-5" />
      case 'xipz':
        return <Palette className="w-5 h-5" />
    }
  }
  
  useEffect(() => {
    // Check if password is already initialized
    if (isInitialized) {
      setError('')
    }
  }, [isInitialized])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      if (!isInitialized) {
        // First time setup
        if (password.length < 8) {
          setError('Password must be at least 8 characters long')
          return
        }
        if (password !== confirmPassword) {
          setError('Passwords do not match')
          return
        }
        
        await initializePassword(password)
        unlock(password)
      } else {
        // Verify existing password
        const isValid = await verifyPassword(password)
        if (isValid) {
          unlock(password)
        } else {
          setError('Invalid password')
        }
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-lockscreen flex items-center justify-center p-4 relative">
      {/* Background Wallpaper */}
      {wallpaper && (
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(${wallpaper})`,
            opacity: opacity
          }}
        />
      )}
      
      <div className="max-w-md w-full relative z-10">
        <div className="bg-surface-base border border-border-subtle rounded-lg shadow-2xl p-8 backdrop-blur-sm relative">
          {/* Theme Toggle Button */}
          <button
            onClick={cycleTheme}
            className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 bg-surface-elevated hover:bg-surface-hover text-text-secondary hover:text-text-primary"
            aria-label="Change theme"
          >
            {getThemeIcon()}
          </button>
          
          <div className="flex flex-col items-center mb-8">
            {profilePicture ? (
              <div className="w-20 h-20 rounded-full overflow-hidden mb-4 ring-2 ring-accent ring-offset-2 ring-offset-surface-base">
                <img 
                  src={profilePicture} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                style={{
                  background: theme.dynamicStyles.buttonPrimary.background
                }}
              >
                <Wallet className="w-8 h-8 text-white" />
              </div>
            )}
            <h1 className="text-2xl font-bold text-text-primary">OpenWallet</h1>
            <p className="text-text-secondary mt-2">
              {!isInitialized
                ? 'Create a password to secure your wallet'
                : 'Enter your password to unlock'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full pl-10 pr-3 py-2 border border-border-subtle rounded-lg bg-surface-elevated text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors"
                  autoFocus
                />
              </div>
            </div>

            {!isInitialized && (
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                    className="w-full pl-10 pr-3 py-2 border border-border-subtle rounded-lg bg-surface-elevated text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors"
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 bg-accent/10 border border-accent/30 rounded-lg">
                <p className="text-sm text-accent-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-2 ${theme.styles.buttonPrimary} font-semibold disabled:opacity-50 disabled:cursor-not-allowed`}
              style={theme.dynamicStyles.buttonPrimary}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing...
                </span>
              ) : (
                !isInitialized ? 'Create Wallet' : 'Unlock'
              )}
            </button>
          </form>

        </div>
      </div>
    </div>
  )
}
