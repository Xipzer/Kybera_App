import { useState, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, Copy } from 'lucide-react'
import { Wallet } from '../../types'
import QRCode from 'qrcode'
import { useTheme } from '../../hooks/useTheme'

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
        <Dialog.Content className="dialog-content bg-surface-base rounded-lg shadow-2xl border border-border-subtle w-[450px]">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <Dialog.Title className="text-xl font-semibold text-text-primary">
                Receive Funds
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="p-1 rounded hover:bg-surface-hover transition-colors">
                  <X className="w-5 h-5 text-text-secondary" />
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
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Wallet Name
                    </label>
                    <div className="p-3 bg-surface-elevated rounded-lg">
                      <p className="text-sm font-medium text-text-primary">{wallet.name}</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      {wallet.type} Address
                    </label>
                    <div className="relative">
                      <div className="p-3 pr-12 bg-surface-elevated rounded-lg break-all">
                        <p className="text-sm font-mono text-text-primary">{wallet.address}</p>
                      </div>
                      <button
                        onClick={copyAddress}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded hover:bg-surface-hover transition-colors"
                        title="Copy address"
                      >
                        <Copy className="w-4 h-4 text-text-secondary" />
                      </button>
                    </div>
                    {copied && (
                      <p className="text-xs text-green-500 mt-1">Copied to clipboard!</p>
                    )}
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