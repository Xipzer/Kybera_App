/**
 * Code by Xipzer
 */

import { useState, useCallback, useEffect } from 'react'
import { useCopyToClipboard } from './useCopyToClipboard'

interface UseExportSecretOptions {
  exportFn: (entityId: string, password: string) => Promise<string>
  onClose: () => void
  open?: boolean
}

export function useExportSecret({ exportFn, onClose, open }: UseExportSecretOptions) {
  const [password, setPassword] = useState('')
  const [secret, setSecret] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showSecret, setShowSecret] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { copied, copy: copyToClipboard } = useCopyToClipboard()

  const clearState = useCallback(() => {
    setPassword('')
    setSecret('')
    setError('')
    setShowPassword(false)
    setShowSecret(false)
  }, [])

  // Wipe the decrypted secret + password from state whenever the dialog is not open,
  // covering Escape/overlay-click dismissal that bypasses handleClose.
  useEffect(() => {
    if (open === false) clearState()
  }, [open, clearState])

  const handleExport = useCallback(
    async (e: React.FormEvent, entityId: string) => {
      e.preventDefault()
      if (!password || !entityId) return

      setIsLoading(true)
      setError('')

      try {
        setSecret(await exportFn(entityId, password))
      } catch (err) {
        console.error('Failed to export secret:', err)
        setError('Invalid password')
      } finally {
        setIsLoading(false)
      }
    },
    [password, exportFn],
  )

  const handleClose = useCallback(() => {
    clearState()
    onClose()
  }, [clearState, onClose])

  const copySecret = useCallback(() => copyToClipboard(secret), [copyToClipboard, secret])

  return {
    password,
    setPassword,
    secret,
    showPassword,
    setShowPassword,
    showSecret,
    setShowSecret,
    error,
    isLoading,
    copied,
    handleExport,
    handleClose,
    copySecret,
  }
}