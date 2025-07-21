export interface ThemeConfig {
  name: string
  
  // Define all theme properties as complete style strings
  styles: {
    // Layout containers
    mainContainer: string
    drawerContainer: string
    dialogContainer: string
    panelHeader: string
    
    // Typography
    heading: string
    textPrimary: string
    textSecondary: string
    textTertiary: string
    
    // Buttons
    buttonPrimary: string
    buttonPrimaryHover?: string
    buttonSecondary: string
    buttonSecondaryHover?: string
    buttonIcon: string
    buttonSettings: string
    
    // Form elements
    input: string
    textarea: string
    checkbox: string
    label: string
    
    // Navigation
    tabs: {
      list: string
      trigger: string
      triggerActive: string
    }
    
    // Dropdown
    dropdown: {
      content: string
      item: string
      itemHover: string
      separator: string
    }
    
    // Lists
    listItem: string
    listItemActive: string
    listItemHover: string
    
    // Groups
    groupContainer: string
    groupHeader: string
    
    // Feedback
    error: {
      container: string
      text: string
      icon: string
    }
    info: {
      container: string
      text: string
      icon: string
    }
    
    // Icons
    iconPrimary: string
    iconSecondary: string
    iconAccent: string
  }
  
  // Dynamic styles that need JS
  dynamicStyles: {
    buttonPrimary: {
      background: string
      hoverShadow?: string
    }
    buttonSecondary: {
      background: string
      borderColor?: string
      border?: string
      color: string
      hoverBackground?: string
    }
    buttonSettings?: {
      background: string
      hoverShadow?: string
    }
  }
}

const baseInputStyles = "w-full px-3 py-2 border rounded-lg focus:outline-none transition-colors duration-150"

export const themes: Record<string, ThemeConfig> = {
  light: {
    name: 'Light',
    styles: {
      mainContainer: 'bg-surface-base border-border-subtle',
      drawerContainer: 'bg-surface-base border-border-subtle',
      dialogContainer: 'bg-white rounded-lg shadow-lg',
      panelHeader: 'border-b border-border-subtle',
      
      heading: 'text-xl font-semibold text-gray-900',
      textPrimary: 'text-gray-900',
      textSecondary: 'text-gray-700',
      textTertiary: 'text-gray-500',
      
      buttonPrimary: 'px-4 py-2 text-white rounded-lg transition-all duration-300 font-medium hover:shadow-[0_0_20px_rgba(0,225,255,0.5),0_0_30px_rgba(255,0,153,0.3)]',
      buttonSecondary: 'px-4 py-2 border-2 rounded-lg transition-all duration-300 font-medium hover:shadow-[0_0_20px_rgba(255,0,153,0.3)] text-pink-500 border-pink-500 hover:bg-pink-500/10',
      buttonIcon: 'p-1 rounded hover:bg-gray-100 transition-all duration-300',
      buttonSettings: 'px-4 py-2 text-white rounded-lg transition-all duration-300 font-medium hover:shadow-[0_0_20px_rgba(255,0,153,0.5)]',
      
      input: `${baseInputStyles} bg-white border-gray-300 text-gray-900 focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500`,
      textarea: `${baseInputStyles} bg-white border-gray-300 text-gray-900 focus:ring-cyan-500 resize-none`,
      checkbox: 'w-4 h-4 rounded accent-cyan-500 focus:outline-none cursor-pointer',
      label: 'block text-sm font-medium text-gray-700 mb-2',
      
      tabs: {
        list: 'flex border-b border-gray-200',
        trigger: 'flex-1 px-4 py-2 text-sm font-medium text-gray-600 border-b-2 border-transparent transition-colors duration-200 hover:text-gray-900 data-[state=active]:text-cyan-500 data-[state=active]:border-cyan-500',
        triggerActive: '',
      },
      
      dropdown: {
        content: 'min-w-[160px] bg-white rounded-lg shadow-lg border border-gray-300 p-1',
        item: 'flex items-center gap-2 px-3 py-2 text-sm text-gray-900 rounded cursor-pointer transition-all duration-300',
        itemHover: 'hover:bg-gray-100',
        separator: 'h-px bg-gray-200 my-1',
      },
      
      listItem: 'p-3 border border-gray-300 transition-colors cursor-pointer hover:border-gray-400',
      listItemActive: 'bg-cyan-500/10 border border-cyan-500/30',
      listItemHover: 'hover:bg-gray-50',
      
      groupContainer: 'border rounded-lg overflow-hidden transition-all duration-300 border-gray-300 bg-white',
      groupHeader: 'p-3 backdrop-blur-sm transition-all duration-300 bg-gray-50',
      
      error: {
        container: 'flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg',
        text: 'text-sm text-red-600',
        icon: 'w-4 h-4 text-red-600',
      },
      info: {
        container: 'mb-4 p-4 bg-cyan-50 border border-cyan-200 rounded-lg',
        text: 'text-sm text-cyan-800',
        icon: 'w-5 h-5 text-cyan-600 flex-shrink-0 mt-0.5',
      },
      
      iconPrimary: 'text-gray-900',
      iconSecondary: 'text-gray-600',
      iconAccent: 'text-cyan-600',
    },
    dynamicStyles: {
      buttonPrimary: {
        background: 'linear-gradient(135deg, rgb(0, 225, 255) 0%, rgb(255, 0, 153) 100%)',
        hoverShadow: '0 0 20px rgba(0, 225, 255, 0.5), 0 0 30px rgba(255, 0, 153, 0.3)',
      },
      buttonSecondary: {
        background: 'transparent',
        borderColor: 'rgb(255, 0, 153)',
        color: 'rgb(255, 0, 153)',
      },
      buttonSettings: {
        background: 'linear-gradient(135deg, rgb(255, 0, 153) 0%, rgb(219, 39, 119) 100%)',
        hoverShadow: '0 0 20px rgba(255, 0, 153, 0.5)',
      },
    },
  },
  
  dark: {
    name: 'Dark',
    styles: {
      mainContainer: 'bg-surface-base border-border-subtle',
      drawerContainer: 'bg-surface-base border-border-subtle',
      dialogContainer: 'bg-surface-base rounded-lg shadow-lg',
      panelHeader: 'border-b border-border-subtle',
      
      heading: 'text-xl font-semibold text-gray-100',
      textPrimary: 'text-gray-100',
      textSecondary: 'text-gray-300',
      textTertiary: 'text-gray-400',
      
      buttonPrimary: 'px-4 py-2 text-white rounded-lg transition-all duration-300 font-medium hover:shadow-[0_0_20px_rgba(0,225,255,0.5),0_0_30px_rgba(255,0,153,0.3)]',
      buttonSecondary: 'px-4 py-2 border-2 rounded-lg transition-all duration-300 font-medium hover:shadow-[0_0_20px_rgba(255,0,153,0.3)] text-pink-500 border-pink-500 hover:bg-pink-500/10',
      buttonIcon: 'p-1 rounded hover:bg-surface-hover transition-all duration-300',
      buttonSettings: 'px-4 py-2 text-white rounded-lg transition-all duration-300 font-medium hover:shadow-[0_0_20px_rgba(255,0,153,0.5)]',
      
      input: `${baseInputStyles} bg-surface-elevated border-border-subtle text-gray-100 focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500`,
      textarea: `${baseInputStyles} bg-surface-elevated border-border-subtle text-gray-100 focus:ring-cyan-500 resize-none`,
      checkbox: 'w-4 h-4 rounded accent-cyan-500 focus:outline-none cursor-pointer',
      label: 'block text-sm font-medium text-gray-300 mb-2',
      
      tabs: {
        list: 'flex border-b border-border-subtle',
        trigger: 'flex-1 px-4 py-2 text-sm font-medium text-gray-400 border-b-2 border-transparent transition-colors duration-200 hover:text-gray-200 data-[state=active]:text-cyan-400 data-[state=active]:border-cyan-400',
        triggerActive: '',
      },
      
      dropdown: {
        content: 'min-w-[160px] bg-surface-elevated rounded-lg shadow-lg border border-border-subtle p-1',
        item: 'flex items-center gap-2 px-3 py-2 text-sm text-gray-100 rounded cursor-pointer transition-all duration-300',
        itemHover: 'hover:bg-surface-hover',
        separator: 'h-px bg-border-subtle my-1',
      },
      
      listItem: 'p-3 border border-border-subtle transition-colors cursor-pointer hover:border-border-default text-gray-400',
      listItemActive: 'bg-cyan-400/10 border border-cyan-400/30',
      listItemHover: 'hover:bg-surface-hover',
      
      groupContainer: 'border rounded-lg overflow-hidden transition-all duration-300 border-border-subtle bg-surface-base',
      groupHeader: 'p-3 backdrop-blur-sm transition-all duration-300 bg-surface-elevated/50',
      
      error: {
        container: 'flex items-center gap-2 p-3 bg-red-900/20 border border-red-800 rounded-lg',
        text: 'text-sm text-red-400',
        icon: 'w-4 h-4 text-red-400',
      },
      info: {
        container: 'mb-4 p-4 bg-cyan-900/20 border border-cyan-800 rounded-lg',
        text: 'text-sm text-cyan-200',
        icon: 'w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5',
      },
      
      iconPrimary: 'text-gray-100',
      iconSecondary: 'text-gray-400',
      iconAccent: 'text-cyan-400',
    },
    dynamicStyles: {
      buttonPrimary: {
        background: 'linear-gradient(135deg, rgb(0, 225, 255) 0%, rgb(255, 0, 153) 100%)',
        hoverShadow: '0 0 20px rgba(0, 225, 255, 0.5), 0 0 30px rgba(255, 0, 153, 0.3)',
      },
      buttonSecondary: {
        background: 'transparent',
        borderColor: 'rgb(255, 0, 153)',
        color: 'rgb(255, 0, 153)',
      },
      buttonSettings: {
        background: 'linear-gradient(135deg, rgb(255, 0, 153) 0%, rgb(219, 39, 119) 100%)',
        hoverShadow: '0 0 20px rgba(255, 0, 153, 0.5)',
      },
    },
  },
  
  xipz: {
    name: 'Xipz',
    styles: {
      mainContainer: 'bg-gradient-to-br from-primary-950 via-primary-900 to-primary-950 border-primary-800/50',
      drawerContainer: 'bg-gradient-to-br from-primary-950 via-primary-900 to-primary-950 border-primary-800/50',
      dialogContainer: 'bg-primary-900 rounded-lg shadow-2xl shadow-primary-950/50',
      panelHeader: 'border-b border-primary-800/50 bg-primary-900/30',
      
      heading: 'text-xl font-semibold text-primary-100',
      textPrimary: 'text-primary-100',
      textSecondary: 'text-primary-300',
      textTertiary: 'text-primary-400',
      
      buttonPrimary: 'px-4 py-2 text-white rounded-lg transition-all duration-300 font-medium hover:shadow-[0_0_20px_rgba(239,68,68,0.5)]',
      buttonSecondary: 'px-4 py-2 border-2 rounded-lg transition-all duration-300 font-medium hover:shadow-[0_0_20px_rgba(239,68,68,0.3)] text-red-500 border-red-500 hover:bg-red-500/10',
      buttonIcon: 'p-1 rounded hover:bg-primary-800/50 transition-all duration-300',
      buttonSettings: 'px-4 py-2 text-white rounded-lg transition-all duration-300 font-medium hover:shadow-[0_0_20px_rgba(239,68,68,0.5)]',
      
      input: `${baseInputStyles} bg-primary-900/50 border-primary-800/50 text-primary-100 focus:ring-1 focus:ring-accent-500 focus:border-accent-500`,
      textarea: `${baseInputStyles} bg-primary-900/50 border-primary-800/50 text-primary-100 focus:ring-accent-500 resize-none`,
      checkbox: 'w-4 h-4 rounded accent-accent-500 focus:outline-none cursor-pointer',
      label: 'block text-sm font-medium text-primary-300 mb-2',
      
      tabs: {
        list: 'flex border-b border-primary-800/50',
        trigger: 'flex-1 px-4 py-2 text-sm font-medium text-primary-300 border-b-2 border-transparent transition-colors duration-200 hover:text-primary-100 data-[state=active]:text-accent-400 data-[state=active]:border-accent-500',
        triggerActive: '',
      },
      
      dropdown: {
        content: 'min-w-[160px] bg-primary-900 rounded-lg shadow-lg border border-primary-800/50 p-1',
        item: 'flex items-center gap-2 px-3 py-2 text-sm text-primary-100 rounded cursor-pointer transition-all duration-300',
        itemHover: 'hover:bg-primary-800/50',
        separator: 'h-px bg-primary-800/50 my-1',
      },
      
      listItem: 'p-3 border border-primary-800/50 transition-colors cursor-pointer hover:border-primary-700/50 hover:bg-primary-800/20 text-primary-400',
      listItemActive: 'bg-accent-500/10 border border-accent-500/30',
      listItemHover: 'hover:bg-primary-800/20',
      
      groupContainer: 'border rounded-lg overflow-hidden transition-all duration-300 border-primary-800/50 bg-primary-900/30',
      groupHeader: 'p-3 backdrop-blur-sm transition-all duration-300 bg-primary-800/30',
      
      error: {
        container: 'flex items-center gap-2 p-3 bg-red-50/10 border border-red-500/30 rounded-lg',
        text: 'text-sm text-red-400',
        icon: 'w-4 h-4 text-red-400',
      },
      info: {
        container: 'mb-4 p-4 bg-accent-500/20 border border-primary-800/50 rounded-lg',
        text: 'text-sm text-primary-200',
        icon: 'w-5 h-5 text-accent-400 flex-shrink-0 mt-0.5',
      },
      
      iconPrimary: 'text-primary-100',
      iconSecondary: 'text-primary-400',
      iconAccent: 'text-accent-400',
    },
    dynamicStyles: {
      buttonPrimary: {
        background: 'linear-gradient(135deg, rgb(239, 68, 68) 0%, rgb(220, 38, 38) 100%)',
        hoverShadow: '0 0 20px rgba(239, 68, 68, 0.5)',
      },
      buttonSecondary: {
        background: 'transparent',
        borderColor: 'rgb(239, 68, 68)',
        color: 'rgb(239, 68, 68)',
      },
    },
  },
}

export function getTheme(themeName: string): ThemeConfig {
  return themes[themeName] || themes.light
}