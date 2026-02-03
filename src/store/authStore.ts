import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { hashPassword, verifyPassword } from '../utils/auth'
import { db } from '../services/storage/database'
import { reencryptWalletData } from '../utils/dbUtils'

interface AuthState {
  passwordHash: string | null
  passwordSalt: string | null
  isInitialized: boolean
  encryptionSalt: string | null // Separate salt for encryption key derivation
  
  // Actions
  initializePassword: (password: string) => Promise<void>
  verifyPassword: (password: string) => Promise<boolean>
  changePassword: (currentPassword: string, newPassword: string) => Promise<boolean>
}


export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      passwordHash: null,
      passwordSalt: null,
      isInitialized: false,
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
          isInitialized: true
        })
      },
      
      verifyPassword: async (password: string) => {
        const state = get()
        
        if (!state.passwordHash || !state.passwordSalt) {
          return false
        }
        
        const isValid = await verifyPassword(password, state.passwordHash, state.passwordSalt)
        
        return isValid
      },
      
      changePassword: async (currentPassword: string, newPassword: string) => {
        const state = get()
        
        // Verify current password
        if (!await state.verifyPassword(currentPassword)) {
          return false
        }
        
        try {
          // Re-encrypt all wallet data with the new password
          await reencryptWalletData(currentPassword, newPassword)
          
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
          
          return true
        } catch (error) {
          console.error('Failed to change password:', error)
          return false
        }
      },
      
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        passwordHash: state.passwordHash,
        passwordSalt: state.passwordSalt,
        encryptionSalt: state.encryptionSalt,
        isInitialized: state.isInitialized
      })
    }
  )
)