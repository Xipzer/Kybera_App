/**
 * Code by Xipzer
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ThemeName } from '../hooks/useTheme'

interface UIState {
  walletDrawerOpen: boolean
  walletDrawerWidth: number
  theme: ThemeName
  chatSidebarOpen: boolean
  profilePicture: string | null
  chatWallpaper: string | null
  wallpaperOpacity: number
  lockscreenWallpaper: string | null
  lockscreenOpacity: number
  syncWallpaper: boolean
  syncOpacity: boolean
  particlesLockscreen: boolean
  particlesApp: boolean

  toggleWalletDrawer: () => void
  setWalletDrawerWidth: (width: number) => void
  toggleTheme: () => void
  setTheme: (theme: ThemeName) => void
  toggleChatSidebar: () => void
  setProfilePicture: (dataUrl: string | null) => void
  setChatWallpaper: (dataUrl: string | null) => void
  setWallpaperOpacity: (opacity: number) => void
  setLockscreenWallpaper: (dataUrl: string | null) => void
  setLockscreenOpacity: (opacity: number) => void
  setSyncWallpaper: (sync: boolean) => void
  setSyncOpacity: (sync: boolean) => void
  setParticlesLockscreen: (enabled: boolean) => void
  setParticlesApp: (enabled: boolean) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      walletDrawerOpen: true,
      walletDrawerWidth: 320,
      theme: 'xipz',
      chatSidebarOpen: true,
      profilePicture: null,
      chatWallpaper: null,
      wallpaperOpacity: 0.1,
      lockscreenWallpaper: null,
      lockscreenOpacity: 0.2,
      syncWallpaper: false,
      syncOpacity: false,
      particlesLockscreen: true,
      particlesApp: true,

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
    }),
    {
      name: 'ui-store',
    },
  ),
)