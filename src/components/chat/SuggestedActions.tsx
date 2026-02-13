/**
 * Code by Xipzer
 */

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Wallet,
  Globe,
  Shield,
  TrendingUp,
  BarChart3,
  Eye,
  Search,
  Coins,
  ArrowLeftRight,
  Users,
  Bell,
  CreditCard,
  Activity,
  Sprout,
  FileText,
  Settings,
  Layers,
  type LucideIcon,
} from 'lucide-react'
import { useTheme } from '../../hooks/useTheme'

interface SuggestedPrompt {
  text: string
  icon: LucideIcon
  category: string
}

interface SuggestedCategory {
  id: string
  label: string
  icon: LucideIcon
  prompts: SuggestedPrompt[]
}

const CATEGORIES: SuggestedCategory[] = [
  {
    id: 'wallet',
    label: 'Wallet',
    icon: Wallet,
    prompts: [
      { text: 'Create a new wallet group', icon: Wallet, category: 'wallet' },
      { text: 'Show my wallets', icon: Layers, category: 'wallet' },
      { text: 'Check my balance', icon: Coins, category: 'wallet' },
      { text: 'Switch to Ethereum', icon: Globe, category: 'wallet' },
      { text: 'Switch to Base', icon: Globe, category: 'wallet' },
      { text: 'Switch to Solana', icon: Globe, category: 'wallet' },
    ],
  },
  {
    id: 'research',
    label: 'Research',
    icon: Search,
    prompts: [
      { text: 'Analyze this token for me', icon: Search, category: 'research' },
      { text: 'Is this token safe to buy?', icon: Shield, category: 'research' },
      { text: 'Who is the developer behind this token?', icon: Users, category: 'research' },
      { text: 'What are the top holders of this token?', icon: BarChart3, category: 'research' },
    ],
  },
  {
    id: 'security',
    label: 'Security',
    icon: Shield,
    prompts: [
      { text: 'Run a security check on this contract', icon: Shield, category: 'security' },
      { text: 'Check if this address is malicious', icon: Shield, category: 'security' },
    ],
  },
  {
    id: 'defi',
    label: 'DeFi',
    icon: Sprout,
    prompts: [
      { text: 'Find the best yield for my USDC', icon: Sprout, category: 'defi' },
      { text: 'Show top yields on Base', icon: TrendingUp, category: 'defi' },
      { text: 'Where can I earn on my ETH?', icon: Coins, category: 'defi' },
      { text: 'Get a swap quote for ETH to USDC', icon: ArrowLeftRight, category: 'defi' },
    ],
  },
  {
    id: 'markets',
    label: 'Markets',
    icon: BarChart3,
    prompts: [
      { text: 'Search prediction markets for ETH', icon: BarChart3, category: 'markets' },
      { text: 'What does the market think about Bitcoin?', icon: TrendingUp, category: 'markets' },
      { text: 'Show crypto market sentiment', icon: Activity, category: 'markets' },
    ],
  },
  {
    id: 'watchlist',
    label: 'Watchlist',
    icon: Eye,
    prompts: [
      { text: 'Show my watched wallets', icon: Eye, category: 'watchlist' },
      { text: 'Watch this wallet address', icon: Eye, category: 'watchlist' },
      { text: 'Show activity for my watched wallets', icon: Activity, category: 'watchlist' },
    ],
  },
  {
    id: 'portfolio',
    label: 'Portfolio',
    icon: FileText,
    prompts: [
      { text: 'Show my portfolio P&L', icon: TrendingUp, category: 'portfolio' },
      { text: 'Show my recent trades', icon: FileText, category: 'portfolio' },
    ],
  },
  {
    id: 'alerts',
    label: 'Alerts',
    icon: Bell,
    prompts: [
      { text: 'Show my alerts', icon: Bell, category: 'alerts' },
      { text: 'Create a price alert', icon: Bell, category: 'alerts' },
    ],
  },
  {
    id: 'payments',
    label: 'Payments',
    icon: CreditCard,
    prompts: [
      { text: 'Show x402 payment status', icon: CreditCard, category: 'payments' },
      { text: 'Show recent micropayments', icon: CreditCard, category: 'payments' },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    prompts: [
      { text: 'Show my current settings', icon: Settings, category: 'settings' },
      { text: 'What networks are available?', icon: Globe, category: 'settings' },
    ],
  },
]

interface SuggestedActionsProps {
  visible: boolean
  onSelect: (text: string) => void
  onMouseDown: () => void
}

export function SuggestedActions({ visible, onSelect, onMouseDown }: SuggestedActionsProps) {
  const { theme } = useTheme()
  const styles = theme.styles.chatInterface
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [selectedIndex, setSelectedIndex] = useState(-1)

  useEffect(() => {
    if (visible) {
      setSearch('')
      setActiveCategory(null)
      setSelectedIndex(-1)
    }
  }, [visible])

  const filteredPrompts = useMemo(() => {
    if (search.trim()) {
      const q = search.toLowerCase()
      return CATEGORIES.flatMap((cat) =>
        cat.prompts.filter((p) => p.text.toLowerCase().includes(q))
      )
    }
    if (activeCategory) {
      return CATEGORIES.find((c) => c.id === activeCategory)?.prompts ?? []
    }
    return CATEGORIES.flatMap((cat) => cat.prompts)
  }, [search, activeCategory])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev < filteredPrompts.length - 1 ? prev + 1 : 0))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredPrompts.length - 1))
      } else if (e.key === 'Enter' && selectedIndex >= 0) {
        e.preventDefault()
        onSelect(filteredPrompts[selectedIndex].text)
      } else if (e.key === 'Escape') {
        searchRef.current?.blur()
      }
    },
    [filteredPrompts, selectedIndex, onSelect]
  )

  useEffect(() => {
    if (selectedIndex >= 0 && listRef.current) {
      const item = listRef.current.children[selectedIndex] as HTMLElement | undefined
      item?.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.98 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          onMouseDown={(e) => {
            e.preventDefault()
            onMouseDown()
          }}
          className="absolute left-0 right-0 bottom-full mb-2 z-30 max-w-7xl mx-auto"
        >
          <div className="bg-surface-elevated/30 backdrop-blur-xl border border-border-subtle rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-3 pt-3 pb-2">
              <div className="relative">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${theme.styles.iconAccent} opacity-60`} />
                <input
                  ref={searchRef}
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setSelectedIndex(-1)
                    if (e.target.value.trim()) setActiveCategory(null)
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Search commands..."
                  className="w-full pl-9 pr-3 py-2 bg-surface-elevated/50 border border-border-subtle/50 rounded-xl text-text-primary placeholder:text-text-tertiary text-xs sm:text-sm focus:outline-none focus:border-border-subtle"
                />
              </div>
            </div>

            {!search.trim() && (
              <div className="px-3 pb-2 flex gap-1.5 overflow-x-auto scrollbar-none">
                <button
                  onClick={() => {
                    setActiveCategory(null)
                    setSelectedIndex(-1)
                  }}
                  className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-medium transition-all duration-150 ${
                    activeCategory === null
                      ? `bg-gradient-to-r ${styles.sendGradient} text-white shadow-sm`
                      : 'bg-surface-elevated/50 text-text-secondary hover:text-text-primary hover:bg-surface-elevated/70'
                  }`}
                >
                  All
                </button>
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setActiveCategory(cat.id === activeCategory ? null : cat.id)
                      setSelectedIndex(-1)
                    }}
                    className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-medium transition-all duration-150 ${
                      activeCategory === cat.id
                        ? `bg-gradient-to-r ${styles.sendGradient} text-white shadow-sm`
                        : 'bg-surface-elevated/50 text-text-secondary hover:text-text-primary hover:bg-surface-elevated/70'
                    }`}
                  >
                    <cat.icon className="w-3 h-3" />
                    {cat.label}
                  </button>
                ))}
              </div>
            )}

            <div
              ref={listRef}
              className="max-h-[240px] sm:max-h-[300px] overflow-y-auto scrollbar-thin px-1.5 pb-1.5"
            >
              {filteredPrompts.length === 0 ? (
                <div className="py-6 text-center text-text-tertiary text-xs sm:text-sm">
                  No matching commands
                </div>
              ) : (
                filteredPrompts.map((prompt, i) => (
                  <button
                    key={`${prompt.category}-${prompt.text}`}
                    onClick={() => onSelect(prompt.text)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all duration-100 group ${
                      i === selectedIndex
                        ? 'bg-surface-elevated/70 text-text-primary'
                        : 'text-text-secondary hover:bg-surface-elevated/50 hover:text-text-primary'
                    }`}
                  >
                    <div className={`flex-shrink-0 w-7 h-7 rounded-lg bg-gradient-to-br ${styles.sendGradient} flex items-center justify-center opacity-70 group-hover:opacity-100 transition-opacity ${i === selectedIndex ? 'opacity-100' : ''}`}>
                      <prompt.icon className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="text-xs sm:text-sm truncate flex-1">{prompt.text}</span>
                    <span className="flex-shrink-0 text-[10px] text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity bg-surface-elevated/50 px-1.5 py-0.5 rounded">
                      {CATEGORIES.find((c) => c.id === prompt.category)?.label}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
