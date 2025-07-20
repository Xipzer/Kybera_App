/**
 * Code by Xipzer
 */

import { create } from 'zustand'
import { hashPassword, verifyPassword } from '../utils/auth'
import { db } from '../services/database'
import { reencryptWalletData } from '../utils/dbUtils'

interface AuthState {
  passwordHash: string | null
  passwordSalt: string | null
  isInitialized: boolean
  encryptionSalt: string | null
  isLoading: boolean

  loadAuth: () => Promise<void>
  initializePassword: (password: string) => Promise<void>
  verifyPassword: (password: string) => Promise<boolean>
  changePassword: (currentPassword: string, newPassword: string) => Promise<boolean>
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  passwordHash: null,
  passwordSalt: null,
  isInitialized: false,
  encryptionSalt: null,
  isLoading: true,

  loadAuth: async () => {
    try {
      const auth = await db.auth.get('primary')
      if (auth) {
        set({
          passwordHash: auth.passwordHash,
          passwordSalt: auth.passwordSalt,
          encryptionSalt: auth.encryptionSalt,
          isInitialized: true,
          isLoading: false,
        })
      } else {
        set({ isLoading: false })
      }
    } catch {
      set({ isLoading: false })
    }
  },

  initializePassword: async (password: string) => {
    const { hash, salt } = await hashPassword(password)
    const encryptionSalt = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('hex')

    await db.auth.put({
      id: 'primary',
      passwordHash: hash,
      passwordSalt: salt,
      encryptionSalt,
      createdAt: Date.now(),
    })

    set({
      passwordHash: hash,
      passwordSalt: salt,
      encryptionSalt,
      isInitialized: true,
    })
  },

  verifyPassword: async (password: string) => {
    const state = get()

    if (!state.passwordHash || !state.passwordSalt) {
      return false
    }

    return await verifyPassword(password, state.passwordHash, state.passwordSalt)
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    const state = get()

    if (!(await state.verifyPassword(currentPassword))) {
      return false
    }

    try {
      await reencryptWalletData(currentPassword, newPassword)

      const { hash, salt } = await hashPassword(newPassword)

      await db.auth.update('primary', {
        passwordHash: hash,
        passwordSalt: salt,
        updatedAt: Date.now(),
      })

      set({
        passwordHash: hash,
        passwordSalt: salt,
      })

      return true
    } catch {
      return false
    }
  },
}))
