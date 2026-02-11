/**
 * Code by Xipzer
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ThemeName } from '../hooks/useTheme'

export type NavItem = 'research' | 'portfolio' | 'watchlist' | 'markets' | 'yield'

const UI_DEFAULTS = {
  walletDrawerOpen: true,
  walletDrawerWidth: 320,
  theme: 'xipz' as ThemeName,
  chatSidebarOpen: true,
  activeNavItem: 'research' as NavItem,
  profilePicture: null as string | null,
  chatWallpaper: null as string | null,
  wallpaperOpacity: 0.1,
  lockscreenWallpaper: null as string | null,
  lockscreenOpacity: 0.2,
  syncWallpaper: false,
  syncOpacity: false,
  particlesLockscreen: true,
  particlesApp: true,
  settingsMaximized: false,
  walletDetailPanelSize: 50,
}

interface UIState {
  walletDrawerOpen: boolean
  walletDrawerWidth: number
  theme: ThemeName
  chatSidebarOpen: boolean
  activeNavItem: NavItem
  profilePicture: string | null
  chatWallpaper: string | null
  wallpaperOpacity: number
  lockscreenWallpaper: string | null
  lockscreenOpacity: number
  syncWallpaper: boolean
  syncOpacity: boolean
  particlesLockscreen: boolean
  particlesApp: boolean
  settingsMaximized: boolean
  walletDetailPanelSize: number

  toggleWalletDrawer: () => void
  setWalletDrawerWidth: (width: number) => void
  toggleTheme: () => void
  setTheme: (theme: ThemeName) => void
  toggleChatSidebar: () => void
  setActiveNavItem: (item: NavItem) => void
  setProfilePicture: (dataUrl: string | null) => void
  setChatWallpaper: (dataUrl: string | null) => void
  setWallpaperOpacity: (opacity: number) => void
  setLockscreenWallpaper: (dataUrl: string | null) => void
  setLockscreenOpacity: (opacity: number) => void
  setSyncWallpaper: (sync: boolean) => void
  setSyncOpacity: (sync: boolean) => void
  setParticlesLockscreen: (enabled: boolean) => void
  setParticlesApp: (enabled: boolean) => void
  setSettingsMaximized: (maximized: boolean) => void
  setWalletDetailPanelSize: (size: number) => void
  resetUI: () => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      ...UI_DEFAULTS,

      toggleWalletDrawer: () => {
        set((state) => ({ walletDrawerOpen: !state.walletDrawerOpen }))
      },

      setWalletDrawerWidth: (width) => {
        set({ walletDrawerWidth: width })
      },

      toggleTheme: () => {
        const themeOrder: ThemeName[] = ['light', 'dark', 'xipz', 'ogDark', 'ogLight']
        set((state) => {
          return { theme: themeOrder[(themeOrder.indexOf(state.theme) + 1) % themeOrder.length] }
        })
      },

      setTheme: (theme) => {
        set({ theme })
      },

      toggleChatSidebar: () => {
        set((state) => ({ chatSidebarOpen: !state.chatSidebarOpen }))
      },

      setActiveNavItem: (item) => {
        set({ activeNavItem: item })
      },

      setProfilePicture: (dataUrl) => {
        set({ profilePicture: dataUrl })
      },

      setChatWallpaper: (dataUrl) => {
        set({ chatWallpaper: dataUrl })
      },

      setWallpaperOpacity: (opacity) => {
        set({ wallpaperOpacity: opacity })
      },

      setLockscreenWallpaper: (dataUrl) => {
        set({ lockscreenWallpaper: dataUrl })
      },

      setLockscreenOpacity: (opacity) => {
        set({ lockscreenOpacity: opacity })
      },

      setSyncWallpaper: (sync) => {
        set({ syncWallpaper: sync })
      },

      setSyncOpacity: (sync) => {
        set({ syncOpacity: sync })
      },

      setParticlesLockscreen: (enabled) => {
        set({ particlesLockscreen: enabled })
      },

      setParticlesApp: (enabled) => {
        set({ particlesApp: enabled })
      },

      setSettingsMaximized: (maximized) => {
        set({ settingsMaximized: maximized })
      },

      setWalletDetailPanelSize: (size) => {
        set({ walletDetailPanelSize: size })
      },

      resetUI: () => {
        set({ ...UI_DEFAULTS })
      },
    }),
    {
      name: 'ui-store',
    },
  ),
)