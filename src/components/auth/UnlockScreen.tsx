import { useState, useEffect } from 'react'
import { Lock, Wallet, AlertCircle } from 'lucide-react'
import { useWalletStore } from '../../store/walletStore'
import { useAuthStore } from '../../store/authStore'
import { useUIStore } from '../../store/uiStore'

export function UnlockScreen() {
  const { unlock } = useWalletStore()
  const { isInitialized, initializePassword, verifyPassword, isLockedOut, failedAttempts } = useAuthStore()
  const { profilePicture } = useUIStore()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
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
        if (isLockedOut()) {
          const remainingTime = Math.ceil((5 * 60 * 1000 - (Date.now() - (useAuthStore.getState().lastFailedAttempt || 0))) / 1000)
          setError(`Too many failed attempts. Please try again in ${remainingTime} seconds`)
          return
        }
        
        const isValid = await verifyPassword(password)
        if (isValid) {
          unlock(password)
        } else {
          const attemptsLeft = 5 - failedAttempts
          setError(`Invalid password. ${attemptsLeft} attempts remaining`)
        }
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-lockscreen flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-surface-base border border-border-subtle rounded-lg shadow-2xl p-8 backdrop-blur-sm">
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
              <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mb-4 primary-glow">
                <Wallet className="w-8 h-8 text-white" />
              </div>
            )}
            <h1 className="text-2xl font-bold text-text-primary">SmartWallet AI</h1>
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
                  className="w-full pl-10 pr-3 py-2 border border-border-subtle rounded-lg bg-surface-elevated text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
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
                    className="w-full pl-10 pr-3 py-2 border border-border-subtle rounded-lg bg-surface-elevated text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
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
              disabled={isLoading || (isLockedOut && isLockedOut())}
              className="w-full py-2 bg-gradient-primary text-white rounded-lg hover:shadow-lg hover:primary-glow disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-semibold"
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

          {isInitialized && failedAttempts > 0 && failedAttempts < 5 && (
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-yellow-500">
              <AlertCircle className="w-4 h-4" />
              <span>{5 - failedAttempts} attempts remaining</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
