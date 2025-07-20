import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UIState {
  walletDrawerOpen: boolean
  walletDrawerWidth: number
  theme: 'light' | 'dark'
  chatSidebarOpen: boolean

  // Actions
  toggleWalletDrawer: () => void
  setWalletDrawerWidth: (width: number) => void
  toggleTheme: () => void
  setTheme: (theme: 'light' | 'dark') => void
  toggleChatSidebar: () => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      walletDrawerOpen: true,
      walletDrawerWidth: 320,
      theme: 'dark',
      chatSidebarOpen: true,

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
    }),
    {
      name: 'ui-store',
    },
  ),
)