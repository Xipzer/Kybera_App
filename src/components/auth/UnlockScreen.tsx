import { useState, useEffect, useRef } from 'react'
import { Lock, Sun, Moon, Palette, Shield, Fingerprint } from 'lucide-react'
import { useWalletStore } from '../../store/walletStore'
import { useAuthStore } from '../../store/authStore'
import { useUIStore } from '../../store/uiStore'
import { useTheme } from '../../hooks/useTheme'



// Animated background particles
function ParticleField({ color }: { color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)
    
    const particles: { x: number; y: number; vx: number; vy: number; size: number; opacity: number }[] = []
    const particleCount = 50
    
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 2 + 1,
        opacity: Math.random() * 0.5 + 0.1
      })
    }
    
    let animationId: number
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      particles.forEach((p, i) => {
        p.x += p.vx
        p.y += p.vy
        
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1
        
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${color}, ${p.opacity})`
        ctx.fill()
        
        // Draw connections
        particles.slice(i + 1).forEach(p2 => {
          const dx = p.x - p2.x
          const dy = p.y - p2.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          
          if (dist < 150) {
            ctx.beginPath()
            ctx.moveTo(p.x, p.y)
            ctx.lineTo(p2.x, p2.y)
            ctx.strokeStyle = `rgba(${color}, ${0.1 * (1 - dist / 150)})`
            ctx.stroke()
          }
        })
      })
      
      animationId = requestAnimationFrame(animate)
    }
    animate()
    
    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animationId)
    }
  }, [color])
  
  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />
}

// Animated glow ring around logo
function GlowRing({ children, gradient }: { children: React.ReactNode; gradient: string }) {
  return (
    <div className="relative w-24 h-24 flex items-center justify-center">
      {/* Outer glow pulse */}
      <div
        className={`absolute inset-0 rounded-full bg-gradient-to-r ${gradient} opacity-50 blur-xl animate-pulse pointer-events-none`}
      />
      {/* Rotating gradient border */}
      <div
        className={`absolute -inset-1 rounded-full bg-gradient-to-r ${gradient} animate-spin-slow opacity-60 pointer-events-none`}
        style={{ animationDuration: '3s' }}
      />
      {/* Inner content */}
      <div className="relative z-10 flex items-center justify-center">{children}</div>
    </div>
  )
}

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
    wallpaperOpacity,
  } = useUIStore()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [isConfirmFocused, setIsConfirmFocused] = useState(false)
  const { theme } = useTheme()

  // Get unlock screen theme styles
  const styles = theme.styles.unlockScreen

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
        const isValid = await verifyPassword(password)
        if (isValid) {
          unlock(password)
        } else {
          setError('Invalid password')
        }
      }
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      className={`min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br ${styles.bg}`}
    >
      {/* Animated mesh gradient background */}
      <div
        className={`absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] ${styles.meshGradient1} via-transparent to-transparent`}
      />
      <div
        className={`absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] ${styles.meshGradient2} via-transparent to-transparent`}
      />

      {/* Particle effect */}
      <ParticleField color={styles.particleColor} />

      {/* Custom wallpaper overlay */}
      {wallpaper && (
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat mix-blend-overlay"
          style={{
            backgroundImage: `url(${wallpaper})`,
            opacity: opacity,
          }}
        />
      )}

      {/* Noise texture overlay for depth */}
      <div
        className="absolute inset-0 opacity-[0.015] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      <div className="max-w-md w-full relative z-10">
        {/* Glassmorphism card */}
        <div className="relative group">
          {/* Glow effect behind card */}
          <div
            className={`absolute -inset-1 bg-gradient-to-r ${styles.accentGradient} rounded-2xl blur-lg ${styles.cardGlow} transition-opacity duration-500`}
          />

          <div
            className={`relative ${styles.cardBg} backdrop-blur-xl border ${styles.cardBorder} rounded-2xl shadow-2xl p-8 overflow-hidden`}
          >
            {/* Subtle inner glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent pointer-events-none" />

            {/* Theme Toggle Button */}
            <button
              onClick={cycleTheme}
              className={`absolute top-4 right-4 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${styles.inputBg} hover:bg-white/10 border ${styles.inputBorder} ${styles.textMuted} hover:${styles.textPrimary} hover:scale-105`}
              aria-label="Change theme"
            >
              {getThemeIcon()}
            </button>

            {/* Header section */}
            <div className="flex flex-col items-center mb-8 relative">
              <GlowRing gradient={styles.accentGradient}>
                <div className="w-24 h-24 rounded-full overflow-hidden ring-2 ring-white/20">
                  <img
                    src={profilePicture || '/kybera-icon.png'}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                </div>
              </GlowRing>

              <div className="mt-6 text-center">
                <h1
                  className={`text-3xl font-bold bg-gradient-to-r ${styles.accentGradient} bg-clip-text text-transparent`}
                >
                  Kybera
                </h1>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <p className={`text-sm ${styles.textMuted}`}>
                    {!isInitialized ? 'Create a secure password' : 'Secured & Encrypted'}
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 relative">
              {/* Password field */}
              <div className="space-y-2">
                <label
                  className={`block text-xs font-medium ${styles.textMuted} uppercase tracking-wider`}
                >
                  Password
                </label>
                <div
                  className={`relative group/input transition-all duration-300 ${isFocused ? 'scale-[1.02]' : ''}`}
                >
                  {/* Input glow on focus */}
                  <div
                    className={`absolute -inset-0.5 bg-gradient-to-r ${styles.accentGradient} rounded-xl blur transition-opacity duration-300 ${isFocused ? 'opacity-50' : 'opacity-0'}`}
                  />

                  <div className="relative flex items-center">
                    <div className={`absolute left-4 ${styles.textMuted} transition-colors`}>
                      <Fingerprint className="w-5 h-5" />
                    </div>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setIsFocused(true)}
                      onBlur={() => setIsFocused(false)}
                      placeholder="Enter password"
                      className={`w-full pl-12 pr-4 py-3.5 ${styles.inputBg} border ${styles.inputBorder} rounded-xl ${styles.textPrimary} placeholder:${styles.textMuted} focus:outline-none ${styles.inputFocusBorder} transition-all duration-300`}
                      autoFocus
                    />
                  </div>
                </div>
              </div>

              {/* Confirm password field (setup only) */}
              {!isInitialized && (
                <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                  <label
                    className={`block text-xs font-medium ${styles.textMuted} uppercase tracking-wider`}
                  >
                    Confirm Password
                  </label>
                  <div
                    className={`relative group/input transition-all duration-300 ${isConfirmFocused ? 'scale-[1.02]' : ''}`}
                  >
                    {/* Input glow on focus */}
                    <div
                      className={`absolute -inset-0.5 bg-gradient-to-r ${styles.accentGradient} rounded-xl blur transition-opacity duration-300 ${isConfirmFocused ? 'opacity-50' : 'opacity-0'}`}
                    />

                    <div className="relative flex items-center">
                      <div className={`absolute left-4 ${styles.textMuted} transition-colors`}>
                        <Lock className="w-5 h-5" />
                      </div>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        onFocus={() => setIsConfirmFocused(true)}
                        onBlur={() => setIsConfirmFocused(false)}
                        placeholder="Confirm password"
                        className={`w-full pl-12 pr-4 py-3.5 ${styles.inputBg} border ${styles.inputBorder} rounded-xl ${styles.textPrimary} placeholder:${styles.textMuted} focus:outline-none ${styles.inputFocusBorder} transition-all duration-300`}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Error message */}
              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl backdrop-blur-sm animate-in shake duration-300">
                  <p className="text-sm text-red-400 text-center">{error}</p>
                </div>
              )}

              {/* Submit button */}
              <button type="submit" disabled={isLoading} className="relative w-full group/btn">
                <div
                  className={`flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r ${styles.buttonGradient} rounded-xl font-semibold text-white shadow-lg ${styles.buttonShadow} transition-all duration-300 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      {!isInitialized ? (
                        <>
                          <Shield className="w-5 h-5" />
                          <span>Create Wallet</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-5 h-5" />
                          <span>Unlock</span>
                        </>
                      )}
                    </>
                  )}
                </div>
              </button>
            </form>

            {/* Footer security badge */}
            <div className={`mt-6 pt-6 border-t ${styles.cardBorder}`}>
              <div className={`flex items-center justify-center gap-2 text-xs ${styles.textMuted}`}>
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>256-bit AES Encryption</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CSS for custom animations */}
      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .shake {
          animation: shake 0.3s ease-in-out;
        }
      `}</style>
    </div>
  )
}
