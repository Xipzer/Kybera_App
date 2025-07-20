import { useState } from 'react'
import { Plus, ChevronDown, Copy, Trash2, Download, Upload, Settings } from 'lucide-react'
import { useWalletStore } from '../../store/walletStore'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import * as Tabs from '@radix-ui/react-tabs'
import { NetworkSelector } from './NetworkSelector'
import { CreateWalletDialog } from './CreateWalletDialog'
import { ImportWalletDialog } from './ImportWalletDialog'
import { SettingsDialog } from '../chat/SettingsDialog'

export function WalletDrawer() {
  const { wallets, activeWalletId, activeNetwork, setActiveWallet, removeWallet } = useWalletStore()
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [showSettingsDialog, setShowSettingsDialog] = useState(false)

  const walletsByType = {
    EVM: wallets.filter((w) => w.type === 'EVM'),
    SVM: wallets.filter((w) => w.type === 'SVM'),
  }

  const compatibleWallets =
    activeNetwork.type === 'EVM' ? walletsByType.EVM : walletsByType.SVM

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address)
  }

  const handleExportWallet = (wallet: typeof wallets[0]) => {
    // TODO: Implement wallet export
    console.log('Export wallet:', wallet)
  }

  return (
    <div className="h-full bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Wallets</h2>
          <button
            onClick={() => setShowSettingsDialog(true)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            title="Settings"
          >
            <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        <NetworkSelector />

        <div className="mt-4 flex gap-2">
          <button
            onClick={() => setShowCreateDialog(true)}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create
          </button>
          <button
            onClick={() => setShowImportDialog(true)}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Import
          </button>
        </div>
      </div>

      <Tabs.Root defaultValue="compatible" className="flex-1 flex flex-col">
        <Tabs.List className="flex border-b border-gray-200 dark:border-gray-800">
          <Tabs.Trigger
            value="compatible"
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 dark:data-[state=active]:border-blue-400"
          >
            {activeNetwork.type} Wallets ({compatibleWallets.length})
          </Tabs.Trigger>
          <Tabs.Trigger
            value="all"
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 dark:data-[state=active]:border-blue-400"
          >
            All Wallets ({wallets.length})
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="compatible" className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {compatibleWallets.map((wallet) => (
              <WalletItem
                key={wallet.id}
                wallet={wallet}
                isActive={wallet.id === activeWalletId}
                onSelect={() => setActiveWallet(wallet.id)}
                onCopy={() => copyAddress(wallet.address)}
                onExport={() => handleExportWallet(wallet)}
                onDelete={() => removeWallet(wallet.id)}
              />
            ))}
          </div>
        </Tabs.Content>

        <Tabs.Content value="all" className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                EVM Wallets
              </h3>
              <div className="space-y-2">
                {walletsByType.EVM.map((wallet) => (
                  <WalletItem
                    key={wallet.id}
                    wallet={wallet}
                    isActive={wallet.id === activeWalletId}
                    onSelect={() => setActiveWallet(wallet.id)}
                    onCopy={() => copyAddress(wallet.address)}
                    onExport={() => handleExportWallet(wallet)}
                    onDelete={() => removeWallet(wallet.id)}
                  />
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                SVM Wallets
              </h3>
              <div className="space-y-2">
                {walletsByType.SVM.map((wallet) => (
                  <WalletItem
                    key={wallet.id}
                    wallet={wallet}
                    isActive={wallet.id === activeWalletId}
                    onSelect={() => setActiveWallet(wallet.id)}
                    onCopy={() => copyAddress(wallet.address)}
                    onExport={() => handleExportWallet(wallet)}
                    onDelete={() => removeWallet(wallet.id)}
                  />
                ))}
              </div>
            </div>
          </div>
        </Tabs.Content>
      </Tabs.Root>

      <CreateWalletDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} />
      <ImportWalletDialog open={showImportDialog} onOpenChange={setShowImportDialog} />
      <SettingsDialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog} />
    </div>
  )
}

interface WalletItemProps {
  wallet: any
  isActive: boolean
  onSelect: () => void
  onCopy: () => void
  onExport: () => void
  onDelete: () => void
}

function WalletItem({ wallet, isActive, onSelect, onCopy, onExport, onDelete }: WalletItemProps) {
  return (
    <div
      className={`p-3 rounded-lg border transition-all cursor-pointer ${
        isActive
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-gray-900 dark:text-gray-100">{wallet.name}</h4>
            {wallet.isImported && (
              <span className="text-xs text-gray-500 dark:text-gray-400">Imported</span>
            )}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
            {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
          </p>
        </div>

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="min-w-[160px] bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-800 p-1"
              sideOffset={5}
            >
              <DropdownMenu.Item
                onClick={(e) => {
                  e.stopPropagation()
                  onCopy()
                }}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer"
              >
                <Copy className="w-4 h-4" />
                Copy Address
              </DropdownMenu.Item>

              <DropdownMenu.Item
                onClick={(e) => {
                  e.stopPropagation()
                  onExport()
                }}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Export
              </DropdownMenu.Item>

              <DropdownMenu.Separator className="h-px bg-gray-200 dark:bg-gray-800 my-1" />

              <DropdownMenu.Item
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete()
                }}
                className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </div>
  )
}