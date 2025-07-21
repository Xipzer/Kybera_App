import { useState, useMemo, useEffect } from 'react'
import {
  Plus,
  ChevronDown,
  Copy,
  Trash2,
  Download,
  Upload,
  Wallet as WalletIcon,
  Edit2,
  Users,
  MoreVertical,
} from 'lucide-react'
import { useWalletStore } from '../../store/walletStore'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import * as Tabs from '@radix-ui/react-tabs'
import { BetterScrollArea } from '../common/BetterScrollArea'
import { NetworkSelector } from './NetworkSelector'
// import { CreateWalletDialog } from './CreateWalletDialog' - Deprecated in favor of groups
import { ImportWalletDialog } from './ImportWalletDialog'
import { EmptyState } from '../common/EmptyState'
import { RenameWalletDialog } from './RenameWalletDialog'
import { CreateGroupDialog } from './CreateGroupDialog'
import { AddWalletToGroupDialog } from './AddWalletToGroupDialog'
import { ExportGroupDialog } from './ExportGroupDialog'
import { ImportGroupDialog } from './ImportGroupDialog'
import { WalletDetailView } from './WalletDetailView'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'

export function WalletDrawer() {
  const { wallets, walletGroups, activeWalletId, setActiveWallet, removeWallet } =
    useWalletStore()
  
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [renameWallet, setRenameWallet] = useState<(typeof wallets)[0] | null>(null)
  const [showCreateGroupDialog, setShowCreateGroupDialog] = useState(false)
  const [showAddToGroupDialog, setShowAddToGroupDialog] = useState(false)
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>()
  const [exportGroup, setExportGroup] = useState<any | null>(null)
  const [showImportGroupDialog, setShowImportGroupDialog] = useState(false)
  const [theme, setTheme] = useState(() => {
    if (document.documentElement.classList.contains('xipz')) return 'xipz'
    if (document.documentElement.classList.contains('dark')) return 'dark'
    return 'light'
  })

  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (document.documentElement.classList.contains('xipz')) {
        setTheme('xipz')
      } else if (document.documentElement.classList.contains('dark')) {
        setTheme('dark')
      } else {
        setTheme('light')
      }
    })
    
    observer.observe(document.documentElement, { 
      attributes: true, 
      attributeFilter: ['class'] 
    })
    
    return () => observer.disconnect()
  }, [])

  // Memoize filtered data to avoid recalculation on every render
  const actualGroups = useMemo(
    () => walletGroups.filter(g => g.id !== 'default-imported'),
    [walletGroups]
  )
  
  const walletsByType = useMemo(
    () => ({
      EVM: wallets.filter((w) => w.type === 'EVM'),
      SVM: wallets.filter((w) => w.type === 'SVM'),
    }),
    [wallets]
  )

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address)
  }

  const handleExportWallet = (wallet: (typeof wallets)[0]) => {
    // TODO: Implement wallet export
    console.log('Export wallet:', wallet)
  }

  return (
    <div className={`h-full border-l transition-all duration-300 ${
      theme === 'xipz'
        ? 'bg-gradient-to-br from-primary-950 via-primary-900 to-primary-950 border-primary-800/50'
        : 'bg-surface-base border-border-subtle'
    }`}>
      <PanelGroup direction="vertical" className="h-full">
        <Panel defaultSize={50} minSize={30} maxSize={70} className="flex flex-col overflow-hidden">
      <div className={`p-4 flex-shrink-0 transition-all duration-300 ${
        theme === 'xipz'
          ? 'border-b border-primary-800/50 bg-primary-900/30'
          : 'border-b border-border-subtle'
      }`}>
        <h2 className={`text-lg font-semibold mb-4 ${
          theme === 'xipz' ? 'text-primary-100' : 'text-text-primary'
        }`}>Wallets</h2>

        <NetworkSelector />

        <div className="mt-4 space-y-2">
          <div className="flex gap-2">
            <button
              onClick={() => setShowCreateGroupDialog(true)}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-white rounded-lg hover:shadow-lg transition-all duration-300 font-medium"
              style={{
                background: theme === 'xipz'
                  ? 'linear-gradient(135deg, rgb(239, 68, 68) 0%, rgb(220, 38, 38) 100%)'
                  : 'linear-gradient(135deg, rgb(0, 225, 255) 0%, rgb(255, 0, 153) 100%)'
              }}
            >
              <Users className="w-4 h-4" />
              New Group
            </button>
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button 
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-all duration-300 font-medium hover:shadow-lg"
                  style={{
                    background: 'transparent',
                    border: '2px solid',
                    borderColor: theme === 'xipz'
                      ? 'rgb(239, 68, 68)'
                      : 'rgb(255, 0, 153)',
                    color: theme === 'xipz'
                      ? 'rgb(239, 68, 68)'
                      : 'rgb(255, 0, 153)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = theme === 'xipz'
                      ? 'rgba(239, 68, 68, 0.1)'
                      : 'rgba(255, 0, 153, 0.1)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                  }}
                >
                  <Upload className="w-4 h-4" />
                  Import
                  <ChevronDown className="w-3 h-3" />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  className="min-w-[160px] bg-surface-base rounded-lg shadow-lg border border-border-subtle p-1"
                  sideOffset={5}
                >
                  <DropdownMenu.Item
                    onClick={() => setShowImportGroupDialog(true)}
                    className={`flex items-center gap-2 px-3 py-2 text-sm rounded cursor-pointer transition-all duration-300 ${
                    theme === 'xipz'
                      ? 'text-primary-100 hover:bg-primary-800/50'
                      : 'text-text-primary hover:bg-surface-hover'
                  }`}
                  >
                    <Users className="w-4 h-4" />
                    Import Group (Seed Phrase)
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    onClick={() => setShowImportDialog(true)}
                    className={`flex items-center gap-2 px-3 py-2 text-sm rounded cursor-pointer transition-all duration-300 ${
                    theme === 'xipz'
                      ? 'text-primary-100 hover:bg-primary-800/50'
                      : 'text-text-primary hover:bg-surface-hover'
                  }`}
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

      <Tabs.Root defaultValue="groups" className="flex-1 flex flex-col min-h-0">
        <Tabs.List className={`flex flex-shrink-0 transition-all duration-300 ${
          theme === 'xipz'
            ? 'border-b border-primary-800/50 bg-primary-900/20'
            : 'border-b border-border-subtle'
        }`}>
          <Tabs.Trigger
            value="groups"
            className={`flex-1 px-4 py-2 text-sm font-medium transition-all duration-300 ${
              theme === 'xipz'
                ? 'text-primary-300 hover:text-primary-100 data-[state=active]:text-accent-400 data-[state=active]:border-b-2 data-[state=active]:border-accent-500'
                : 'text-text-secondary hover:text-text-primary data-[state=active]:text-accent data-[state=active]:border-b-2 data-[state=active]:border-accent'
            }`}
          >
            Groups ({actualGroups.length})
          </Tabs.Trigger>
          <Tabs.Trigger
            value="evm"
            className={`flex-1 px-4 py-2 text-sm font-medium transition-all duration-300 ${
              theme === 'xipz'
                ? 'text-primary-300 hover:text-primary-100 data-[state=active]:text-accent-400 data-[state=active]:border-b-2 data-[state=active]:border-accent-500'
                : 'text-text-secondary hover:text-text-primary data-[state=active]:text-accent data-[state=active]:border-b-2 data-[state=active]:border-accent'
            }`}
          >
            EVM ({walletsByType.EVM.length})
          </Tabs.Trigger>
          <Tabs.Trigger
            value="svm"
            className={`flex-1 px-4 py-2 text-sm font-medium transition-all duration-300 ${
              theme === 'xipz'
                ? 'text-primary-300 hover:text-primary-100 data-[state=active]:text-accent-400 data-[state=active]:border-b-2 data-[state=active]:border-accent-500'
                : 'text-text-secondary hover:text-text-primary data-[state=active]:text-accent data-[state=active]:border-b-2 data-[state=active]:border-accent'
            }`}
          >
            SVM ({walletsByType.SVM.length})
          </Tabs.Trigger>
          <Tabs.Trigger
            value="all"
            className={`flex-1 px-4 py-2 text-sm font-medium transition-all duration-300 ${
              theme === 'xipz'
                ? 'text-primary-300 hover:text-primary-100 data-[state=active]:text-accent-400 data-[state=active]:border-b-2 data-[state=active]:border-accent-500'
                : 'text-text-secondary hover:text-text-primary data-[state=active]:text-accent data-[state=active]:border-b-2 data-[state=active]:border-accent'
            }`}
          >
            All ({wallets.length})
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="groups" className="flex-1 overflow-hidden min-h-0">
          <BetterScrollArea>
            <div className="p-4">
              {actualGroups.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No wallet groups yet"
                  description="Create a group to manage multiple wallets with one recovery phrase"
                  action={{
                    label: 'Create Group',
                    onClick: () => setShowCreateGroupDialog(true),
                  }}
                  className="h-full"
                  theme={theme}
                />
              ) : (
                <div className="space-y-3">
                  {actualGroups.map((group) => (
                      <WalletGroupItem
                        key={group.id}
                        group={group}
                        wallets={wallets.filter((w) => w.groupId === group.id)}
                        onAddWallet={() => {
                          setSelectedGroupId(group.id)
                          setShowAddToGroupDialog(true)
                        }}
                        onSelectWallet={(walletId) => setActiveWallet(walletId)}
                        activeWalletId={activeWalletId}
                        onExportGroup={(group) => setExportGroup(group)}
                        onRenameWallet={(wallet) => setRenameWallet(wallet)}
                        onDeleteWallet={(walletId) => removeWallet(walletId)}
                        onCopyAddress={(address) => copyAddress(address)}
                        theme={theme}
                      />
                    ))}

                  {/* Show imported wallets group if it has wallets */}
                  {wallets.some((w) => w.groupId === 'default-imported') && (
                    <div className="mt-6">
                      <h3 className="text-sm font-medium text-text-secondary mb-2">
                        Imported Wallets
                      </h3>
                      <div className="space-y-2">
                        {wallets
                          .filter((w) => w.groupId === 'default-imported')
                          .map((wallet) => (
                            <WalletItem
                              key={wallet.id}
                              wallet={wallet}
                              isActive={wallet.id === activeWalletId}
                              onSelect={() => setActiveWallet(wallet.id)}
                              onCopy={() => copyAddress(wallet.address)}
                              onRename={() => setRenameWallet(wallet)}
                              onExport={() => handleExportWallet(wallet)}
                              onDelete={() => removeWallet(wallet.id)}
                              theme={theme}
                            />
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </BetterScrollArea>
        </Tabs.Content>

        <Tabs.Content value="evm" className="flex-1 overflow-hidden min-h-0">
          <BetterScrollArea>
            <div className="p-4">
              {walletsByType.EVM.length === 0 ? (
                <EmptyState
                  icon={WalletIcon}
                  title="No EVM wallets yet"
                  description="Create or import an EVM wallet to get started"
                  action={{
                    label: 'Create EVM Group',
                    onClick: () => setShowCreateGroupDialog(true),
                  }}
                  className="h-full"
                  theme={theme}
                />
              ) : (
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
              )}
            </div>
          </BetterScrollArea>
        </Tabs.Content>

        <Tabs.Content value="svm" className="flex-1 overflow-hidden min-h-0">
          <BetterScrollArea>
            <div className="p-4">
              {walletsByType.SVM.length === 0 ? (
                <EmptyState
                  icon={WalletIcon}
                  title="No SVM wallets yet"
                  description="Create or import a Solana wallet to get started"
                  action={{
                    label: 'Create SVM Group',
                    onClick: () => setShowCreateGroupDialog(true),
                  }}
                  className="h-full"
                  theme={theme}
                />
              ) : (
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
              )}
            </div>
          </BetterScrollArea>
        </Tabs.Content>

        <Tabs.Content value="all" className="flex-1 overflow-hidden min-h-0">
          <BetterScrollArea>
            <div className="p-4">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-text-secondary mb-2">
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
                  <h3 className="text-sm font-medium text-text-secondary mb-2">
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
            </div>
          </BetterScrollArea>
        </Tabs.Content>
      </Tabs.Root>

      <ImportWalletDialog open={showImportDialog} onOpenChange={setShowImportDialog} />
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
      <ImportGroupDialog open={showImportGroupDialog} onOpenChange={setShowImportGroupDialog} />
        </Panel>

        {activeWalletId && (
          <>
            <PanelResizeHandle className="h-px bg-border-subtle hover:bg-accent transition-colors" />
            <Panel>
              <WalletDetailView />
            </Panel>
          </>
        )}
      </PanelGroup>
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
  theme: 'light' | 'dark' | 'xipz'
}

function WalletItem({
  wallet,
  isActive,
  onSelect,
  onCopy,
  onRename,
  onExport,
  onDelete,
  theme,
}: WalletItemProps) {
  return (
    <div
      className={`p-3 rounded-lg border transition-all cursor-pointer ${
        isActive
          ? theme === 'xipz'
            ? 'border-accent-500 bg-accent-500/20'
            : 'border-accent bg-accent/10'
          : theme === 'xipz'
            ? 'border-primary-800/50 hover:border-primary-700/50 hover:bg-primary-800/20'
            : 'border-border-subtle hover:border-border-default'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className={`font-medium ${
              theme === 'xipz' ? 'text-primary-100' : 'text-text-primary'
            }`}>{wallet.name}</h4>
            {wallet.isImported && (
              <span className={`text-xs ${
                theme === 'xipz' ? 'text-primary-400' : 'text-text-tertiary'
              }`}>Imported</span>
            )}
          </div>
          <p className={`text-sm truncate ${
            theme === 'xipz' ? 'text-primary-300' : 'text-text-secondary'
          }`}>
            {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
          </p>
        </div>

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              className={`p-1 rounded transition-all duration-300 ${
                theme === 'xipz' 
                  ? 'hover:bg-primary-800/50' 
                  : 'hover:bg-surface-hover'
              }`}
            >
              <MoreVertical className={`w-4 h-4 ${
                theme === 'xipz' ? 'text-primary-400' : 'text-text-secondary'
              }`} />
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className={`min-w-[160px] rounded-lg shadow-lg border p-1 transition-all duration-300 ${
                theme === 'xipz'
                  ? 'bg-primary-900 border-primary-800/50'
                  : 'bg-surface-base border-border-subtle'
              }`}
              sideOffset={5}
            >
              <DropdownMenu.Item
                onClick={(e) => {
                  e.stopPropagation()
                  onCopy()
                }}
                className="flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-surface-hover rounded cursor-pointer"
              >
                <Copy className="w-4 h-4" />
                Copy Address
              </DropdownMenu.Item>

              <DropdownMenu.Item
                onClick={(e) => {
                  e.stopPropagation()
                  onRename()
                }}
                className="flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-surface-hover rounded cursor-pointer"
              >
                <Edit2 className="w-4 h-4" />
                Rename
              </DropdownMenu.Item>

              <DropdownMenu.Item
                onClick={(e) => {
                  e.stopPropagation()
                  onExport()
                }}
                className="flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-surface-hover rounded cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Export
              </DropdownMenu.Item>

              <DropdownMenu.Separator className="h-px bg-border-subtle my-1" />

              <DropdownMenu.Item
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete()
                }}
                className="flex items-center gap-2 px-3 py-2 text-sm text-accent hover:bg-accent/10 rounded cursor-pointer"
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
  onRenameWallet: (wallet: any) => void
  onDeleteWallet: (walletId: string) => void
  onCopyAddress: (address: string) => void
  theme: 'light' | 'dark' | 'xipz'
}

function WalletGroupItem({
  group,
  wallets,
  onAddWallet,
  onSelectWallet,
  activeWalletId,
  onExportGroup,
  onRenameWallet,
  onDeleteWallet,
  onCopyAddress,
  theme,
}: WalletGroupItemProps) {
  const { removeWalletGroup } = useWalletStore()
  const [isExpanded, setIsExpanded] = useState(true)

  return (
    <div className={`border rounded-lg overflow-hidden transition-all duration-300 ${
      theme === 'xipz'
        ? 'border-primary-800/50 bg-primary-900/30'
        : 'border-border-subtle bg-surface-base'
    }`}>
      <div className={`p-3 backdrop-blur-sm transition-all duration-300 ${
        theme === 'xipz'
          ? 'bg-primary-800/30'
          : 'bg-surface-elevated/50'
      }`}>
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 flex-1 text-left"
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform ${isExpanded ? '' : '-rotate-90'} ${
                theme === 'xipz' ? 'text-primary-400' : 'text-text-secondary'
              }`}
            />
            <div>
              <h3 className={`font-medium ${
                theme === 'xipz' ? 'text-primary-100' : 'text-text-primary'
              }`}>{group.name}</h3>
              <p className={`text-sm ${
                theme === 'xipz' ? 'text-primary-300' : 'text-text-secondary'
              }`}>
                {group.type} • {wallets.length} wallet{wallets.length !== 1 ? 's' : ''}
              </p>
            </div>
          </button>

          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className={`p-1 rounded transition-all duration-300 ${
                theme === 'xipz' 
                  ? 'hover:bg-primary-800/50' 
                  : 'hover:bg-surface-hover'
              }`}>
                <MoreVertical className={`w-4 h-4 ${
                  theme === 'xipz' ? 'text-primary-400' : 'text-text-secondary'
                }`} />
              </button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className={`min-w-[160px] rounded-lg shadow-lg border p-1 transition-all duration-300 ${
                  theme === 'xipz'
                    ? 'bg-primary-900 border-primary-800/50'
                    : 'bg-surface-base border-border-subtle'
                }`}
                sideOffset={5}
              >
                <DropdownMenu.Item
                  onClick={onAddWallet}
                  className={`flex items-center gap-2 px-3 py-2 text-sm rounded cursor-pointer transition-all duration-300 ${
                    theme === 'xipz'
                      ? 'text-primary-100 hover:bg-primary-800/50'
                      : 'text-text-primary hover:bg-surface-hover'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  Add Wallet
                </DropdownMenu.Item>

                <DropdownMenu.Item
                  onClick={() => onExportGroup(group)}
                  className={`flex items-center gap-2 px-3 py-2 text-sm rounded cursor-pointer transition-all duration-300 ${
                    theme === 'xipz'
                      ? 'text-primary-100 hover:bg-primary-800/50'
                      : 'text-text-primary hover:bg-surface-hover'
                  }`}
                >
                  <Download className="w-4 h-4" />
                  Export Seed Phrase
                </DropdownMenu.Item>

                <DropdownMenu.Separator className={`h-px my-1 ${
                  theme === 'xipz' ? 'bg-primary-800/50' : 'bg-border-subtle'
                }`} />

                <DropdownMenu.Item
                  onClick={() => {
                    if (confirm(`Delete group "${group.name}" and all its wallets?`)) {
                      removeWalletGroup(group.id)
                    }
                  }}
                  className={`flex items-center gap-2 px-3 py-2 text-sm rounded cursor-pointer transition-all duration-300 ${
                    theme === 'xipz'
                      ? 'text-accent-400 hover:bg-accent-500/20'
                      : 'text-accent hover:bg-accent/10'
                  }`}
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
              <p className="text-sm text-text-tertiary mb-2">
                No wallets in this group yet
              </p>
              <button
                onClick={onAddWallet}
                className="text-sm text-accent hover:text-accent-400 hover:underline transition-colors"
              >
                Add a wallet
              </button>
            </div>
          ) : (
            wallets.map((wallet) => (
              <div
                key={wallet.id}
                className={`group relative p-2 rounded transition-colors ${
                  wallet.id === activeWalletId
                    ? 'bg-accent/10 border border-accent/30'
                    : 'hover:bg-surface-hover'
                }`}
              >
                <div 
                  onClick={() => onSelectWallet(wallet.id)}
                  className="flex items-center justify-between cursor-pointer"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary">
                      {wallet.name}
                    </p>
                    <p className="text-xs text-text-secondary truncate">
                      {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-tertiary">{wallet.type}</span>
                    <DropdownMenu.Root>
                      <DropdownMenu.Trigger asChild>
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-surface-hover transition-all"
                        >
                          <MoreVertical className="w-3 h-3 text-text-secondary" />
                        </button>
                      </DropdownMenu.Trigger>
                      <DropdownMenu.Portal>
                        <DropdownMenu.Content
                          className="min-w-[140px] bg-surface-base rounded-lg shadow-lg border border-border-subtle p-1"
                          sideOffset={5}
                        >
                          <DropdownMenu.Item
                            onClick={(e) => {
                              e.stopPropagation()
                              onCopyAddress(wallet.address)
                            }}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm text-text-primary hover:bg-surface-hover rounded cursor-pointer"
                          >
                            <Copy className="w-3 h-3" />
                            Copy Address
                          </DropdownMenu.Item>
                          <DropdownMenu.Item
                            onClick={(e) => {
                              e.stopPropagation()
                              onRenameWallet(wallet)
                            }}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm text-text-primary hover:bg-surface-hover rounded cursor-pointer"
                          >
                            <Edit2 className="w-3 h-3" />
                            Rename
                          </DropdownMenu.Item>
                          <DropdownMenu.Separator className={`h-px my-1 ${
                  theme === 'xipz' ? 'bg-primary-800/50' : 'bg-border-subtle'
                }`} />
                          <DropdownMenu.Item
                            onClick={(e) => {
                              e.stopPropagation()
                              onDeleteWallet(wallet.id)
                            }}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm text-accent hover:bg-accent/10 rounded cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            Delete
                          </DropdownMenu.Item>
                        </DropdownMenu.Content>
                      </DropdownMenu.Portal>
                    </DropdownMenu.Root>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
