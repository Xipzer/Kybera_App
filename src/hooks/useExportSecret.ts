/**
 * Code by Xipzer
 */

import { useState, useCallback } from 'react'
import { useCopyToClipboard } from './useCopyToClipboard'

interface UseExportSecretOptions {
  exportFn: (entityId: string, password: string) => Promise<string>
  onClose: () => void
}

export function useExportSecret({ exportFn, onClose }: UseExportSecretOptions) {
  const [password, setPassword] = useState('')
  const [secret, setSecret] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showSecret, setShowSecret] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { copied, copy: copyToClipboard } = useCopyToClipboard()

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
    setPassword('')
    setSecret('')
    setError('')
    setShowPassword(false)
    setShowSecret(false)
    onClose()
  }, [onClose])

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