/**
 * Code by Xipzer
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { Lock, Sun, Moon, Palette, Shield, Fingerprint, Zap } from 'lucide-react'
import { useWalletStore } from '../store/walletStore'
import { useAuthStore } from '../store/authStore'
import { useUIStore } from '../store/uiStore'
import { useTheme } from '../hooks/useTheme'

function ParticleField({
  color,
  opacityMultiplier = 1,
}: {
  color: string
  opacityMultiplier?: number
}) {
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

    const particles: {
      x: number
      y: number
      vx: number
      vy: number
      size: number
      opacity: number
    }[] = []
    const particleCount = 50

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 2 + 1,
        opacity: (Math.random() * 0.5 + 0.1) * opacityMultiplier,
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

        particles.slice(i + 1).forEach((p2) => {
          const dx = p.x - p2.x
          const dy = p.y - p2.y
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist < 150) {
            ctx.beginPath()
            ctx.moveTo(p.x, p.y)
            ctx.lineTo(p2.x, p2.y)
            ctx.strokeStyle = `rgba(${color}, ${0.1 * opacityMultiplier * (1 - dist / 150)})`
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
  }, [color, opacityMultiplier])

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />
}

function GlowRing({ children, gradient }: { children: React.ReactNode; gradient: string }) {
  return (
    <div className="relative w-24 h-24 flex items-center justify-center">
      <div
        className={`absolute inset-0 rounded-full bg-gradient-to-r ${gradient} opacity-50 blur-xl animate-pulse pointer-events-none`}
      />
      <div
        className={`absolute -inset-1 rounded-full bg-gradient-to-r ${gradient} animate-spin-slow opacity-60 pointer-events-none`}
        style={{ animationDuration: '3s' }}
      />
      <div className="relative z-10 flex items-center justify-center">{children}</div>
    </div>
  )
}

type MatrixPhase = 'idle' | 'raining' | 'flash-success' | 'flash-fail' | 'fading'

function MatrixRain({ phase, themeColor }: { phase: MatrixPhase; themeColor: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef<{
    drops: { y: number; speed: number; trail: { y: number; char: string; age: number }[] }[]
    flashAlpha: number
  }>({ drops: [], flashAlpha: 0 })

  useEffect(() => {
    if (phase === 'idle') return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const parent = canvas.parentElement!
    canvas.width = parent.offsetWidth
    canvas.height = parent.offsetHeight

    const fontSize = 11
    const cols = Math.floor(canvas.width / fontSize)
    const rows = Math.ceil(canvas.height / fontSize)
    const state = stateRef.current

    if (state.drops.length !== cols) {
      state.drops = Array.from({ length: cols }, () => ({
        y: Math.random() * -rows,
        speed: 0.15 + Math.random() * 0.25,
        trail: [] as { y: number; char: string; age: number }[],
      }))
    }

    if (phase === 'flash-success' || phase === 'flash-fail') state.flashAlpha = 0.5

    let animationId: number
    const trailLen = rows

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const isResult = phase === 'flash-success' || phase === 'flash-fail'
      const digitColor = isResult
        ? phase === 'flash-success'
          ? '0, 230, 64'
          : '255, 60, 60'
        : themeColor

      if (state.flashAlpha > 0) {
        const flashRgb = phase === 'flash-success' ? '0, 230, 64' : '255, 60, 60'
        ctx.fillStyle = `rgba(${flashRgb}, ${state.flashAlpha * 0.15})`
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        state.flashAlpha = Math.max(0, state.flashAlpha - 0.012)
      }

      ctx.font = `${fontSize}px monospace`
      ctx.textAlign = 'center'

      for (let i = 0; i < state.drops.length; i++) {
        const col = state.drops[i]
        const char = Math.floor(Math.random() * 10).toString()
        const x = i * fontSize + fontSize / 2
        const py = col.y * fontSize

        col.trail.push({ y: py, char, age: 0 })

        for (const t of col.trail) {
          const fade = Math.max(0, 1 - t.age / trailLen)
          ctx.globalAlpha = fade * 0.45
          ctx.fillStyle = `rgb(${digitColor})`
          ctx.fillText(t.char, x, t.y)
          t.age++
        }

        if (py > 0) {
          ctx.globalAlpha = 0.85
          ctx.fillStyle = `rgb(${digitColor})`
          ctx.fillText(char, x, py)
        }

        ctx.globalAlpha = 1
        col.trail = col.trail.filter((t) => t.age < trailLen)
        col.y += col.speed

        if (col.y * fontSize > canvas.height + 50) {
          col.y = Math.random() * -rows * 0.5
          col.speed = 0.15 + Math.random() * 0.25
          col.trail = []
        }
      }

      if (phase !== 'fading') {
        animationId = requestAnimationFrame(draw)
      }
    }

    animationId = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animationId)
  }, [phase, themeColor])

  if (phase === 'idle') return null

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 rounded-2xl z-20 pointer-events-none transition-opacity duration-300 ${
        phase === 'fading' ? 'opacity-0' : 'opacity-100'
      }`}
    />
  )
}

export function UnlockScreen() {
  const { unlock } = useWalletStore()
  const {
    isInitialized,
    isLoading: authLoading,
    initializePassword,
    verifyPassword,
  } = useAuthStore()
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
    particlesLockscreen,
  } = useUIStore()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [isConfirmFocused, setIsConfirmFocused] = useState(false)
  const [matrixPhase, setMatrixPhase] = useState<MatrixPhase>('idle')
  const { theme } = useTheme()

  const styles = theme.styles.unlockScreen

  const wallpaper = syncWallpaper ? chatWallpaper : lockscreenWallpaper
  const opacity = syncOpacity ? wallpaperOpacity : lockscreenOpacity

  const cycleTheme = () => {
    const themes = ['light', 'dark', 'xipz', 'ogDark', 'ogLight'] as const
    setUiTheme(themes[(themes.indexOf(uiTheme as (typeof themes)[number]) + 1) % themes.length])
  }

  const getThemeIcon = () => {
    switch (uiTheme) {
      case 'light':
        return <Sun className="w-5 h-5" />
      case 'dark':
        return <Moon className="w-5 h-5" />
      case 'xipz':
        return <Palette className="w-5 h-5" />
      case 'ogDark':
      case 'ogLight':
        return <Zap className="w-5 h-5" />
      default:
        return <Sun className="w-5 h-5" />
    }
  }

  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark', 'xipz', 'ogDark', 'ogLight')
    document.documentElement.classList.add(uiTheme)
  }, [uiTheme])

  useEffect(() => {
    if (isInitialized) {
      setError('')
    }
  }, [isInitialized])

  const finishWithFlash = useCallback((success: boolean, onDone: () => void) => {
    setMatrixPhase(success ? 'flash-success' : 'flash-fail')
    setTimeout(() => {
      if (success) {
        onDone()
      } else {
        setMatrixPhase('fading')
        setTimeout(() => {
          setMatrixPhase('idle')
          onDone()
        }, 300)
      }
    }, 500)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!isInitialized) {
      if (password.length < 8) {
        setError('Password must be at least 8 characters long')
        return
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match')
        return
      }
    }

    setIsLoading(true)
    setMatrixPhase('raining')

    try {
      if (!isInitialized) {
        await initializePassword(password)
        finishWithFlash(true, () => unlock(password))
      } else {
        const valid = await verifyPassword(password)
        finishWithFlash(valid, () => {
          if (valid) {
            unlock(password)
          } else {
            setError('Invalid password')
            setIsLoading(false)
          }
        })
      }
    } catch {
      finishWithFlash(false, () => {
        setError('An error occurred. Please try again.')
        setIsLoading(false)
      })
    }
  }

  if (authLoading) {
    return (
      <div
        className={`min-h-screen min-h-dvh flex items-center justify-center bg-gradient-to-br ${styles.bg}`}
        style={{ minHeight: '100dvh' }}
      />
    )
  }

  return (
    <div
      className={`min-h-screen min-h-dvh flex items-center justify-center p-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1rem+env(safe-area-inset-bottom))] relative overflow-hidden bg-gradient-to-br ${styles.bg}`}
      style={{ minHeight: '100dvh' }}
    >
      <div
        className={`absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] ${styles.meshGradient1} via-transparent to-transparent`}
      />
      <div
        className={`absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] ${styles.meshGradient2} via-transparent to-transparent`}
      />

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(139, 139, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(139, 139, 255, 0.03) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
          maskImage: 'radial-gradient(ellipse at center, black 20%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 20%, transparent 70%)',
        }}
      />

      {particlesLockscreen && (
        <ParticleField
          color={styles.particleColor}
          opacityMultiplier={styles.particleOpacity || 1}
        />
      )}

      {wallpaper && (
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat mix-blend-overlay"
          style={{
            backgroundImage: `url(${wallpaper})`,
            opacity: opacity,
          }}
        />
      )}

      <div
        className="absolute inset-0 opacity-[0.015] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      <div className="max-w-md w-full relative z-10">
        <div className="relative">
          <div
            className={`relative ${styles.cardBg} border ${styles.cardBorder} rounded-2xl shadow-2xl p-8 overflow-hidden`}
          >
            <MatrixRain phase={matrixPhase} themeColor={styles.particleColor} />

            <button
              onClick={cycleTheme}
              className={`absolute top-4 right-4 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${styles.inputBg} hover:bg-white/10 border ${styles.inputBorder} ${styles.textMuted} hover:${styles.textPrimary} hover:scale-105 z-10`}
              aria-label="Change theme"
            >
              {getThemeIcon()}
            </button>

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
              <div className="space-y-2">
                <label
                  className={`block text-xs font-medium ${styles.textMuted} uppercase tracking-wider`}
                >
                  Password
                </label>
                <div
                  className={`relative group/input transition-all duration-300 ${isFocused ? 'scale-[1.02]' : ''}`}
                >
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

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl backdrop-blur-sm animate-in shake duration-300">
                  <p className="text-sm text-red-400 text-center">{error}</p>
                </div>
              )}

              <button type="submit" disabled={isLoading} className="relative w-full group/btn">
                <div
                  className={`flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r ${styles.buttonGradient} rounded-xl font-semibold text-white shadow-lg ${styles.buttonShadow} transition-all duration-300 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Decrypting...</span>
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

            <div className={`mt-6 pt-6 border-t ${styles.cardBorder}`}>
              <div className={`flex items-center justify-center gap-2 text-xs ${styles.textMuted}`}>
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>256-bit AES-GCM Encryption</span>
              </div>
            </div>
          </div>
        </div>
      </div>

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
