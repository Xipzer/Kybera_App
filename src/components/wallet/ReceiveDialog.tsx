import { useEffect, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Check, Copy, Download, X } from 'lucide-react'
import { Wallet } from '../../types'
import { useTheme } from '../../hooks/useTheme'
import QRCode from 'qrcode'

interface ReceiveDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  wallet: Wallet
}

export function ReceiveDialog({ open, onOpenChange, wallet }: ReceiveDialogProps) {
  const { theme } = useTheme()
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (open && wallet.address) {
      QRCode.toDataURL(wallet.address, {
        width: 256,
        margin: 2,
        color: {
          dark: '#ffffff',
          light: '#0b0614', // primary-950
        },
      }).then(setQrCodeUrl)
    }
  }, [open, wallet.address])

  const copyAddress = () => {
    navigator.clipboard.writeText(wallet.address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className={`dialog-content ${theme.styles.dialogContainer} w-[450px]`}>
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${theme.styles.wallet.titleIconBg}`}>
                  <Download className="w-5 h-5 text-white" />
                </div>
                <div>
                  <Dialog.Title className={theme.styles.heading}>Receive Funds</Dialog.Title>
                  <p className="text-sm text-text-secondary">{wallet.name}</p>
                </div>
              </div>
              <Dialog.Close asChild>
                <button className={theme.styles.buttonIcon}>
                  <X className={`w-5 h-5 ${theme.styles.iconSecondary}`} />
                </button>
              </Dialog.Close>
            </div>

            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-text-secondary mb-4">
                  Share this address to receive {wallet.type} assets
                </p>

                {qrCodeUrl && (
                  <div className="inline-block p-4 bg-primary-950 rounded-lg mb-4">
                    <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48" />
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label className={`${theme.styles.label} mb-2 block`}>
                      {wallet.type} Address
                    </label>
                    <div className="p-3 bg-surface-elevated rounded-lg border border-border-subtle break-all">
                      <p className="text-sm font-mono text-text-primary">{wallet.address}</p>
                    </div>
                    <button
                      onClick={copyAddress}
                      className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 bg-surface-elevated border border-border-subtle rounded-lg font-medium text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4 text-green-400" />
                          <span className="text-green-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copy Address
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}