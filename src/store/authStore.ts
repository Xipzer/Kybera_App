import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { hashPassword, verifyPassword } from '../utils/auth'
import { db } from '../services/storage/database'

interface AuthState {
  passwordHash: string | null
  passwordSalt: string | null
  isInitialized: boolean
  failedAttempts: number
  lastFailedAttempt: number | null
  encryptionSalt: string | null // Separate salt for encryption key derivation
  
  // Actions
  initializePassword: (password: string) => Promise<void>
  verifyPassword: (password: string) => Promise<boolean>
  changePassword: (currentPassword: string, newPassword: string) => Promise<boolean>
  incrementFailedAttempts: () => void
  resetFailedAttempts: () => void
  isLockedOut: () => boolean
}

const MAX_FAILED_ATTEMPTS = 5
const LOCKOUT_DURATION = 5 * 60 * 1000 // 5 minutes

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      passwordHash: null,
      passwordSalt: null,
      isInitialized: false,
      failedAttempts: 0,
      lastFailedAttempt: null,
      encryptionSalt: null,
      
      initializePassword: async (password: string) => {
        const { hash, salt } = await hashPassword(password)
        const encryptionSalt = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('hex')
        
        // Store auth data
        await db.auth.put({
          id: 'primary',
          passwordHash: hash,
          passwordSalt: salt,
          encryptionSalt,
          createdAt: Date.now()
        })
        
        set({
          passwordHash: hash,
          passwordSalt: salt,
          encryptionSalt,
          isInitialized: true,
          failedAttempts: 0,
          lastFailedAttempt: null
        })
      },
      
      verifyPassword: async (password: string) => {
        const state = get()
        
        // Check if locked out
        if (state.isLockedOut()) {
          return false
        }
        
        if (!state.passwordHash || !state.passwordSalt) {
          return false
        }
        
        const isValid = await verifyPassword(password, state.passwordHash, state.passwordSalt)
        
        if (isValid) {
          state.resetFailedAttempts()
        } else {
          state.incrementFailedAttempts()
        }
        
        return isValid
      },
      
      changePassword: async (currentPassword: string, newPassword: string) => {
        const state = get()
        
        // Verify current password
        if (!await state.verifyPassword(currentPassword)) {
          return false
        }
        
        // Hash new password
        const { hash, salt } = await hashPassword(newPassword)
        
        // Update auth data
        await db.auth.update('primary', {
          passwordHash: hash,
          passwordSalt: salt,
          updatedAt: Date.now()
        })
        
        set({
          passwordHash: hash,
          passwordSalt: salt
        })
        
        // Note: In a real implementation, you would need to re-encrypt all wallet data
        // with a new encryption key derived from the new password
        
        return true
      },
      
      incrementFailedAttempts: () => {
        set((state) => ({
          failedAttempts: state.failedAttempts + 1,
          lastFailedAttempt: Date.now()
        }))
      },
      
      resetFailedAttempts: () => {
        set({
          failedAttempts: 0,
          lastFailedAttempt: null
        })
      },
      
      isLockedOut: () => {
        const state = get()
        if (state.failedAttempts < MAX_FAILED_ATTEMPTS) {
          return false
        }
        
        if (!state.lastFailedAttempt) {
          return false
        }
        
        const timeSinceLastAttempt = Date.now() - state.lastFailedAttempt
        return timeSinceLastAttempt < LOCKOUT_DURATION
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        passwordHash: state.passwordHash,
        passwordSalt: state.passwordSalt,
        encryptionSalt: state.encryptionSalt,
        isInitialized: state.isInitialized,
        failedAttempts: state.failedAttempts,
        lastFailedAttempt: state.lastFailedAttempt
      })
    }
  )
)