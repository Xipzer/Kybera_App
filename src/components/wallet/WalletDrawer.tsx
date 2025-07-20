import { useState } from 'react'
import { Plus, ChevronDown, Copy, Trash2, Download, Upload, Settings, Wallet as WalletIcon, Edit2, Users } from 'lucide-react'
import { useWalletStore } from '../../store/walletStore'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import * as Tabs from '@radix-ui/react-tabs'
import { NetworkSelector } from './NetworkSelector'
// import { CreateWalletDialog } from './CreateWalletDialog' - Deprecated in favor of groups
import { ImportWalletDialog } from './ImportWalletDialog'
import { SettingsDialog } from '../chat/SettingsDialog'
import { EmptyState } from '../common/EmptyState'
import { RenameWalletDialog } from './RenameWalletDialog'
import { CreateGroupDialog } from './CreateGroupDialog'
import { AddWalletToGroupDialog } from './AddWalletToGroupDialog'
import { ExportGroupDialog } from './ExportGroupDialog'
import { ImportGroupDialog } from './ImportGroupDialog'

export function WalletDrawer() {
  const { wallets, walletGroups, activeWalletId, activeNetwork, setActiveWallet, removeWallet } = useWalletStore()
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [showSettingsDialog, setShowSettingsDialog] = useState(false)
  const [renameWallet, setRenameWallet] = useState<typeof wallets[0] | null>(null)
  const [showCreateGroupDialog, setShowCreateGroupDialog] = useState(false)
  const [showAddToGroupDialog, setShowAddToGroupDialog] = useState(false)
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>()
  const [exportGroup, setExportGroup] = useState<any | null>(null)
  const [showImportGroupDialog, setShowImportGroupDialog] = useState(false)

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

        <div className="mt-4 space-y-2">
          <div className="flex gap-2">
            <button
              onClick={() => setShowCreateGroupDialog(true)}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Users className="w-4 h-4" />
              New Group
            </button>
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <Upload className="w-4 h-4" />
                  Import
                  <ChevronDown className="w-3 h-3" />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  className="min-w-[160px] bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-800 p-1"
                  sideOffset={5}
                >
                  <DropdownMenu.Item
                    onClick={() => setShowImportGroupDialog(true)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer"
                  >
                    <Users className="w-4 h-4" />
                    Import Group (Seed Phrase)
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    onClick={() => setShowImportDialog(true)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer"
                  >
                    <WalletIcon className="w-4 h-4" />
                    Import Single Wallet
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        </div>
      </div>

      <Tabs.Root defaultValue="groups" className="flex-1 flex flex-col">
        <Tabs.List className="flex border-b border-gray-200 dark:border-gray-800">
          <Tabs.Trigger
            value="groups"
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 dark:data-[state=active]:border-blue-400"
          >
            Groups ({walletGroups.length})
          </Tabs.Trigger>
          <Tabs.Trigger
            value="compatible"
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 dark:data-[state=active]:border-blue-400"
          >
            {activeNetwork.type} ({compatibleWallets.length})
          </Tabs.Trigger>
          <Tabs.Trigger
            value="all"
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 dark:data-[state=active]:border-blue-400"
          >
            All ({wallets.length})
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="groups" className="flex-1 overflow-y-auto p-4">
          {walletGroups.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No wallet groups yet"
              description="Create a group to manage multiple wallets with one recovery phrase"
              action={{
                label: "Create Group",
                onClick: () => setShowCreateGroupDialog(true)
              }}
              className="h-full"
            />
          ) : (
            <div className="space-y-3">
              {walletGroups.filter(g => g.id !== 'default-imported').map((group) => (
                <WalletGroupItem
                  key={group.id}
                  group={group}
                  wallets={wallets.filter(w => w.groupId === group.id)}
                  onAddWallet={() => {
                    setSelectedGroupId(group.id)
                    setShowAddToGroupDialog(true)
                  }}
                  onSelectWallet={(walletId) => setActiveWallet(walletId)}
                  activeWalletId={activeWalletId}
                  onExportGroup={(group) => setExportGroup(group)}
                />
              ))}
              
              {/* Show imported wallets group if it has wallets */}
              {wallets.some(w => w.groupId === 'default-imported') && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                    Imported Wallets
                  </h3>
                  <div className="space-y-2">
                    {wallets.filter(w => w.groupId === 'default-imported').map((wallet) => (
                      <WalletItem
                        key={wallet.id}
                        wallet={wallet}
                        isActive={wallet.id === activeWalletId}
                        onSelect={() => setActiveWallet(wallet.id)}
                        onCopy={() => copyAddress(wallet.address)}
                        onRename={() => setRenameWallet(wallet)}
                        onExport={() => handleExportWallet(wallet)}
                        onDelete={() => removeWallet(wallet.id)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Tabs.Content>

        <Tabs.Content value="compatible" className="flex-1 overflow-y-auto p-4">
          {compatibleWallets.length === 0 ? (
            <EmptyState
              icon={WalletIcon}
              title="No wallets yet"
              description={`Create or import a ${activeNetwork.type} wallet to get started`}
              action={{
                label: "Create Group",
                onClick: () => setShowCreateGroupDialog(true)
              }}
              className="h-full"
            />
          ) : (
            <div className="space-y-2">
              {compatibleWallets.map((wallet) => (
                <WalletItem
                  key={wallet.id}
                  wallet={wallet}
                  isActive={wallet.id === activeWalletId}
                  onSelect={() => setActiveWallet(wallet.id)}
                  onCopy={() => copyAddress(wallet.address)}
                  onRename={() => setRenameWallet(wallet)}
                  onExport={() => handleExportWallet(wallet)}
                  onDelete={() => removeWallet(wallet.id)}
                />
              ))}
            </div>
          )}
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
                    onRename={() => setRenameWallet(wallet)}
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
                    onRename={() => setRenameWallet(wallet)}
                    onExport={() => handleExportWallet(wallet)}
                    onDelete={() => removeWallet(wallet.id)}
                  />
                ))}
              </div>
            </div>
          </div>
        </Tabs.Content>
      </Tabs.Root>

      <ImportWalletDialog open={showImportDialog} onOpenChange={setShowImportDialog} />
      <SettingsDialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog} />
      <RenameWalletDialog 
        open={renameWallet !== null} 
        onOpenChange={(open) => !open && setRenameWallet(null)}
        wallet={renameWallet}
      />
      <CreateGroupDialog open={showCreateGroupDialog} onOpenChange={setShowCreateGroupDialog} />
      <AddWalletToGroupDialog 
        open={showAddToGroupDialog} 
        onOpenChange={setShowAddToGroupDialog}
        groupId={selectedGroupId}
      />
      <ExportGroupDialog
        open={exportGroup !== null}
        onOpenChange={(open) => !open && setExportGroup(null)}
        group={exportGroup}
      />
      <ImportGroupDialog
        open={showImportGroupDialog}
        onOpenChange={setShowImportGroupDialog}
      />
    </div>
  )
}

interface WalletItemProps {
  wallet: any
  isActive: boolean
  onSelect: () => void
  onCopy: () => void
  onRename: () => void
  onExport: () => void
  onDelete: () => void
}

function WalletItem({ wallet, isActive, onSelect, onCopy, onRename, onExport, onDelete }: WalletItemProps) {
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
                  onRename()
                }}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer"
              >
                <Edit2 className="w-4 h-4" />
                Rename
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

interface WalletGroupItemProps {
  group: any
  wallets: any[]
  onAddWallet: () => void
  onSelectWallet: (walletId: string) => void
  activeWalletId: string | null
  onExportGroup: (group: any) => void
}

function WalletGroupItem({ group, wallets, onAddWallet, onSelectWallet, activeWalletId, onExportGroup }: WalletGroupItemProps) {
  const { removeWalletGroup } = useWalletStore()
  const [isExpanded, setIsExpanded] = useState(true)
  
  return (
    <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
      <div className="p-3 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 flex-1 text-left"
          >
            <ChevronDown className={`w-4 h-4 text-gray-600 dark:text-gray-400 transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
            <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100">{group.name}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {group.type} • {wallets.length} wallet{wallets.length !== 1 ? 's' : ''}
              </p>
            </div>
          </button>
          
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
                <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>
            </DropdownMenu.Trigger>
            
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className="min-w-[160px] bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-800 p-1"
                sideOffset={5}
              >
                <DropdownMenu.Item
                  onClick={onAddWallet}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Add Wallet
                </DropdownMenu.Item>
                
                <DropdownMenu.Item
                  onClick={() => onExportGroup(group)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Export Seed Phrase
                </DropdownMenu.Item>
                
                <DropdownMenu.Separator className="h-px bg-gray-200 dark:bg-gray-800 my-1" />
                
                <DropdownMenu.Item
                  onClick={() => {
                    if (confirm(`Delete group "${group.name}" and all its wallets?`)) {
                      removeWalletGroup(group.id)
                    }
                  }}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Group
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </div>
      
      {isExpanded && (
        <div className="p-2 space-y-1">
          {wallets.length === 0 ? (
            <div className="p-4 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                No wallets in this group yet
              </p>
              <button
                onClick={onAddWallet}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Add a wallet
              </button>
            </div>
          ) : (
            wallets.map((wallet) => (
              <div
                key={wallet.id}
                onClick={() => onSelectWallet(wallet.id)}
                className={`p-2 rounded cursor-pointer transition-colors ${
                  wallet.id === activeWalletId
                    ? 'bg-blue-50 dark:bg-blue-900/20'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {wallet.name}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                      {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                    </p>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {wallet.type}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}