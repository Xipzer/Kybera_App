import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UIState {
  walletDrawerOpen: boolean
  walletDrawerWidth: number
  theme: 'light' | 'dark'
  chatSidebarOpen: boolean
  profilePicture: string | null
  chatWallpaper: string | null
  wallpaperOpacity: number

  // Actions
  toggleWalletDrawer: () => void
  setWalletDrawerWidth: (width: number) => void
  toggleTheme: () => void
  setTheme: (theme: 'light' | 'dark') => void
  toggleChatSidebar: () => void
  setProfilePicture: (dataUrl: string | null) => void
  setChatWallpaper: (dataUrl: string | null) => void
  setWallpaperOpacity: (opacity: number) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      walletDrawerOpen: true,
      walletDrawerWidth: 320,
      theme: 'dark',
      chatSidebarOpen: true,
      profilePicture: null,
      chatWallpaper: null,
      wallpaperOpacity: 0.1,

      toggleWalletDrawer: () => {
        set((state) => ({ walletDrawerOpen: !state.walletDrawerOpen }))
      },

      setWalletDrawerWidth: (width) => {
        set({ walletDrawerWidth: width })
      },

      toggleTheme: () => {
        set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' }))
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
    }),
    {
      name: 'ui-store',
    },
  ),
)