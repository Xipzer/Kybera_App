import { useState } from 'react'
import { Lock, Wallet } from 'lucide-react'
import { useWalletStore } from '../../store/walletStore'

export function UnlockScreen() {
  const { unlock } = useWalletStore()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isFirstTime, setIsFirstTime] = useState(true)
  const [confirmPassword, setConfirmPassword] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (isFirstTime) {
      if (password.length < 8) {
        setError('Password must be at least 8 characters long')
        return
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match')
        return
      }
    }

    // For demo purposes, we'll accept any password
    // In production, you'd verify against a stored hash
    unlock(password)
  }

  return (
    <div className="min-h-screen bg-gradient-pearlescent flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-surface-base border border-border-subtle rounded-lg shadow-2xl p-8 backdrop-blur-sm">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-gradient-candy-red rounded-full flex items-center justify-center mb-4 candy-red-glow">
              <Wallet className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-text-primary">SmartWallet AI</h1>
            <p className="text-text-secondary mt-2">
              {isFirstTime
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
                  className="w-full pl-10 pr-3 py-2 border border-border-subtle rounded-lg bg-surface-elevated text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-colors"
                  autoFocus
                />
              </div>
            </div>

            {isFirstTime && (
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
                    className="w-full pl-10 pr-3 py-2 border border-border-subtle rounded-lg bg-surface-elevated text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-colors"
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 bg-accent-500/10 border border-accent-500/30 rounded-lg">
                <p className="text-sm text-accent-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2 bg-gradient-candy-red text-white rounded-lg hover:shadow-lg hover:shadow-accent-500/30 transition-all duration-300 font-semibold"
            >
              {isFirstTime ? 'Create Wallet' : 'Unlock'}
            </button>
          </form>

          {!isFirstTime && (
            <button
              onClick={() => setIsFirstTime(true)}
              className="w-full mt-4 text-sm text-text-tertiary hover:text-text-secondary transition-colors"
            >
              Create new wallet
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
