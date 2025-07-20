/**
 * Code by Xipzer
 */

import { useEffect, useState } from 'react'
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard'
import { Check, Copy, Download, Share2 } from 'lucide-react'
import { Wallet } from '../../types'
import { useTheme } from '../../hooks/useTheme'
import QRCode from 'qrcode'
import {
  ModernDialog,
  ModernDialogHeader,
  ModernDialogSection,
  ModernDialogActions,
  ModernButton,
} from '../ModernDialog'

interface ReceiveDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  wallet: Wallet
}

export function ReceiveDialog({ open, onOpenChange, wallet }: ReceiveDialogProps) {
  const { theme, themeName, isDark } = useTheme()
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const { copied, copy: copyToClipboard } = useCopyToClipboard()

  useEffect(() => {
    if (open && wallet.address) {
      QRCode.toDataURL(wallet.address, {
        width: 256,
        margin: 2,
        color: {
          dark: isDark ? '#ffffff' : '#000000',
          light: isDark ? '#0b0614' : '#ffffff',
        },
      }).then(setQrCodeUrl)
    }
  }, [open, wallet.address, themeName])

  const copyAddress = () => copyToClipboard(wallet.address)

  const shareAddress = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${wallet.name} Address`,
          text: wallet.address,
        })
      } catch (err) {
        copyAddress()
      }
    } else {
      copyAddress()
    }
  }

  return (
    <ModernDialog open={open} onOpenChange={onOpenChange} width="md">
      <ModernDialogHeader
        icon={<Download className="w-5 h-5" />}
        title="Receive"
        subtitle={wallet.name}
        onClose={() => onOpenChange(false)}
      />

      <ModernDialogSection className="pb-4">
        <div className="text-center space-y-4">
          <p className={`text-sm ${theme.styles.textSecondary}`}>
            Share this address to receive{' '}
            {wallet.type === 'EVM' ? 'Ethereum & ERC-20' : 'Solana & SPL'} tokens
          </p>

          {qrCodeUrl && (
            <div className="flex justify-center">
              <div className="p-4 bg-white/5 border border-white/10 rounded-2xl inline-block">
                <img
                  src={qrCodeUrl}
                  alt="Wallet QR Code"
                  className="w-48 h-48 sm:w-56 sm:h-56 rounded-lg"
                />
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className={`text-xs font-medium ${theme.styles.textTertiary}`}>
                {wallet.type} Address
              </label>
              <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                <p
                  className={`text-sm font-mono ${theme.styles.textPrimary} break-all leading-relaxed`}
                >
                  {wallet.address}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={copyAddress}
                className={`flex-1 flex items-center justify-center gap-2 py-3 bg-white/5 border border-white/10 rounded-xl font-medium text-sm transition-all hover:bg-white/10 hover:border-white/20 ${
                  copied
                    ? 'text-green-400 border-green-500/30 bg-green-500/10'
                    : theme.styles.textSecondary
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy
                  </>
                )}
              </button>

              {typeof navigator.share === 'function' && (
                <button
                  onClick={shareAddress}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 bg-white/5 border border-white/10 rounded-xl font-medium text-sm ${theme.styles.textSecondary} transition-all hover:bg-white/10 hover:border-white/20`}
                >
                  <Share2 className="w-4 h-4" />
                  Share
                </button>
              )}
            </div>
          </div>

          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
            <p className="text-xs text-amber-400">
              Only send {wallet.type === 'EVM' ? 'EVM-compatible' : 'Solana'} tokens to this
              address. Sending other tokens may result in permanent loss.
            </p>
          </div>
        </div>
      </ModernDialogSection>

      <ModernDialogActions>
        <ModernButton variant="primary" fullWidth onClick={() => onOpenChange(false)}>
          Done
        </ModernButton>
      </ModernDialogActions>
    </ModernDialog>
  )
}