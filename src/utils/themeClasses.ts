/**
 * Code by Xipzer
 */

export const THEME_CLASSES = ['light', 'dark', 'xipz', 'ogDark', 'ogLight'] as const

export function applyThemeClass(theme: string) {
  const root = document.documentElement
  root.classList.remove(...THEME_CLASSES)
  root.classList.add(theme)
}

export function themeClasses(isDark: boolean) {
  return {
    sectionBg: isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200',

    interactiveBg: isDark
      ? 'bg-white/5 hover:bg-white/10 border-white/10'
      : 'bg-gray-100 hover:bg-gray-200 border-gray-200',

    border: isDark ? 'border-white/10' : 'border-gray-200',

    borderSubtle: isDark ? 'border-white/5' : 'border-gray-100',

    hoverBg: isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100',

    backdrop: isDark ? 'bg-black/60' : 'bg-black/40',

    inputBg: isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200',

    skeleton: isDark ? 'bg-white/10' : 'bg-gray-200',
    skeletonSubtle: isDark ? 'bg-white/5' : 'bg-gray-100',

    footerBg: isDark ? 'bg-black/20 border-white/5' : 'bg-gray-50 border-gray-100',

    codeBg: isDark ? 'bg-white/10 text-accent-400' : 'bg-gray-100 text-accent-600',

    codeBlockBg: isDark ? 'bg-black/20' : 'bg-white',

    linkAccent: isDark
      ? 'text-accent-400 hover:text-accent-300'
      : 'text-accent-600 hover:text-accent-500',

    accentToggleBg: isDark
      ? 'bg-gradient-to-r from-accent-500/10 to-accent-600/5 hover:from-accent-500/15 hover:to-accent-600/10 border-accent-500/20'
      : 'bg-gradient-to-r from-accent-50 to-accent-100/50 hover:from-accent-100 hover:to-accent-100 border-accent-200',

    accentIconBg: isDark ? 'bg-accent-500/20' : 'bg-accent-500/10',

    accentHeaderBg: isDark
      ? 'bg-gradient-to-r from-accent-500/10 to-transparent'
      : 'bg-gradient-to-r from-accent-50 to-white',

    accentDot: isDark ? 'bg-accent-400' : 'bg-accent-500',

    accentBar: isDark
      ? 'bg-gradient-to-b from-accent-400 to-accent-600'
      : 'bg-gradient-to-b from-accent-500 to-accent-600',

    tableHeaderBg: isDark ? 'bg-white/5' : 'bg-gray-50',

    tableCellBorder: isDark ? 'border-l border-white/10' : 'border-l border-gray-200',

    tableRowBorder: isDark ? 'border-t border-white/5' : 'border-t border-gray-100',

    tableZebra: isDark ? 'bg-white/[0.02]' : 'bg-gray-50/50',

    tableCellBorderSubtle: isDark ? 'border-l border-white/5' : 'border-l border-gray-100',

    analysisFooterBg: isDark
      ? 'bg-black/30 border-t border-white/10'
      : 'bg-gray-50 border-t border-gray-100',
  }
}

export function statusClasses(
  status: 'green' | 'red' | 'yellow' | 'orange' | 'neutral',
  isDark: boolean,
) {
  const map = {
    green: {
      bg: isDark ? 'bg-green-500/10' : 'bg-green-50',
      border: isDark ? 'border-green-500/20' : 'border-green-200',
      text: isDark ? 'text-green-300' : 'text-green-700',
      alertBg: isDark ? 'bg-green-500/5' : 'bg-green-50',
    },
    red: {
      bg: isDark ? 'bg-red-500/10' : 'bg-red-50',
      border: isDark ? 'border-red-500/20' : 'border-red-200',
      text: isDark ? 'text-red-300' : 'text-red-700',
      alertBg: isDark ? 'bg-red-500/5' : 'bg-red-50',
    },
    yellow: {
      bg: isDark ? 'bg-yellow-500/10' : 'bg-yellow-50',
      border: isDark ? 'border-yellow-500/20' : 'border-yellow-200',
      text: isDark ? 'text-yellow-300' : 'text-yellow-700',
      alertBg: isDark ? 'bg-yellow-500/10' : 'bg-yellow-50',
    },
    orange: {
      bg: isDark ? 'bg-orange-500/10' : 'bg-orange-50',
      border: isDark ? 'border-orange-500/20' : 'border-orange-200',
      text: isDark ? 'text-orange-300' : 'text-orange-700',
      alertBg: isDark ? 'bg-orange-500/10' : 'bg-orange-50',
    },
    neutral: {
      bg: isDark ? 'bg-white/5' : 'bg-gray-50',
      border: isDark ? 'border-white/10' : 'border-gray-200',
      text: isDark ? 'text-white/80' : 'text-gray-700',
      alertBg: isDark ? 'bg-white/5' : 'bg-gray-50',
    },
  }
  return map[status]
}