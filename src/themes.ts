/**
 * Code by Xipzer
 */

export interface ThemeConfig {
  name: string

  styles: {
    mainContainer: string
    drawerContainer: string
    dialogContainer: string
    panelHeader: string

    heading: string
    textPrimary: string
    textSecondary: string
    textTertiary: string

    buttonPrimary: string
    buttonPrimaryHover?: string
    buttonSecondary: string
    buttonSecondaryHover?: string
    buttonIcon: string
    buttonSettings: string

    input: string
    textarea: string
    checkbox: string
    label: string

    tabs: {
      list: string
      trigger: string
      triggerActive: string
    }

    dropdown: {
      content: string
      item: string
      itemHover: string
      separator: string
    }

    listItem: string
    listItemActive: string
    listItemHover: string

    groupContainer: string
    groupHeader: string

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

    iconPrimary: string
    iconSecondary: string
    iconAccent: string

    resizeHandle: string
    resizeHandleHover: string

    wallet: {
      headerBg: string
      headerBorder: string
      titleGradient: string
      titleIconBg: string
      buttonPrimaryGradient: string
      buttonPrimaryShadow: string
      buttonSecondaryBg: string
      buttonSecondaryBorder: string
      buttonSecondaryHover: string
      tabActiveBg: string
      tabActiveBorder: string
      tabActiveText: string
      tabInactiveText: string
      tabHover: string
      groupCardBg: string
      groupCardBorder: string
      groupCardHover: string
      groupHeaderBg: string
      walletCardBg: string
      walletCardBorder: string
      walletCardActiveBg: string
      walletCardActiveBorder: string
      walletCardActiveGlow: string
      walletCardHover: string
      accentLine: string
      dragHandleColor: string
      deleteText: string
      deleteHover: string
    }

    walletDetail: {
      headerBg: string
      headerBorder: string
      titleGradient: string
      walletIconBg: string
      portfolioBg: string
      portfolioBorder: string
      portfolioGlow: string
      valueGradient: string
      sendGradient: string
      sendShadow: string
      receiveGradient: string
      receiveBorder: string
      receiveText: string
      tabActiveBg: string
      tabActiveBorder: string
      tabActiveText: string
      tabInactiveText: string
      tabHover: string
      badgeLiveBg: string
      badgeLiveText: string
      badgeCachedBg: string
      badgeCachedText: string
      addressBg: string
      iconButtonHover: string
    }

    tokenList: {
      cardBg: string
      cardBorder: string
      cardHover: string
      cardShadow: string
      iconBg: string
      headerGradient: string
      badgeLiveBg: string
      badgeLiveText: string
      badgeCachedBg: string
      badgeCachedText: string
      badgePartialBg: string
      badgePartialText: string
    }

    networkSummary: {
      cardBg: string
      cardBorder: string
      cardHover: string
      cardShadow: string
      execCardBg: string
      execCardBorder: string
      execCardGlow: string
      execIconBg: string
      execBadgeBg: string
      iconBg: string
      dividerColor: string
      progressBg: string
      progressFill: string
      headerGradient: string
    }

    chatSidebar: {
      headerBg: string
      headerBorder: string
      newChatGradient: string
      newChatShadow: string
      activeCardBg: string
      activeCardBorder: string
      activeCardGlow: string
      hoverCardBg: string
      cardBorder: string
      iconActive: string
      iconDefault: string
      inputBg: string
      inputBorder: string
      inputFocus: string
    }

    chatInterface: {
      headerBg: string
      headerBorder: string
      titleGradient: string
      settingsHover: string
      inputContainerBg: string
      inputBg: string
      inputSolidBg: string
      inputBorder: string
      inputFocusBorder: string
      inputFocusRing: string
      sendGradient: string
      sendShadow: string
      sendDisabled: string
      loadingDotBg: string
      emptyStateBg: string
      emptyStateBorder: string
      emptyStateIconBg: string
      configButtonGradient: string
    }

    chatMessage: {
      userBubbleBg: string
      userBubbleShadow: string
      userBubbleBlur: string
      userTextColor: string
      userTimestamp: string
      userAvatarBg: string
      userAvatarRing: string
      assistantBubbleBg: string
      assistantBubbleBorder: string
      assistantBubbleShadow: string
      assistantBubbleBlur: string
      assistantIconBg: string
      assistantIconShadow: string
      assistantTimestamp: string
      proseClass: string
    }

    mobileNav: {
      headerBg: string
      headerBorder: string
      logoGradient: string
      titleGradient: string
      menuButtonBg: string
      menuButtonHover: string
      overlayBg: string
      panelBg: string
      panelBorder: string
      navItemHover: string
      navItemActive: string
      navIconColor: string
      navIconActive: string
      navTextColor: string
      bottomBarBg: string
      bottomBarBorder: string
      bottomItemHover: string
      bottomItemActive: string
    }

    unlockScreen: {
      bg: string
      meshGradient1: string
      meshGradient2: string
      particleColor: string
      particleOpacity?: number
      cardBg: string
      cardBorder: string
      cardGlow: string
      textPrimary: string
      textSecondary: string
      textMuted: string
      inputBg: string
      inputBorder: string
      inputFocusBorder: string
      accentGradient: string
      glowColor: string
      buttonGradient: string
      buttonShadow: string
    }
  }

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

const baseInputStyles =
  'w-full px-3 py-2 border rounded-lg focus:outline-none transition-colors duration-150'

export const themes: Record<string, ThemeConfig> = {
  light: {
    name: 'Light',
    styles: {
      mainContainer: 'bg-surface-base border-border-subtle',
      drawerContainer: 'bg-surface-base border-border-subtle',
      dialogContainer: 'bg-white shadow-lg border border-gray-200',
      panelHeader: 'border-b border-border-subtle',

      heading: 'text-xl font-semibold text-gray-900',
      textPrimary: 'text-gray-900',
      textSecondary: 'text-gray-700',
      textTertiary: 'text-gray-500',

      buttonPrimary:
        'px-4 py-2 text-white rounded-lg transition-all duration-300 font-medium hover:shadow-[0_0_25px_rgba(99,102,241,0.3)]',
      buttonSecondary:
        'px-4 py-2 border-2 rounded-lg transition-all duration-300 font-medium hover:shadow-[0_0_20px_rgba(99,102,241,0.2)] text-indigo-600 border-indigo-400 hover:bg-indigo-50',
      buttonIcon: 'p-1 rounded hover:bg-indigo-50 transition-all duration-300',
      buttonSettings:
        'px-4 py-2 text-white rounded-lg transition-all duration-300 font-medium hover:shadow-[0_0_25px_rgba(99,102,241,0.3)]',

      input: `${baseInputStyles} bg-white border-indigo-200 text-slate-900 focus:ring-1 focus:ring-indigo-400/30 focus:border-indigo-400`,
      textarea: `${baseInputStyles} bg-white border-indigo-200 text-slate-900 focus:ring-indigo-400/30 resize-none`,
      checkbox: 'w-4 h-4 rounded accent-indigo-500 focus:outline-none cursor-pointer',
      label: 'block text-sm font-medium text-slate-600 mb-2',

      tabs: {
        list: 'flex border-b border-indigo-100',
        trigger:
          'flex-1 px-4 py-2 text-sm font-medium text-slate-500 border-b-2 border-transparent transition-colors duration-200 hover:text-slate-700 data-[state=active]:text-indigo-600 data-[state=active]:border-indigo-500',
        triggerActive: '',
      },

      dropdown: {
        content: 'min-w-[160px] bg-white rounded-lg shadow-lg border border-indigo-100 p-1',
        item: 'flex items-center gap-2 px-2.5 py-2 text-sm text-slate-800 rounded cursor-pointer transition-all duration-300',
        itemHover: 'hover:bg-indigo-50',
        separator: 'h-px bg-indigo-100 my-1',
      },

      listItem:
        'p-3 border border-indigo-100 transition-colors cursor-pointer hover:border-indigo-200',
      listItemActive: 'bg-indigo-50 border border-indigo-300',
      listItemHover: 'hover:bg-indigo-50/50',

      groupContainer:
        'border rounded-lg overflow-hidden transition-all duration-300 border-indigo-100 bg-white',
      groupHeader: 'p-3 backdrop-blur-sm transition-all duration-300 bg-indigo-50/50',

      error: {
        container: 'flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg',
        text: 'text-sm text-red-600',
        icon: 'w-4 h-4 text-red-600',
      },
      info: {
        container: 'mb-4 p-4 bg-indigo-50 border border-indigo-200 rounded-lg',
        text: 'text-sm text-indigo-800',
        icon: 'w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5',
      },

      iconPrimary: 'text-slate-900',
      iconSecondary: 'text-slate-500',
      iconAccent: 'text-indigo-600',

      resizeHandle: 'bg-indigo-100',
      resizeHandleHover: 'hover:bg-indigo-500',

      wallet: {
        headerBg: 'bg-white/70',
        headerBorder: 'border-indigo-200/40',
        titleGradient: 'from-indigo-500 via-purple-500 to-indigo-600',
        titleIconBg: 'bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600',
        buttonPrimaryGradient: 'from-indigo-500 via-purple-500 to-indigo-600',
        buttonPrimaryShadow: 'shadow-indigo-500/15 hover:shadow-indigo-500/25',
        buttonSecondaryBg: 'bg-indigo-50/80',
        buttonSecondaryBorder: 'border-indigo-200/50',
        buttonSecondaryHover: 'hover:bg-indigo-100/80',
        tabActiveBg: 'bg-indigo-100/80',
        tabActiveBorder: 'border-indigo-400/40',
        tabActiveText: 'text-indigo-600',
        tabInactiveText: 'text-slate-500',
        tabHover: 'hover:bg-indigo-50/60',
        groupCardBg: 'bg-white/70',
        groupCardBorder: 'border-indigo-200/30',
        groupCardHover: 'hover:border-indigo-300/50',
        groupHeaderBg: 'bg-indigo-50/50',
        walletCardBg: 'bg-white/50',
        walletCardBorder: 'border-indigo-200/30',
        walletCardActiveBg: 'bg-indigo-50/80',
        walletCardActiveBorder: 'border-indigo-400/40',
        walletCardActiveGlow: 'shadow-indigo-400/10',
        walletCardHover: 'hover:bg-indigo-50/60',
        accentLine: 'bg-gradient-to-b from-indigo-500 to-purple-500',
        dragHandleColor: 'text-slate-500',
        deleteText: 'text-red-500',
        deleteHover: 'hover:bg-red-50/80',
      },

      walletDetail: {
        headerBg: 'bg-white/70',
        headerBorder: 'border-indigo-200/40',
        titleGradient: 'from-indigo-500 via-purple-500 to-indigo-600',
        walletIconBg: 'bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600',
        portfolioBg: 'bg-gradient-to-br from-white/80 to-indigo-50/80',
        portfolioBorder: 'border-indigo-200/40',
        portfolioGlow: 'shadow-lg shadow-indigo-200/20',
        valueGradient: 'from-slate-900 to-slate-700',
        sendGradient: 'from-indigo-500 via-purple-500 to-indigo-600',
        sendShadow: 'shadow-indigo-500/15 hover:shadow-indigo-500/25',
        receiveGradient: 'from-indigo-50 to-purple-50',
        receiveBorder: 'border-indigo-200/50',
        receiveText: 'text-slate-700',
        tabActiveBg: 'bg-indigo-100/80',
        tabActiveBorder: 'border-indigo-400/40',
        tabActiveText: 'text-indigo-600',
        tabInactiveText: 'text-slate-500',
        tabHover: 'hover:bg-indigo-50/60',
        badgeLiveBg: 'bg-green-500/10',
        badgeLiveText: 'text-green-600',
        badgeCachedBg: 'bg-yellow-500/10',
        badgeCachedText: 'text-amber-700',
        addressBg: 'bg-indigo-50/50',
        iconButtonHover: 'hover:bg-indigo-50',
      },

      tokenList: {
        cardBg: 'bg-white/70',
        cardBorder: 'border-indigo-200/40',
        cardHover: 'hover:border-indigo-300/60 hover:shadow-md hover:shadow-indigo-200/20',
        cardShadow: 'shadow-sm shadow-indigo-100/50',
        iconBg: 'bg-gradient-to-br from-indigo-100 to-purple-100',
        headerGradient: 'from-indigo-500 to-purple-500',
        badgeLiveBg: 'bg-green-500/10',
        badgeLiveText: 'text-green-600',
        badgeCachedBg: 'bg-yellow-500/10',
        badgeCachedText: 'text-amber-700',
        badgePartialBg: 'bg-blue-500/10',
        badgePartialText: 'text-blue-600',
      },

      networkSummary: {
        cardBg: 'bg-white/70',
        cardBorder: 'border-indigo-200/40',
        cardHover: 'hover:border-indigo-300/60 hover:shadow-md hover:shadow-indigo-200/20',
        cardShadow: 'shadow-sm shadow-indigo-100/50',
        execCardBg: 'bg-gradient-to-br from-indigo-50/80 to-purple-50/80',
        execCardBorder: 'border-indigo-300/50',
        execCardGlow: 'shadow-indigo-200/20',
        execIconBg: 'bg-gradient-to-br from-indigo-500 to-purple-500',
        execBadgeBg: 'bg-indigo-500',
        iconBg: 'bg-gradient-to-br from-indigo-100 to-purple-100',
        dividerColor: 'border-indigo-200/40',
        progressBg: 'bg-indigo-100/50',
        progressFill: 'bg-gradient-to-r from-indigo-500 to-purple-500',
        headerGradient: 'from-indigo-500 to-purple-500',
      },

      chatSidebar: {
        headerBg: 'bg-white/70',
        headerBorder: 'border-indigo-200/40',
        newChatGradient: 'from-indigo-500 via-purple-500 to-indigo-600',
        newChatShadow: 'shadow-indigo-500/15 hover:shadow-indigo-500/25',
        activeCardBg: 'bg-indigo-50/80',
        activeCardBorder: 'border-indigo-400/40',
        activeCardGlow: 'shadow-indigo-400/10',
        hoverCardBg: 'hover:bg-indigo-50/60',
        cardBorder: 'border-indigo-200/30',
        iconActive: 'text-indigo-600',
        iconDefault: 'text-slate-500',
        inputBg: 'bg-white/80',
        inputBorder: 'border-indigo-200/50',
        inputFocus: 'focus:border-indigo-400 focus:ring-indigo-400/20',
      },

      chatInterface: {
        headerBg: 'bg-white',
        headerBorder: 'border-indigo-200/40',
        titleGradient: 'from-indigo-500 via-purple-500 to-indigo-600',
        settingsHover: 'hover:bg-indigo-50/80',
        inputContainerBg: 'bg-white/70',
        inputBg: 'bg-white/90',
        inputSolidBg: 'bg-white',
        inputBorder: 'border-indigo-200/50',
        inputFocusBorder: 'focus:border-indigo-400',
        inputFocusRing: 'focus:ring-indigo-400/20',
        sendGradient: 'from-indigo-500 via-purple-500 to-indigo-600',
        sendShadow: 'shadow-indigo-500/20 hover:shadow-indigo-500/30',
        sendDisabled: 'disabled:from-gray-300 disabled:to-gray-400 disabled:shadow-none',
        loadingDotBg: 'bg-indigo-500',
        emptyStateBg: 'bg-white/70',
        emptyStateBorder: 'border-indigo-200/40',
        emptyStateIconBg: 'bg-gradient-to-br from-indigo-500 to-purple-500',
        configButtonGradient: 'from-indigo-500 to-purple-500',
      },

      chatMessage: {
        userBubbleBg: 'bg-gradient-to-br from-indigo-500 via-purple-500 to-indigo-600',
        userBubbleShadow: 'shadow-lg shadow-indigo-500/15',
        userBubbleBlur: 'backdrop-blur-sm',
        userTextColor: 'text-white',
        userTimestamp: 'text-white/70',
        userAvatarBg: 'bg-gradient-to-br from-slate-600 to-slate-700',
        userAvatarRing: 'ring-2 ring-indigo-300/30',
        assistantBubbleBg: 'bg-white/80',
        assistantBubbleBorder: 'border border-indigo-200/40',
        assistantBubbleShadow: 'shadow-lg shadow-indigo-100/30',
        assistantBubbleBlur: 'backdrop-blur-sm',
        assistantIconBg: 'from-indigo-500 via-purple-500 to-indigo-600',
        assistantIconShadow: '',
        assistantTimestamp: 'text-slate-500',
        proseClass: 'prose-slate',
      },

      mobileNav: {
        headerBg: 'bg-white/80',
        headerBorder: 'border-indigo-200/40',
        logoGradient: 'from-indigo-500 via-purple-500 to-indigo-600',
        titleGradient: 'from-indigo-500 via-purple-500 to-indigo-600',
        menuButtonBg: 'bg-indigo-50/80',
        menuButtonHover: 'hover:bg-indigo-100/80',
        overlayBg: 'bg-black/40',
        panelBg: 'bg-white/95',
        panelBorder: 'border-indigo-200/40',
        navItemHover: 'hover:bg-indigo-50',
        navItemActive: 'bg-indigo-100/80',
        navIconColor: 'text-slate-500',
        navIconActive: 'text-indigo-600',
        navTextColor: 'text-slate-700',
        bottomBarBg: 'bg-white/90',
        bottomBarBorder: 'border-indigo-200/40',
        bottomItemHover: 'hover:bg-indigo-50/80',
        bottomItemActive: '',
      },

      unlockScreen: {
        bg: 'from-slate-100 via-indigo-100 to-purple-100',
        meshGradient1: 'from-indigo-400/15',
        meshGradient2: 'from-purple-400/10',
        particleColor: '99, 102, 241',
        particleOpacity: 1.8,
        cardBg: 'bg-gradient-to-br from-white to-indigo-50/80',
        cardBorder: 'border-indigo-200/40',
        cardGlow: '',
        textPrimary: 'text-slate-900',
        textSecondary: 'text-slate-600',
        textMuted: 'text-slate-500',
        inputBg: 'bg-white/60',
        inputBorder: 'border-indigo-200/50',
        inputFocusBorder: 'focus:border-indigo-400',
        accentGradient: 'from-indigo-400 via-purple-400 to-indigo-500',
        glowColor: 'indigo',
        buttonGradient: 'from-indigo-500 via-purple-500 to-indigo-600',
        buttonShadow: 'shadow-indigo-500/30 hover:shadow-indigo-500/50',
      },
    },
    dynamicStyles: {
      buttonPrimary: {
        background: 'linear-gradient(135deg, rgb(79, 70, 229) 0%, rgb(67, 56, 202) 100%)',
        hoverShadow: '0 0 25px rgba(79, 70, 229, 0.4)',
      },
      buttonSecondary: {
        background: 'transparent',
        borderColor: 'rgb(79, 70, 229)',
        color: 'rgb(79, 70, 229)',
      },
      buttonSettings: {
        background: 'linear-gradient(135deg, rgb(79, 70, 229) 0%, rgb(67, 56, 202) 100%)',
        hoverShadow: '0 0 25px rgba(79, 70, 229, 0.4)',
      },
    },
  },

  dark: {
    name: 'Dark',
    styles: {
      mainContainer: 'bg-surface-base border-accent-500/10',
      drawerContainer: 'bg-surface-base border-accent-500/10',
      dialogContainer: 'bg-surface-base shadow-lg border border-accent-500/10',
      panelHeader: 'border-b border-accent-500/10',

      heading: 'text-xl font-semibold text-gray-100',
      textPrimary: 'text-gray-100',
      textSecondary: 'text-gray-300',
      textTertiary: 'text-gray-400',

      buttonPrimary:
        'px-4 py-2 text-white rounded-lg transition-all duration-300 font-medium hover:shadow-[0_0_20px_rgba(139,139,255,0.2)]',
      buttonSecondary:
        'px-4 py-2 border-2 rounded-lg transition-all duration-300 font-medium hover:shadow-[0_0_20px_rgba(139,139,255,0.15)] text-accent-500 border-accent-500 hover:bg-accent-500/10',
      buttonIcon: 'p-1 rounded hover:bg-accent-500/10 transition-all duration-300',
      buttonSettings:
        'px-4 py-2 text-white rounded-lg transition-all duration-300 font-medium hover:shadow-[0_0_20px_rgba(139,139,255,0.2)]',

      input: `${baseInputStyles} bg-surface-elevated border-accent-500/20 text-[#f0f2ff] focus:ring-1 focus:ring-accent-500/30 focus:border-accent-500/50`,
      textarea: `${baseInputStyles} bg-surface-elevated border-accent-500/20 text-[#f0f2ff] focus:ring-accent-500/30 resize-none`,
      checkbox: 'w-4 h-4 rounded accent-accent-500 focus:outline-none cursor-pointer',
      label: 'block text-sm font-medium text-[#a0a4c0] mb-2',

      tabs: {
        list: 'flex border-b border-accent-500/10',
        trigger:
          'flex-1 px-4 py-2 text-sm font-medium text-[#7d81a3] border-b-2 border-transparent transition-colors duration-200 hover:text-[#a0a4c0] data-[state=active]:text-accent-500 data-[state=active]:border-accent-500',
        triggerActive: '',
      },

      dropdown: {
        content: 'min-w-[160px] bg-surface-elevated rounded-lg shadow-lg border border-accent-500/15 p-1',
        item: 'flex items-center gap-2 px-2.5 py-2 text-sm text-[#f0f2ff] rounded cursor-pointer transition-all duration-300',
        itemHover: 'hover:bg-accent-500/10',
        separator: 'h-px bg-accent-500/10 my-1',
      },

      listItem:
        'p-3 border border-accent-500/10 transition-colors cursor-pointer hover:border-accent-500/20 text-[#a0a4c0]',
      listItemActive: 'bg-accent-500/10 border border-accent-500/30',
      listItemHover: 'hover:bg-accent-500/5',

      groupContainer:
        'border rounded-lg overflow-hidden transition-all duration-300 border-accent-500/10 bg-surface-base',
      groupHeader: 'p-3 backdrop-blur-sm transition-all duration-300 bg-surface-elevated/50',

      error: {
        container: 'flex items-center gap-2 p-3 bg-red-900/20 border border-red-800 rounded-lg',
        text: 'text-sm text-red-400',
        icon: 'w-4 h-4 text-red-400',
      },
      info: {
        container: 'mb-4 p-4 bg-accent-500/10 border border-accent-500/20 rounded-lg',
        text: 'text-sm text-[#a0a4c0]',
        icon: 'w-5 h-5 text-accent-500 flex-shrink-0 mt-0.5',
      },

      iconPrimary: 'text-[#f0f2ff]',
      iconSecondary: 'text-[#7d81a3]',
      iconAccent: 'text-accent-500',

      resizeHandle: 'bg-accent-500/10',
      resizeHandleHover: 'hover:bg-accent-500',

      wallet: {
        headerBg: 'bg-surface-base/50',
        headerBorder: 'border-accent-500/10',
        titleGradient: 'from-accent-500 via-[#a78bfa] to-accent-500',
        titleIconBg: 'bg-gradient-to-r from-accent-500 via-[#a78bfa] to-accent-500',
        buttonPrimaryGradient: 'from-accent-500 via-[#a78bfa] to-accent-500',
        buttonPrimaryShadow: 'shadow-accent-500/10 hover:shadow-accent-500/20',
        buttonSecondaryBg: 'bg-white/5',
        buttonSecondaryBorder: 'border-accent-500/20',
        buttonSecondaryHover: 'hover:bg-accent-500/10',
        tabActiveBg: 'bg-accent-500/10',
        tabActiveBorder: 'border-accent-500/30',
        tabActiveText: 'text-accent-500',
        tabInactiveText: 'text-[#a0a4c0]',
        tabHover: 'hover:bg-white/5',
        groupCardBg: 'bg-surface-elevated/50',
        groupCardBorder: 'border-accent-500/10',
        groupCardHover: 'hover:border-accent-500/20',
        groupHeaderBg: 'bg-surface-base/50',
        walletCardBg: 'bg-surface-elevated/50',
        walletCardBorder: 'border-accent-500/10',
        walletCardActiveBg: 'bg-accent-500/10',
        walletCardActiveBorder: 'border-accent-500/30',
        walletCardActiveGlow: 'shadow-accent-500/5',
        walletCardHover: 'hover:bg-accent-500/10',
        accentLine: 'bg-gradient-to-b from-accent-500 to-[#a78bfa]',
        dragHandleColor: 'text-[#7d81a3]',
        deleteText: 'text-red-400',
        deleteHover: 'hover:bg-red-500/10',
      },

      walletDetail: {
        headerBg: 'bg-surface-base/50',
        headerBorder: 'border-accent-500/10',
        titleGradient: 'from-accent-500 via-[#a78bfa] to-accent-500',
        walletIconBg: 'bg-gradient-to-r from-accent-500 via-[#a78bfa] to-accent-500',
        portfolioBg: 'bg-gradient-to-br from-surface-elevated/80 to-surface-base/50',
        portfolioBorder: 'border-accent-500/15',
        portfolioGlow: 'shadow-lg shadow-accent-500/3',
        valueGradient: 'from-[#f0f2ff] to-[#a0a4c0]',
        sendGradient: 'from-accent-500 via-[#a78bfa] to-accent-500',
        sendShadow: 'shadow-accent-500/10 hover:shadow-accent-500/20',
        receiveGradient: 'from-surface-elevated to-surface-base',
        receiveBorder: 'border-accent-500/20',
        receiveText: 'text-[#f0f2ff]',
        tabActiveBg: 'bg-accent-500/10',
        tabActiveBorder: 'border-accent-500/30',
        tabActiveText: 'text-accent-500',
        tabInactiveText: 'text-[#a0a4c0]',
        tabHover: 'hover:bg-accent-500/5',
        badgeLiveBg: 'bg-green-500/10',
        badgeLiveText: 'text-green-400',
        badgeCachedBg: 'bg-yellow-500/10',
        badgeCachedText: 'text-yellow-400',
        addressBg: 'bg-surface-elevated/50',
        iconButtonHover: 'hover:bg-accent-500/10',
      },

      tokenList: {
        cardBg: 'bg-surface-elevated/50',
        cardBorder: 'border-accent-500/10',
        cardHover: 'hover:border-accent-500/20 hover:bg-accent-500/5',
        cardShadow: '',
        iconBg: 'bg-gradient-to-br from-accent-500/15 to-accent-500/5',
        headerGradient: 'from-accent-500 to-[#a78bfa]',
        badgeLiveBg: 'bg-green-500/10',
        badgeLiveText: 'text-green-400',
        badgeCachedBg: 'bg-yellow-500/10',
        badgeCachedText: 'text-yellow-400',
        badgePartialBg: 'bg-blue-500/10',
        badgePartialText: 'text-blue-400',
      },

      networkSummary: {
        cardBg: 'bg-surface-elevated/50',
        cardBorder: 'border-accent-500/10',
        cardHover: 'hover:border-accent-500/20 hover:bg-accent-500/5',
        cardShadow: '',
        execCardBg: 'bg-gradient-to-br from-accent-500/10 to-[#a78bfa]/5',
        execCardBorder: 'border-accent-500/30',
        execCardGlow: 'shadow-accent-500/5',
        execIconBg: 'bg-gradient-to-br from-accent-500 to-[#a78bfa]',
        execBadgeBg: 'bg-accent-500',
        iconBg: 'bg-gradient-to-br from-accent-500/15 to-accent-500/5',
        dividerColor: 'border-accent-500/10',
        progressBg: 'bg-accent-500/10',
        progressFill: 'bg-gradient-to-r from-accent-500 to-[#a78bfa]',
        headerGradient: 'from-accent-500 to-[#a78bfa]',
      },

      chatSidebar: {
        headerBg: 'bg-surface-base/50',
        headerBorder: 'border-accent-500/10',
        newChatGradient: 'from-accent-500 via-[#a78bfa] to-accent-500',
        newChatShadow: 'shadow-accent-500/10 hover:shadow-accent-500/15',
        activeCardBg: 'bg-accent-500/10',
        activeCardBorder: 'border-accent-500/20',
        activeCardGlow: 'shadow-accent-500/5',
        hoverCardBg: 'hover:bg-accent-500/5',
        cardBorder: 'border-accent-500/10',
        iconActive: 'text-accent-500',
        iconDefault: 'text-[#7d81a3]',
        inputBg: 'bg-surface-elevated/50',
        inputBorder: 'border-accent-500/15',
        inputFocus: 'focus:border-accent-500/30 focus:ring-accent-500/10',
      },

      chatInterface: {
        headerBg: 'bg-surface-base',
        headerBorder: 'border-accent-500/10',
        titleGradient: 'from-accent-500 via-[#a78bfa] to-accent-500',
        settingsHover: 'hover:bg-accent-500/10',
        inputContainerBg: 'bg-surface-base/50',
        inputBg: 'bg-surface-elevated/50',
        inputSolidBg: 'bg-surface-elevated',
        inputBorder: 'border-accent-500/15',
        inputFocusBorder: 'focus:border-accent-500/30',
        inputFocusRing: 'focus:ring-accent-500/10',
        sendGradient: 'from-accent-500 via-[#a78bfa] to-accent-500',
        sendShadow: 'shadow-accent-500/10 hover:shadow-accent-500/15',
        sendDisabled: 'disabled:from-slate-600 disabled:to-slate-700 disabled:shadow-none',
        loadingDotBg: 'bg-accent-500',
        emptyStateBg: 'bg-surface-base/50',
        emptyStateBorder: 'border-accent-500/10',
        emptyStateIconBg: 'bg-gradient-to-br from-accent-500 to-[#a78bfa]',
        configButtonGradient: 'from-accent-500 to-[#a78bfa]',
      },

      chatMessage: {
        userBubbleBg: 'bg-gradient-to-br from-accent-500 via-[#a78bfa] to-accent-500',
        userBubbleShadow: 'shadow-lg shadow-accent-500/10',
        userBubbleBlur: '',
        userTextColor: 'text-white',
        userTimestamp: 'text-white/60',
        userAvatarBg: 'bg-gradient-to-br from-surface-elevated to-surface-base',
        userAvatarRing: 'ring-2 ring-accent-500/20',
        assistantBubbleBg: 'bg-surface-elevated',
        assistantBubbleBorder: 'border border-accent-500/10',
        assistantBubbleShadow: 'shadow-lg shadow-black/10',
        assistantBubbleBlur: '',
        assistantIconBg: 'from-accent-500 via-[#a78bfa] to-accent-500',
        assistantIconShadow: '',
        assistantTimestamp: 'text-[#7d81a3]',
        proseClass: 'prose-invert',
      },

      mobileNav: {
        headerBg: 'bg-bg-base/80',
        headerBorder: 'border-accent-500/10',
        logoGradient: 'from-accent-500 via-[#a78bfa] to-accent-500',
        titleGradient: 'from-accent-500 via-[#a78bfa] to-accent-500',
        menuButtonBg: 'bg-surface-elevated/50',
        menuButtonHover: 'hover:bg-accent-500/10',
        overlayBg: 'bg-black/60',
        panelBg: 'bg-bg-base/95',
        panelBorder: 'border-accent-500/15',
        navItemHover: 'hover:bg-accent-500/5',
        navItemActive: 'bg-accent-500/10',
        navIconColor: 'text-[#7d81a3]',
        navIconActive: 'text-accent-500',
        navTextColor: 'text-[#a0a4c0]',
        bottomBarBg: 'bg-bg-base/90',
        bottomBarBorder: 'border-accent-500/10',
        bottomItemHover: 'hover:bg-accent-500/5',
        bottomItemActive: '',
      },

      unlockScreen: {
        bg: 'from-bg-base via-surface-base to-bg-base',
        meshGradient1: 'from-indigo-900/30',
        meshGradient2: 'from-purple-900/20',
        particleColor: '139, 139, 255',
        particleOpacity: 1,
        cardBg: 'bg-gradient-to-br from-surface-base to-surface-elevated',
        cardBorder: 'border-accent-500/15',
        cardGlow: '',
        textPrimary: 'text-[#f0f2ff]',
        textSecondary: 'text-[#a0a4c0]',
        textMuted: 'text-[#7d81a3]',
        inputBg: 'bg-surface-elevated/80',
        inputBorder: 'border-accent-500/20',
        inputFocusBorder: 'focus:border-accent-500/50',
        accentGradient: 'from-accent-500 via-[#a78bfa] to-accent-500',
        glowColor: 'indigo',
        buttonGradient: 'from-accent-500 via-[#a78bfa] to-accent-500',
        buttonShadow: 'shadow-accent-500/15 hover:shadow-accent-500/25',
      },
    },
    dynamicStyles: {
      buttonPrimary: {
        background: 'linear-gradient(135deg, rgb(139, 139, 255) 0%, rgb(167, 139, 250) 100%)',
        hoverShadow: '0 0 30px rgba(139, 139, 255, 0.2)',
      },
      buttonSecondary: {
        background: 'transparent',
        borderColor: 'rgb(139, 139, 255)',
        color: 'rgb(139, 139, 255)',
      },
      buttonSettings: {
        background: 'linear-gradient(135deg, rgb(139, 139, 255) 0%, rgb(167, 139, 250) 100%)',
        hoverShadow: '0 0 30px rgba(139, 139, 255, 0.2)',
      },
    },
  },

  xipz: {
    name: 'Xipz',
    styles: {
      mainContainer:
        'bg-gradient-to-br from-primary-950 via-primary-900 to-primary-950 border-primary-800/50',
      drawerContainer:
        'bg-gradient-to-br from-primary-950 via-primary-900 to-primary-950 border-primary-800/50',
      dialogContainer:
        'bg-gradient-to-br from-primary-950 via-primary-900 to-primary-950 shadow-2xl shadow-primary-950/50 border border-white/10',
      panelHeader: 'border-b border-primary-800/50 bg-primary-900/30',

      heading: 'text-xl font-semibold text-primary-100',
      textPrimary: 'text-primary-100',
      textSecondary: 'text-primary-300',
      textTertiary: 'text-primary-400',

      buttonPrimary:
        'px-4 py-2 text-white rounded-lg transition-all duration-300 font-medium hover:shadow-[0_0_20px_rgba(239,68,68,0.5)]',
      buttonSecondary:
        'px-4 py-2 border-2 rounded-lg transition-all duration-300 font-medium hover:shadow-[0_0_20px_rgba(239,68,68,0.3)] text-red-500 border-red-500 hover:bg-red-500/10',
      buttonIcon: 'p-1 rounded hover:bg-primary-800/50 transition-all duration-300',
      buttonSettings:
        'px-4 py-2 text-white rounded-lg transition-all duration-300 font-medium hover:shadow-[0_0_20px_rgba(239,68,68,0.5)]',

      input: `${baseInputStyles} bg-primary-900/50 border-primary-800/50 text-primary-100 focus:ring-1 focus:ring-accent-500 focus:border-accent-500`,
      textarea: `${baseInputStyles} bg-primary-900/50 border-primary-800/50 text-primary-100 focus:ring-accent-500 resize-none`,
      checkbox: 'w-4 h-4 rounded accent-accent-500 focus:outline-none cursor-pointer',
      label: 'block text-sm font-medium text-primary-300 mb-2',

      tabs: {
        list: 'flex border-b border-primary-800/50',
        trigger:
          'flex-1 px-4 py-2 text-sm font-medium text-primary-300 border-b-2 border-transparent transition-colors duration-200 hover:text-primary-100 data-[state=active]:text-accent-400 data-[state=active]:border-accent-500',
        triggerActive: '',
      },

      dropdown: {
        content:
          'min-w-[160px] bg-primary-900 rounded-lg shadow-lg border border-primary-800/50 p-1',
        item: 'flex items-center gap-2 px-2.5 py-2 text-sm text-primary-100 rounded cursor-pointer transition-all duration-300',
        itemHover: 'hover:bg-primary-800/50',
        separator: 'h-px bg-primary-800/50 my-1',
      },

      listItem:
        'p-3 border border-primary-800/50 transition-colors cursor-pointer hover:border-primary-700/50 hover:bg-primary-800/20 text-primary-400',
      listItemActive: 'bg-accent-500/10 border border-accent-500/30',
      listItemHover: 'hover:bg-primary-800/20',

      groupContainer:
        'border rounded-lg overflow-hidden transition-all duration-300 border-primary-800/50 bg-primary-900/30',
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

      resizeHandle: 'bg-border-subtle',
      resizeHandleHover: 'hover:bg-accent',

      wallet: {
        headerBg: 'bg-primary-900/50',
        headerBorder: 'border-primary-800/50',
        titleGradient: 'from-red-400 via-red-500 to-red-400',
        titleIconBg: 'bg-gradient-to-r from-red-500 via-red-600 to-red-500',
        buttonPrimaryGradient: 'from-red-500 via-red-600 to-red-500',
        buttonPrimaryShadow: 'shadow-red-500/25 hover:shadow-red-500/40',
        buttonSecondaryBg: 'bg-primary-800/30',
        buttonSecondaryBorder: 'border-primary-800/50',
        buttonSecondaryHover: 'hover:bg-primary-800/50',
        tabActiveBg: 'bg-red-500/10',
        tabActiveBorder: 'border-red-500/30',
        tabActiveText: 'text-red-400',
        tabInactiveText: 'text-primary-400',
        tabHover: 'hover:bg-primary-800/30',
        groupCardBg: 'bg-primary-900/30',
        groupCardBorder: 'border-primary-800/50',
        groupCardHover: 'hover:border-primary-700/50',
        groupHeaderBg: 'bg-primary-800/30',
        walletCardBg: 'bg-primary-900/30',
        walletCardBorder: 'border-primary-800/30',
        walletCardActiveBg: 'bg-red-500/10',
        walletCardActiveBorder: 'border-red-500/30',
        walletCardActiveGlow: 'shadow-red-500/10',
        walletCardHover: 'hover:bg-primary-800/30',
        accentLine: 'bg-gradient-to-b from-red-500 to-red-600',
        dragHandleColor: 'text-primary-400',
        deleteText: 'text-red-400',
        deleteHover: 'hover:bg-red-500/10',
      },

      walletDetail: {
        headerBg: 'bg-primary-900/50',
        headerBorder: 'border-primary-800/50',
        titleGradient: 'from-red-400 via-red-500 to-red-400',
        walletIconBg: 'bg-gradient-to-r from-red-500 via-red-600 to-red-500',
        portfolioBg: 'bg-gradient-to-br from-white/5 to-white/[0.02]',
        portfolioBorder: 'border-primary-800/50',
        portfolioGlow: 'shadow-lg shadow-red-500/5',
        valueGradient: 'from-white to-white/80',
        sendGradient: 'from-red-500 via-red-600 to-red-500',
        sendShadow: 'shadow-red-500/25 hover:shadow-red-500/40',
        receiveGradient: 'from-white/5 to-white/10',
        receiveBorder: 'border-primary-800/50',
        receiveText: 'text-white',
        tabActiveBg: 'bg-red-500/10',
        tabActiveBorder: 'border-red-500/30',
        tabActiveText: 'text-red-400',
        tabInactiveText: 'text-primary-400',
        tabHover: 'hover:bg-primary-800/30',
        badgeLiveBg: 'bg-green-500/10',
        badgeLiveText: 'text-green-400',
        badgeCachedBg: 'bg-yellow-500/10',
        badgeCachedText: 'text-yellow-400',
        addressBg: 'bg-primary-800/30',
        iconButtonHover: 'hover:bg-primary-800/50',
      },

      tokenList: {
        cardBg: 'bg-primary-800/30',
        cardBorder: 'border-primary-800/50',
        cardHover: 'hover:border-primary-700/50 hover:bg-primary-800/50',
        cardShadow: '',
        iconBg: 'bg-gradient-to-br from-primary-800/50 to-primary-900/50',
        headerGradient: 'from-red-400 via-red-500 to-red-400',
        badgeLiveBg: 'bg-green-500/10',
        badgeLiveText: 'text-green-400',
        badgeCachedBg: 'bg-yellow-500/10',
        badgeCachedText: 'text-yellow-400',
        badgePartialBg: 'bg-blue-500/10',
        badgePartialText: 'text-blue-400',
      },

      networkSummary: {
        cardBg: 'bg-primary-800/30',
        cardBorder: 'border-primary-800/50',
        cardHover: 'hover:border-primary-700/50 hover:bg-primary-800/50',
        cardShadow: '',
        execCardBg: 'bg-gradient-to-br from-red-500/10 to-red-600/5',
        execCardBorder: 'border-red-500/30',
        execCardGlow: 'shadow-red-500/10',
        execIconBg: 'bg-gradient-to-br from-red-500 to-red-600',
        execBadgeBg: 'bg-red-500',
        iconBg: 'bg-gradient-to-br from-primary-800/50 to-primary-900/50',
        dividerColor: 'border-primary-800/50',
        progressBg: 'bg-primary-800/50',
        progressFill: 'bg-gradient-to-r from-red-500 to-red-600',
        headerGradient: 'from-red-400 via-red-500 to-red-400',
      },

      chatSidebar: {
        headerBg: 'bg-primary-900/50',
        headerBorder: 'border-primary-800/50',
        newChatGradient: 'from-red-500 via-red-600 to-red-500',
        newChatShadow: 'shadow-red-500/25 hover:shadow-red-500/40',
        activeCardBg: 'bg-red-500/10',
        activeCardBorder: 'border-red-500/30',
        activeCardGlow: 'shadow-red-500/10',
        hoverCardBg: 'hover:bg-primary-800/30',
        cardBorder: 'border-primary-800/30',
        iconActive: 'text-red-400',
        iconDefault: 'text-primary-400',
        inputBg: 'bg-primary-900/50',
        inputBorder: 'border-primary-800/50',
        inputFocus: 'focus:border-red-500/50 focus:ring-red-500/20',
      },

      chatInterface: {
        headerBg: 'bg-primary-900',
        headerBorder: 'border-primary-800/50',
        titleGradient: 'from-red-400 via-red-500 to-red-400',
        settingsHover: 'hover:bg-primary-800/50',
        inputContainerBg: 'bg-primary-900/50',
        inputBg: 'bg-primary-900/50',
        inputSolidBg: 'bg-primary-900',
        inputBorder: 'border-primary-800/50',
        inputFocusBorder: 'focus:border-red-500/50',
        inputFocusRing: 'focus:ring-red-500/20',
        sendGradient: 'from-red-500 via-red-600 to-red-500',
        sendShadow: 'shadow-red-500/25 hover:shadow-red-500/40',
        sendDisabled: 'disabled:from-primary-700 disabled:to-primary-800 disabled:shadow-none',
        loadingDotBg: 'bg-red-400',
        emptyStateBg: 'bg-primary-900/50',
        emptyStateBorder: 'border-primary-800/50',
        emptyStateIconBg: 'bg-gradient-to-br from-yellow-500 to-orange-500',
        configButtonGradient: 'from-red-500 to-red-600',
      },

      chatMessage: {
        userBubbleBg: 'bg-gradient-to-br from-red-600 via-red-500 to-red-600',
        userBubbleShadow: 'shadow-lg shadow-red-500/20',
        userBubbleBlur: '',
        userTextColor: 'text-white',
        userTimestamp: 'text-white/60',
        userAvatarBg: 'bg-gradient-to-br from-slate-600 to-slate-700',
        userAvatarRing: 'ring-2 ring-white/10',
        assistantBubbleBg: 'bg-primary-900',
        assistantBubbleBorder: 'border border-primary-800/50',
        assistantBubbleShadow: 'shadow-lg shadow-black/20',
        assistantBubbleBlur: '',
        assistantIconBg: 'from-red-500 via-red-600 to-red-500',
        assistantIconShadow: '',
        assistantTimestamp: 'text-primary-400',
        proseClass: 'prose-invert',
      },

      mobileNav: {
        headerBg: 'bg-primary-900/80',
        headerBorder: 'border-primary-800/50',
        logoGradient: 'from-red-500 via-red-600 to-red-500',
        titleGradient: 'from-red-400 via-red-500 to-red-400',
        menuButtonBg: 'bg-primary-800/50',
        menuButtonHover: 'hover:bg-primary-800/80',
        overlayBg: 'bg-black/60',
        panelBg: 'bg-primary-900/95',
        panelBorder: 'border-primary-800/50',
        navItemHover: 'hover:bg-primary-800/50',
        navItemActive: 'bg-red-500/10',
        navIconColor: 'text-primary-400',
        navIconActive: 'text-red-400',
        navTextColor: 'text-primary-100',
        bottomBarBg: 'bg-primary-900/90',
        bottomBarBorder: 'border-primary-800/50',
        bottomItemHover: 'hover:bg-primary-800/50',
        bottomItemActive: '',
      },

      unlockScreen: {
        bg: 'from-primary-950 via-primary-900 to-primary-950',
        meshGradient1: 'from-red-900/40',
        meshGradient2: 'from-red-800/30',
        particleColor: '239, 68, 68',
        particleOpacity: 1,
        cardBg: 'bg-gradient-to-br from-primary-950 via-primary-900 to-primary-950',
        cardBorder: 'border-primary-800/50',
        cardGlow: '',
        textPrimary: 'text-primary-100',
        textSecondary: 'text-primary-200',
        textMuted: 'text-primary-400',
        inputBg: 'bg-primary-800/50',
        inputBorder: 'border-primary-800/50',
        inputFocusBorder: 'focus:border-red-500/50',
        accentGradient: 'from-red-500 via-red-600 to-red-500',
        glowColor: 'red',
        buttonGradient: 'from-red-500 via-red-600 to-red-500',
        buttonShadow: 'shadow-red-500/25 hover:shadow-red-500/40',
      },
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

  ogDark: {
    name: 'OG Dark Mode',
    styles: {
      mainContainer: 'bg-surface-base border-border-subtle',
      drawerContainer: 'bg-surface-base border-border-subtle',
      dialogContainer: 'bg-surface-base shadow-lg border border-white/10',
      panelHeader: 'border-b border-border-subtle',

      heading: 'text-xl font-semibold text-gray-100',
      textPrimary: 'text-gray-100',
      textSecondary: 'text-gray-300',
      textTertiary: 'text-gray-400',

      buttonPrimary:
        'px-4 py-2 text-white rounded-lg transition-all duration-300 font-medium hover:shadow-[0_0_20px_rgba(0,225,255,0.5),0_0_30px_rgba(255,0,153,0.3)]',
      buttonSecondary:
        'px-4 py-2 border-2 rounded-lg transition-all duration-300 font-medium hover:shadow-[0_0_20px_rgba(255,0,153,0.3)] text-pink-500 border-pink-500 hover:bg-pink-500/10',
      buttonIcon: 'p-1 rounded hover:bg-surface-hover transition-all duration-300',
      buttonSettings:
        'px-4 py-2 text-white rounded-lg transition-all duration-300 font-medium hover:shadow-[0_0_20px_rgba(255,0,153,0.5)]',

      input: `${baseInputStyles} bg-surface-elevated border-border-subtle text-gray-100 focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500`,
      textarea: `${baseInputStyles} bg-surface-elevated border-border-subtle text-gray-100 focus:ring-cyan-500 resize-none`,
      checkbox: 'w-4 h-4 rounded accent-cyan-500 focus:outline-none cursor-pointer',
      label: 'block text-sm font-medium text-gray-300 mb-2',

      tabs: {
        list: 'flex border-b border-border-subtle',
        trigger:
          'flex-1 px-4 py-2 text-sm font-medium text-gray-400 border-b-2 border-transparent transition-colors duration-200 hover:text-gray-200 data-[state=active]:text-cyan-400 data-[state=active]:border-cyan-400',
        triggerActive: '',
      },

      dropdown: {
        content:
          'min-w-[160px] bg-surface-elevated rounded-lg shadow-lg border border-border-subtle p-1',
        item: 'flex items-center gap-2 px-2.5 py-2 text-sm text-gray-100 rounded cursor-pointer transition-all duration-300',
        itemHover: 'hover:bg-surface-hover',
        separator: 'h-px bg-border-subtle my-1',
      },

      listItem:
        'p-3 border border-border-subtle transition-colors cursor-pointer hover:border-border-default text-gray-400',
      listItemActive: 'bg-cyan-400/10 border border-cyan-400/30',
      listItemHover: 'hover:bg-surface-hover',

      groupContainer:
        'border rounded-lg overflow-hidden transition-all duration-300 border-border-subtle bg-surface-base',
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

      resizeHandle: 'bg-border-subtle',
      resizeHandleHover: 'hover:bg-pink-500',

      wallet: {
        headerBg: 'bg-black/20',
        headerBorder: 'border-white/5',
        titleGradient: 'from-cyan-400 via-cyan-300 to-pink-400',
        titleIconBg: 'bg-gradient-to-r from-cyan-500 via-cyan-400 to-pink-500',
        buttonPrimaryGradient: 'from-cyan-500 via-cyan-400 to-pink-500',
        buttonPrimaryShadow: 'shadow-cyan-500/25 hover:shadow-cyan-500/40',
        buttonSecondaryBg: 'bg-white/5',
        buttonSecondaryBorder: 'border-white/10',
        buttonSecondaryHover: 'hover:bg-white/10',
        tabActiveBg: 'bg-cyan-500/10',
        tabActiveBorder: 'border-cyan-500/30',
        tabActiveText: 'text-cyan-400',
        tabInactiveText: 'text-white/50',
        tabHover: 'hover:bg-white/5',
        groupCardBg: 'bg-white/5',
        groupCardBorder: 'border-white/10',
        groupCardHover: 'hover:border-white/20',
        groupHeaderBg: 'bg-black/20',
        walletCardBg: 'bg-white/5',
        walletCardBorder: 'border-white/5',
        walletCardActiveBg: 'bg-cyan-500/10',
        walletCardActiveBorder: 'border-cyan-500/30',
        walletCardActiveGlow: 'shadow-cyan-500/10',
        walletCardHover: 'hover:bg-white/10',
        accentLine: 'bg-gradient-to-b from-cyan-500 to-pink-500',
        dragHandleColor: 'text-white/30',
        deleteText: 'text-red-400',
        deleteHover: 'hover:bg-red-500/10',
      },

      walletDetail: {
        headerBg: 'bg-black/20',
        headerBorder: 'border-white/5',
        titleGradient: 'from-cyan-400 via-cyan-300 to-pink-400',
        walletIconBg: 'bg-gradient-to-r from-cyan-500 via-cyan-400 to-pink-500',
        portfolioBg: 'bg-gradient-to-br from-white/5 to-white/[0.02]',
        portfolioBorder: 'border-white/10',
        portfolioGlow: 'shadow-lg shadow-cyan-500/5',
        valueGradient: 'from-white to-white/80',
        sendGradient: 'from-cyan-500 via-cyan-400 to-pink-500',
        sendShadow: 'shadow-cyan-500/25 hover:shadow-cyan-500/40',
        receiveGradient: 'from-white/5 to-white/10',
        receiveBorder: 'border-white/10',
        receiveText: 'text-white',
        tabActiveBg: 'bg-cyan-500/10',
        tabActiveBorder: 'border-cyan-500/30',
        tabActiveText: 'text-cyan-400',
        tabInactiveText: 'text-white/50',
        tabHover: 'hover:bg-white/5',
        badgeLiveBg: 'bg-green-500/10',
        badgeLiveText: 'text-green-400',
        badgeCachedBg: 'bg-yellow-500/10',
        badgeCachedText: 'text-yellow-400',
        addressBg: 'bg-white/5',
        iconButtonHover: 'hover:bg-white/10',
      },

      tokenList: {
        cardBg: 'bg-white/5',
        cardBorder: 'border-white/10',
        cardHover: 'hover:border-white/20 hover:bg-white/[0.07]',
        cardShadow: '',
        iconBg: 'bg-gradient-to-br from-white/10 to-white/5',
        headerGradient: 'from-cyan-400 to-pink-400',
        badgeLiveBg: 'bg-green-500/10',
        badgeLiveText: 'text-green-400',
        badgeCachedBg: 'bg-yellow-500/10',
        badgeCachedText: 'text-yellow-400',
        badgePartialBg: 'bg-blue-500/10',
        badgePartialText: 'text-blue-400',
      },

      networkSummary: {
        cardBg: 'bg-white/5',
        cardBorder: 'border-white/10',
        cardHover: 'hover:border-white/20 hover:bg-white/[0.07]',
        cardShadow: '',
        execCardBg: 'bg-gradient-to-br from-cyan-500/10 to-pink-500/5',
        execCardBorder: 'border-cyan-500/30',
        execCardGlow: 'shadow-cyan-500/10',
        execIconBg: 'bg-gradient-to-br from-cyan-500 to-pink-500',
        execBadgeBg: 'bg-cyan-500',
        iconBg: 'bg-gradient-to-br from-white/10 to-white/5',
        dividerColor: 'border-white/10',
        progressBg: 'bg-white/10',
        progressFill: 'bg-gradient-to-r from-cyan-500 to-pink-500',
        headerGradient: 'from-cyan-400 to-pink-400',
      },

      chatSidebar: {
        headerBg: 'bg-surface-elevated/50',
        headerBorder: 'border-border-subtle',
        newChatGradient: 'from-cyan-500 via-cyan-400 to-pink-500',
        newChatShadow: 'shadow-cyan-500/25 hover:shadow-cyan-500/40',
        activeCardBg: 'bg-cyan-500/10',
        activeCardBorder: 'border-cyan-500/30',
        activeCardGlow: 'shadow-cyan-500/10',
        hoverCardBg: 'hover:bg-white/5',
        cardBorder: 'border-white/5',
        iconActive: 'text-cyan-400',
        iconDefault: 'text-white/60',
        inputBg: 'bg-white/5',
        inputBorder: 'border-white/10',
        inputFocus: 'focus:border-cyan-500/50 focus:ring-cyan-500/20',
      },

      chatInterface: {
        headerBg: 'bg-surface-base',
        headerBorder: 'border-border-subtle',
        titleGradient: 'from-cyan-400 via-cyan-300 to-pink-400',
        settingsHover: 'hover:bg-white/10',
        inputContainerBg: 'bg-surface-elevated/50',
        inputBg: 'bg-white/5',
        inputSolidBg: 'bg-surface-elevated',
        inputBorder: 'border-white/10',
        inputFocusBorder: 'focus:border-cyan-500/50',
        inputFocusRing: 'focus:ring-cyan-500/20',
        sendGradient: 'from-cyan-500 via-cyan-400 to-pink-500',
        sendShadow: 'shadow-cyan-500/25 hover:shadow-cyan-500/40',
        sendDisabled: 'disabled:from-slate-600 disabled:to-slate-700 disabled:shadow-none',
        loadingDotBg: 'bg-cyan-400',
        emptyStateBg: 'bg-surface-elevated/50',
        emptyStateBorder: 'border-border-subtle',
        emptyStateIconBg: 'bg-gradient-to-br from-yellow-500 to-orange-500',
        configButtonGradient: 'from-cyan-500 to-pink-500',
      },

      chatMessage: {
        userBubbleBg: 'bg-gradient-to-br from-cyan-600 via-cyan-500 to-pink-600',
        userBubbleShadow: 'shadow-lg shadow-cyan-500/20',
        userBubbleBlur: '',
        userTextColor: 'text-white',
        userTimestamp: 'text-white/60',
        userAvatarBg: 'bg-gradient-to-br from-slate-600 to-slate-700',
        userAvatarRing: 'ring-2 ring-white/10',
        assistantBubbleBg: 'bg-surface-elevated',
        assistantBubbleBorder: 'border border-white/10',
        assistantBubbleShadow: 'shadow-lg shadow-black/20',
        assistantBubbleBlur: '',
        assistantIconBg: 'from-cyan-500 via-cyan-400 to-pink-500',
        assistantIconShadow: '',
        assistantTimestamp: 'text-white/60',
        proseClass: 'prose-invert',
      },

      mobileNav: {
        headerBg: 'bg-[#121212]/90',
        headerBorder: 'border-white/5',
        logoGradient: 'from-cyan-500 via-cyan-400 to-pink-500',
        titleGradient: 'from-cyan-400 via-cyan-300 to-pink-400',
        menuButtonBg: 'bg-white/5',
        menuButtonHover: 'hover:bg-white/10',
        overlayBg: 'bg-black/60',
        panelBg: 'bg-[#121212]/95',
        panelBorder: 'border-white/10',
        navItemHover: 'hover:bg-white/5',
        navItemActive: 'bg-cyan-500/10',
        navIconColor: 'text-white/50',
        navIconActive: 'text-cyan-400',
        navTextColor: 'text-white/80',
        bottomBarBg: 'bg-[#1a1a1a]',
        bottomBarBorder: 'border-white/5',
        bottomItemHover: 'hover:bg-white/5',
        bottomItemActive: '',
      },

      unlockScreen: {
        bg: 'from-slate-900 via-slate-800 to-slate-900',
        meshGradient1: 'from-cyan-900/40',
        meshGradient2: 'from-pink-900/30',
        particleColor: '0, 225, 255',
        particleOpacity: 1,
        cardBg: 'bg-gradient-to-br from-[#1a1a1a] to-[#222222]',
        cardBorder: 'border-white/10',
        cardGlow: '',
        textPrimary: 'text-white',
        textSecondary: 'text-white/70',
        textMuted: 'text-white/60',
        inputBg: 'bg-white/5',
        inputBorder: 'border-white/10',
        inputFocusBorder: 'focus:border-cyan-500/50',
        accentGradient: 'from-cyan-400 via-cyan-300 to-pink-400',
        glowColor: 'cyan',
        buttonGradient: 'from-cyan-500 via-cyan-400 to-pink-500',
        buttonShadow: 'shadow-cyan-500/25 hover:shadow-cyan-500/40',
      },
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

  ogLight: {
    name: 'OG Light Mode',
    styles: {
      mainContainer: 'bg-surface-base border-border-subtle',
      drawerContainer: 'bg-surface-base border-border-subtle',
      dialogContainer: 'bg-white shadow-lg border border-gray-200',
      panelHeader: 'border-b border-border-subtle',

      heading: 'text-xl font-semibold text-gray-900',
      textPrimary: 'text-gray-900',
      textSecondary: 'text-gray-700',
      textTertiary: 'text-gray-500',

      buttonPrimary:
        'px-4 py-2 text-white rounded-lg transition-all duration-300 font-medium hover:shadow-[0_0_20px_rgba(0,225,255,0.5),0_0_30px_rgba(255,0,153,0.3)]',
      buttonSecondary:
        'px-4 py-2 border-2 rounded-lg transition-all duration-300 font-medium hover:shadow-[0_0_20px_rgba(255,0,153,0.3)] text-pink-500 border-pink-500 hover:bg-pink-500/10',
      buttonIcon: 'p-1 rounded hover:bg-gray-100 transition-all duration-300',
      buttonSettings:
        'px-4 py-2 text-white rounded-lg transition-all duration-300 font-medium hover:shadow-[0_0_20px_rgba(255,0,153,0.5)]',

      input: `${baseInputStyles} bg-white border-gray-300 text-gray-900 focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500`,
      textarea: `${baseInputStyles} bg-white border-gray-300 text-gray-900 focus:ring-cyan-500 resize-none`,
      checkbox: 'w-4 h-4 rounded accent-cyan-500 focus:outline-none cursor-pointer',
      label: 'block text-sm font-medium text-gray-700 mb-2',

      tabs: {
        list: 'flex border-b border-gray-200',
        trigger:
          'flex-1 px-4 py-2 text-sm font-medium text-gray-600 border-b-2 border-transparent transition-colors duration-200 hover:text-gray-900 data-[state=active]:text-cyan-500 data-[state=active]:border-cyan-500',
        triggerActive: '',
      },

      dropdown: {
        content: 'min-w-[160px] bg-white rounded-lg shadow-lg border border-gray-300 p-1',
        item: 'flex items-center gap-2 px-2.5 py-2 text-sm text-gray-900 rounded cursor-pointer transition-all duration-300',
        itemHover: 'hover:bg-gray-100',
        separator: 'h-px bg-gray-200 my-1',
      },

      listItem: 'p-3 border border-gray-300 transition-colors cursor-pointer hover:border-gray-400',
      listItemActive: 'bg-cyan-500/10 border border-cyan-500/30',
      listItemHover: 'hover:bg-gray-50',

      groupContainer:
        'border rounded-lg overflow-hidden transition-all duration-300 border-gray-300 bg-white',
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

      resizeHandle: 'bg-border-subtle',
      resizeHandleHover: 'hover:bg-pink-500',

      wallet: {
        headerBg: 'bg-white/60',
        headerBorder: 'border-gray-200/50',
        titleGradient: 'from-cyan-600 via-teal-500 to-cyan-600',
        titleIconBg: 'bg-gradient-to-r from-cyan-500 via-teal-400 to-cyan-600',
        buttonPrimaryGradient: 'from-cyan-500 via-teal-400 to-cyan-600',
        buttonPrimaryShadow: 'shadow-cyan-500/20 hover:shadow-cyan-500/30',
        buttonSecondaryBg: 'bg-gray-100/80',
        buttonSecondaryBorder: 'border-gray-200/50',
        buttonSecondaryHover: 'hover:bg-gray-200/80',
        tabActiveBg: 'bg-cyan-500/10',
        tabActiveBorder: 'border-cyan-500/30',
        tabActiveText: 'text-cyan-600',
        tabInactiveText: 'text-gray-500',
        tabHover: 'hover:bg-gray-100/60',
        groupCardBg: 'bg-white/60',
        groupCardBorder: 'border-gray-200/30',
        groupCardHover: 'hover:border-gray-300/50',
        groupHeaderBg: 'bg-gray-50/50',
        walletCardBg: 'bg-white/40',
        walletCardBorder: 'border-gray-200/30',
        walletCardActiveBg: 'bg-cyan-50/80',
        walletCardActiveBorder: 'border-cyan-400/40',
        walletCardActiveGlow: 'shadow-cyan-400/10',
        walletCardHover: 'hover:bg-gray-50/60',
        accentLine: 'bg-gradient-to-b from-cyan-500 to-teal-400',
        dragHandleColor: 'text-gray-500',
        deleteText: 'text-red-500',
        deleteHover: 'hover:bg-red-50/80',
      },

      walletDetail: {
        headerBg: 'bg-white/60',
        headerBorder: 'border-gray-200/50',
        titleGradient: 'from-cyan-600 via-teal-500 to-cyan-600',
        walletIconBg: 'bg-gradient-to-r from-cyan-500 via-teal-400 to-cyan-600',
        portfolioBg: 'bg-gradient-to-br from-white/80 to-gray-50/80',
        portfolioBorder: 'border-gray-200/50',
        portfolioGlow: '',
        valueGradient: 'from-gray-900 to-gray-700',
        sendGradient: 'from-cyan-500 via-teal-400 to-cyan-600',
        sendShadow: 'shadow-cyan-500/20 hover:shadow-cyan-500/30',
        receiveGradient: 'from-gray-100 to-gray-200',
        receiveBorder: 'border-gray-300/50',
        receiveText: 'text-gray-700',
        tabActiveBg: 'bg-cyan-500/10',
        tabActiveBorder: 'border-cyan-500/30',
        tabActiveText: 'text-cyan-600',
        tabInactiveText: 'text-gray-500',
        tabHover: 'hover:bg-gray-100/60',
        badgeLiveBg: 'bg-green-500/10',
        badgeLiveText: 'text-green-600',
        badgeCachedBg: 'bg-yellow-500/10',
        badgeCachedText: 'text-amber-700',
        addressBg: 'bg-gray-100/50',
        iconButtonHover: 'hover:bg-gray-100',
      },

      tokenList: {
        cardBg: 'bg-white/70',
        cardBorder: 'border-gray-200/50',
        cardHover: 'hover:border-gray-300/60 hover:shadow-md',
        cardShadow: 'shadow-sm',
        iconBg: 'bg-gradient-to-br from-gray-100 to-gray-200',
        headerGradient: 'from-cyan-600 to-teal-500',
        badgeLiveBg: 'bg-green-500/10',
        badgeLiveText: 'text-green-600',
        badgeCachedBg: 'bg-yellow-500/10',
        badgeCachedText: 'text-amber-700',
        badgePartialBg: 'bg-blue-500/10',
        badgePartialText: 'text-blue-600',
      },

      networkSummary: {
        cardBg: 'bg-white/70',
        cardBorder: 'border-gray-200/50',
        cardHover: 'hover:border-gray-300/60 hover:shadow-md',
        cardShadow: 'shadow-sm',
        execCardBg: 'bg-gradient-to-br from-cyan-50/80 to-teal-50/80',
        execCardBorder: 'border-cyan-300/50',
        execCardGlow: 'shadow-cyan-200/30',
        execIconBg: 'bg-gradient-to-br from-cyan-500 to-teal-400',
        execBadgeBg: 'bg-cyan-500',
        iconBg: 'bg-gradient-to-br from-gray-100 to-gray-200',
        dividerColor: 'border-gray-200/50',
        progressBg: 'bg-gray-200/50',
        progressFill: 'bg-gradient-to-r from-cyan-500 to-teal-400',
        headerGradient: 'from-cyan-600 to-teal-500',
      },

      chatSidebar: {
        headerBg: 'bg-white/60',
        headerBorder: 'border-gray-200/50',
        newChatGradient: 'from-cyan-500 via-teal-400 to-cyan-600',
        newChatShadow: 'shadow-cyan-500/20 hover:shadow-cyan-500/30',
        activeCardBg: 'bg-cyan-50/80',
        activeCardBorder: 'border-cyan-400/40',
        activeCardGlow: 'shadow-cyan-400/10',
        hoverCardBg: 'hover:bg-gray-100/60',
        cardBorder: 'border-gray-200/30',
        iconActive: 'text-cyan-500',
        iconDefault: 'text-gray-500',
        inputBg: 'bg-white/80',
        inputBorder: 'border-gray-300/50',
        inputFocus: 'focus:border-cyan-400 focus:ring-cyan-400/20',
      },

      chatInterface: {
        headerBg: 'bg-white',
        headerBorder: 'border-gray-200/50',
        titleGradient: 'from-cyan-600 via-teal-500 to-cyan-600',
        settingsHover: 'hover:bg-gray-100/80',
        inputContainerBg: 'bg-white/70',
        inputBg: 'bg-white/90',
        inputSolidBg: 'bg-white',
        inputBorder: 'border-gray-200/60',
        inputFocusBorder: 'focus:border-cyan-400',
        inputFocusRing: 'focus:ring-cyan-400/20',
        sendGradient: 'from-cyan-500 via-teal-400 to-cyan-600',
        sendShadow: 'shadow-cyan-500/25 hover:shadow-cyan-500/40',
        sendDisabled: 'disabled:from-gray-300 disabled:to-gray-400 disabled:shadow-none',
        loadingDotBg: 'bg-cyan-400',
        emptyStateBg: 'bg-white/60',
        emptyStateBorder: 'border-gray-200/50',
        emptyStateIconBg: 'bg-gradient-to-br from-yellow-400 to-orange-400',
        configButtonGradient: 'from-cyan-500 to-teal-500',
      },

      chatMessage: {
        userBubbleBg: 'bg-gradient-to-br from-cyan-500 via-teal-400 to-cyan-600',
        userBubbleShadow: 'shadow-lg shadow-cyan-500/20',
        userBubbleBlur: 'backdrop-blur-sm',
        userTextColor: 'text-white',
        userTimestamp: 'text-white/70',
        userAvatarBg: 'bg-gradient-to-br from-slate-600 to-slate-700',
        userAvatarRing: 'ring-2 ring-slate-400/30',
        assistantBubbleBg: 'bg-white/80',
        assistantBubbleBorder: 'border border-gray-200/50',
        assistantBubbleShadow: 'shadow-lg shadow-gray-200/30',
        assistantBubbleBlur: 'backdrop-blur-sm',
        assistantIconBg: 'from-cyan-500 via-teal-400 to-cyan-600',
        assistantIconShadow: '',
        assistantTimestamp: 'text-gray-500',
        proseClass: 'prose-gray',
      },

      mobileNav: {
        headerBg: 'bg-white/80',
        headerBorder: 'border-gray-200/50',
        logoGradient: 'from-cyan-500 via-teal-400 to-cyan-600',
        titleGradient: 'from-cyan-600 via-teal-500 to-cyan-600',
        menuButtonBg: 'bg-gray-100/80',
        menuButtonHover: 'hover:bg-gray-200/80',
        overlayBg: 'bg-black/40',
        panelBg: 'bg-white/95',
        panelBorder: 'border-gray-200/50',
        navItemHover: 'hover:bg-gray-100',
        navItemActive: 'bg-cyan-50',
        navIconColor: 'text-gray-500',
        navIconActive: 'text-cyan-600',
        navTextColor: 'text-gray-700',
        bottomBarBg: 'bg-white/90',
        bottomBarBorder: 'border-gray-200/50',
        bottomItemHover: 'hover:bg-gray-100/80',
        bottomItemActive: '',
      },

      unlockScreen: {
        bg: 'from-slate-400 via-cyan-300 to-pink-300',
        meshGradient1: 'from-cyan-500/10',
        meshGradient2: 'from-pink-500/10',
        particleColor: '0, 140, 180',
        particleOpacity: 1.5,
        cardBg: 'bg-gradient-to-br from-white to-gray-50',
        cardBorder: 'border-gray-200/50',
        cardGlow: '',
        textPrimary: 'text-gray-900',
        textSecondary: 'text-gray-600',
        textMuted: 'text-gray-500',
        inputBg: 'bg-black/10',
        inputBorder: 'border-gray-500/30',
        inputFocusBorder: 'focus:border-cyan-500',
        accentGradient: 'from-cyan-400 via-cyan-500 to-pink-400',
        glowColor: 'cyan',
        buttonGradient: 'from-cyan-500 via-teal-400 to-pink-500',
        buttonShadow: 'shadow-cyan-500/25 hover:shadow-cyan-500/40',
      },
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
}

export function getTheme(themeName: string): ThemeConfig {
  return themes[themeName] || themes.light
}