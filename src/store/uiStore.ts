import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type ThemeType = 'light' | 'dark' | 'xipz' | 'ogDark' | 'ogLight'

interface UIState {
  walletDrawerOpen: boolean
  walletDrawerWidth: number
  theme: ThemeType
  chatSidebarOpen: boolean
  profilePicture: string | null
  chatWallpaper: string | null
  wallpaperOpacity: number
  lockscreenWallpaper: string | null
  lockscreenOpacity: number
  syncWallpaper: boolean
  syncOpacity: boolean

  // Actions
  toggleWalletDrawer: () => void
  setWalletDrawerWidth: (width: number) => void
  toggleTheme: () => void
  setTheme: (theme: ThemeType) => void
  toggleChatSidebar: () => void
  setProfilePicture: (dataUrl: string | null) => void
  setChatWallpaper: (dataUrl: string | null) => void
  setWallpaperOpacity: (opacity: number) => void
  setLockscreenWallpaper: (dataUrl: string | null) => void
  setLockscreenOpacity: (opacity: number) => void
  setSyncWallpaper: (sync: boolean) => void
  setSyncOpacity: (sync: boolean) => void
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

      toggleWalletDrawer: () => {
        set((state) => ({ walletDrawerOpen: !state.walletDrawerOpen }))
      },

      setWalletDrawerWidth: (width) => {
        set({ walletDrawerWidth: width })
      },

      toggleTheme: () => {
        const themeOrder: ThemeType[] = ['light', 'dark', 'xipz', 'ogDark', 'ogLight']
        set((state) => {
          const currentIndex = themeOrder.indexOf(state.theme)
          const nextIndex = (currentIndex + 1) % themeOrder.length
          return { theme: themeOrder[nextIndex] }
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
    }),
    {
      name: 'ui-store',
    },
  ),
)