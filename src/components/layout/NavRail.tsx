/**
 * Code by Xipzer
 */

import { useEffect, useRef } from 'react'
import { LuBrain } from 'react-icons/lu'
import { BarChart3, Eye, TrendingUp, Sprout } from 'lucide-react'
import { useUIStore, type NavItem } from '../../store/uiStore'
import { useTheme } from '../../hooks/useTheme'

export const NAV_RAIL_COLLAPSED = 'calc(4vw / 1.04)'
export const NAV_RAIL_EXPANDED = '220px'
const NAV_ITEMS: { id: NavItem; label: string; icon: typeof BarChart3 | typeof LuBrain }[] = [
  { id: 'research', label: 'Research', icon: LuBrain },
  { id: 'portfolio', label: 'Portfolio', icon: BarChart3 },
  { id: 'watchlist', label: 'Watchlist', icon: Eye },
  { id: 'markets', label: 'Markets', icon: TrendingUp },
  { id: 'yield', label: 'Yield', icon: Sprout },
]

function NavParticles({ color, opacity = 0.6 }: { color: string; opacity?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()

    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    const particles: { x: number; y: number; vx: number; vy: number; size: number; opacity: number }[] = []
    const particleCount = 40

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 1.5 + 0.5,
        opacity: (Math.random() * 0.4 + 0.1) * opacity,
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

          if (dist < 100) {
            ctx.beginPath()
            ctx.moveTo(p.x, p.y)
            ctx.lineTo(p2.x, p2.y)
            ctx.strokeStyle = `rgba(${color}, ${0.06 * opacity * (1 - dist / 100)})`
            ctx.stroke()
          }
        })
      })

      animationId = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      ro.disconnect()
      cancelAnimationFrame(animationId)
    }
  }, [color, opacity])

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
}

export function NavRail() {
  const { activeNavItem, setActiveNavItem, particlesApp } = useUIStore()
  const { theme } = useTheme()
  const unlockStyles = theme.styles.unlockScreen

  return (
    <aside
      className="group/rail fixed top-0 left-0 bottom-0 z-[110] bg-surface-base border-r border-border-subtle flex flex-col py-1 overflow-hidden transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:shadow-[6px_0_24px_rgba(0,0,0,0.12)]"
      style={{ width: NAV_RAIL_COLLAPSED }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.width = NAV_RAIL_EXPANDED }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.width = NAV_RAIL_COLLAPSED }}
    >
      {particlesApp && (
        <>
          <NavParticles
            color={unlockStyles.particleColor}
            opacity={unlockStyles.particleOpacity ?? 0.6}
          />
          <div
            className="absolute inset-0 pointer-events-none opacity-30"
            style={{
              background: `radial-gradient(ellipse at 50% 0%, rgba(${unlockStyles.particleColor}, 0.15), transparent 70%)`,
            }}
          />
        </>
      )}

      <nav className="relative z-10 flex flex-col items-center group-hover/rail:items-stretch gap-0.5 px-1 flex-1 mt-0.5">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveNavItem(item.id)}
            className={`${theme.styles.buttonIcon} p-2 rounded-lg flex items-center gap-3 text-sm font-medium whitespace-nowrap ${
              activeNavItem === item.id
                ? `${theme.styles.iconAccent} font-semibold`
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <item.icon className={`w-[18px] h-[18px] flex-shrink-0 ${activeNavItem === item.id ? 'drop-shadow-[0_0_4px_rgba(var(--color-accent-500),0.4)]' : ''}`} />
            <span className="opacity-0 group-hover/rail:opacity-100 transition-opacity duration-200 delay-[50ms] overflow-hidden">
              {item.label}
            </span>
          </button>
        ))}
      </nav>


    </aside>
  )
}
