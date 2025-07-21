import { useState, useMemo } from 'react'
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
  PanelRightClose,
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
import { useTheme } from '../../hooks/useTheme'

interface WalletDrawerProps {
  onToggle?: () => void
  collapsed?: boolean
}

export function WalletDrawer({ onToggle, collapsed }: WalletDrawerProps) {
  const { wallets, walletGroups, activeWalletId, setActiveWallet, removeWallet } =
    useWalletStore()
  
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [renameWallet, setRenameWallet] = useState<(typeof wallets)[0] | null>(null)
  const [showCreateGroupDialog, setShowCreateGroupDialog] = useState(false)
  const [showAddToGroupDialog, setShowAddToGroupDialog] = useState(false)
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>()
  const [exportGroup, setExportGroup] = useState<any | null>(null)
  const [showImportGroupDialog, setShowImportGroupDialog] = useState(false)
  const { theme } = useTheme()

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

  if (collapsed) {
    return (
      <div className="h-full w-full bg-surface-base border-l border-border-subtle flex flex-col items-center justify-start py-4">
        <button
          onClick={onToggle}
          className="p-2 rounded-lg hover:bg-surface-hover transition-colors"
          title="Expand drawer"
        >
          <WalletIcon className="w-5 h-5 text-text-secondary" />
        </button>
      </div>
    )
  }

  return (
    <div className={`h-full border-l ${theme.styles.drawerContainer} panel-content-fade-right`}>
      <PanelGroup direction="vertical" className="h-full">
        <Panel defaultSize={50} minSize={30} maxSize={70} className="flex flex-col overflow-hidden">
      <div className={`p-4 flex-shrink-0 transition-all duration-300 ${theme.styles.panelHeader}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-lg font-semibold ${theme.styles.textPrimary}`}>Wallets</h2>
          {onToggle && (
            <button
              onClick={onToggle}
              className="p-2 rounded-lg hover:bg-surface-hover transition-colors"
              title="Collapse drawer"
            >
              <PanelRightClose className="w-5 h-5 text-text-secondary" />
            </button>
          )}
        </div>

        <NetworkSelector />

        <div className="mt-4 space-y-2">
          <div className="flex gap-2">
            <button
              onClick={() => setShowCreateGroupDialog(true)}
              className={`${theme.styles.buttonPrimary} flex-1 flex items-center justify-center gap-2 px-3 py-2`}
              style={theme.dynamicStyles.buttonPrimary}
            >
              <Users className="w-4 h-4" />
              New Group
            </button>
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button 
                  className={`${theme.styles.buttonSecondary} flex-1 flex items-center justify-center gap-2 px-3 py-2`}
                  style={theme.dynamicStyles.buttonSecondary}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = theme.name === 'Xipz' 
                      ? 'rgba(239, 68, 68, 0.1)' 
                      : 'rgba(255, 0, 153, 0.1)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }}
                >
                  <Upload className="w-4 h-4" />
                  Import
                  <ChevronDown className="w-3 h-3" />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  className={theme.styles.dropdown.content}
                  sideOffset={5}
                >
                  <DropdownMenu.Item
                    onClick={() => setShowImportGroupDialog(true)}
                    className={`${theme.styles.dropdown.item} ${theme.styles.dropdown.itemHover}`}
                  >
                    <Users className="w-4 h-4" />
                    Import Group (Seed Phrase)
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    onClick={() => setShowImportDialog(true)}
                    className={`${theme.styles.dropdown.item} ${theme.styles.dropdown.itemHover}`}
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
        <Tabs.List className={`${theme.styles.tabs.list} flex-shrink-0`}>
          <Tabs.Trigger
            value="groups"
            className={theme.styles.tabs.trigger}
          >
            Groups ({actualGroups.length})
          </Tabs.Trigger>
          <Tabs.Trigger
            value="evm"
            className={theme.styles.tabs.trigger}
          >
            EVM ({walletsByType.EVM.length})
          </Tabs.Trigger>
          <Tabs.Trigger
            value="svm"
            className={theme.styles.tabs.trigger}
          >
            SVM ({walletsByType.SVM.length})
          </Tabs.Trigger>
          <Tabs.Trigger
            value="all"
            className={theme.styles.tabs.trigger}
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
                      />
                    ))}

                  {/* Show imported wallets group if it has wallets */}
                  {wallets.some((w) => w.groupId === 'default-imported') && (
                    <div className="mt-6">
                      <h3 className={`text-sm font-medium mb-2 ${theme.styles.textSecondary}`}>
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
                  <h3 className={`text-sm font-medium mb-2 ${theme.styles.textSecondary}`}>
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
                  <h3 className={`text-sm font-medium mb-2 ${theme.styles.textSecondary}`}>
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
}

function WalletItem({
  wallet,
  isActive,
  onSelect,
  onCopy,
  onRename,
  onExport,
  onDelete,
}: WalletItemProps) {
  const { theme } = useTheme()
  return (
    <div
      className={`p-3 rounded-lg border transition-all cursor-pointer ${
        isActive
          ? theme.styles.listItemActive
          : `${theme.styles.listItem} ${theme.styles.listItemHover}`
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className={`font-medium ${theme.styles.textPrimary}`}>{wallet.name}</h4>
            {wallet.isImported && (
              <span className={`text-xs ${theme.styles.textTertiary}`}>Imported</span>
            )}
          </div>
          <p className={`text-sm truncate ${theme.styles.textSecondary}`}>
            {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
          </p>
        </div>

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              className={theme.styles.buttonIcon}
            >
              <MoreVertical className={`w-4 h-4 ${theme.styles.iconSecondary}`} />
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className={theme.styles.dropdown.content}
              sideOffset={5}
            >
              <DropdownMenu.Item
                onClick={(e) => {
                  e.stopPropagation()
                  onCopy()
                }}
                className={`${theme.styles.dropdown.item} ${theme.styles.dropdown.itemHover}`}
              >
                <Copy className="w-4 h-4" />
                Copy Address
              </DropdownMenu.Item>

              <DropdownMenu.Item
                onClick={(e) => {
                  e.stopPropagation()
                  onRename()
                }}
                className={`${theme.styles.dropdown.item} ${theme.styles.dropdown.itemHover}`}
              >
                <Edit2 className="w-4 h-4" />
                Rename
              </DropdownMenu.Item>

              <DropdownMenu.Item
                onClick={(e) => {
                  e.stopPropagation()
                  onExport()
                }}
                className={`${theme.styles.dropdown.item} ${theme.styles.dropdown.itemHover}`}
              >
                <Download className="w-4 h-4" />
                Export
              </DropdownMenu.Item>

              <DropdownMenu.Separator className={theme.styles.dropdown.separator} />

              <DropdownMenu.Item
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete()
                }}
                className="flex items-center gap-2 px-3 py-2 text-sm text-accent hover:bg-accent/10 rounded cursor-pointer transition-all duration-300"
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
}: WalletGroupItemProps) {
  const { removeWalletGroup } = useWalletStore()
  const { theme } = useTheme()
  const [isExpanded, setIsExpanded] = useState(true)

  return (
    <div className={theme.styles.groupContainer}>
      <div className={theme.styles.groupHeader}>
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 flex-1 text-left"
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform ${isExpanded ? '' : '-rotate-90'} ${theme.styles.iconSecondary}`}
            />
            <div>
              <h3 className={`font-medium ${theme.styles.textPrimary}`}>{group.name}</h3>
              <p className={`text-sm ${theme.styles.textSecondary}`}>
                {group.type} • {wallets.length} wallet{wallets.length !== 1 ? 's' : ''}
              </p>
            </div>
          </button>

          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className={theme.styles.buttonIcon}>
                <MoreVertical className={`w-4 h-4 ${theme.styles.iconSecondary}`} />
              </button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className={theme.styles.dropdown.content}
                sideOffset={5}
              >
                <DropdownMenu.Item
                  onClick={onAddWallet}
                  className={`${theme.styles.dropdown.item} ${theme.styles.dropdown.itemHover}`}
                >
                  <Plus className="w-4 h-4" />
                  Add Wallet
                </DropdownMenu.Item>

                <DropdownMenu.Item
                  onClick={() => onExportGroup(group)}
                  className={`${theme.styles.dropdown.item} ${theme.styles.dropdown.itemHover}`}
                >
                  <Download className="w-4 h-4" />
                  Export Seed Phrase
                </DropdownMenu.Item>

                <DropdownMenu.Separator className={theme.styles.dropdown.separator} />

                <DropdownMenu.Item
                  onClick={() => {
                    if (confirm(`Delete group "${group.name}" and all its wallets?`)) {
                      removeWalletGroup(group.id)
                    }
                  }}
                  className="flex items-center gap-2 px-3 py-2 text-sm rounded cursor-pointer transition-all duration-300 text-accent hover:bg-accent/10"
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
              <p className={`text-sm mb-2 ${theme.styles.textTertiary}`}>
                No wallets in this group yet
              </p>
              <button
                onClick={onAddWallet}
                className={`text-sm hover:underline transition-colors ${theme.styles.iconAccent}`}
              >
                Add a wallet
              </button>
            </div>
          ) : (
            wallets.map((wallet) => (
              <div
                key={wallet.id}
                className={`group relative p-2 rounded border ${
                  wallet.id === activeWalletId
                    ? theme.styles.listItemActive
                    : `border-transparent ${theme.styles.listItemHover}`
                }`}
              >
                <div 
                  onClick={() => onSelectWallet(wallet.id)}
                  className="flex items-center justify-between cursor-pointer"
                >
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${theme.styles.textPrimary}`}>
                      {wallet.name}
                    </p>
                    <p className={`text-xs truncate ${theme.styles.textSecondary}`}>
                      {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs ${theme.styles.textTertiary}`}>{wallet.type}</span>
                    <DropdownMenu.Root>
                      <DropdownMenu.Trigger asChild>
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className={`p-1 rounded opacity-0 group-hover:opacity-100 transition-all ${theme.styles.buttonIcon}`}
                        >
                          <MoreVertical className={`w-3 h-3 ${theme.styles.iconSecondary}`} />
                        </button>
                      </DropdownMenu.Trigger>
                      <DropdownMenu.Portal>
                        <DropdownMenu.Content
                          className={`min-w-[140px] rounded-lg shadow-lg p-1 ${theme.styles.dropdown.content}`}
                          sideOffset={5}
                        >
                          <DropdownMenu.Item
                            onClick={(e) => {
                              e.stopPropagation()
                              onCopyAddress(wallet.address)
                            }}
                            className={`${theme.styles.dropdown.item} ${theme.styles.dropdown.itemHover}`}
                          >
                            <Copy className="w-3 h-3" />
                            Copy Address
                          </DropdownMenu.Item>
                          <DropdownMenu.Item
                            onClick={(e) => {
                              e.stopPropagation()
                              onRenameWallet(wallet)
                            }}
                            className={`${theme.styles.dropdown.item} ${theme.styles.dropdown.itemHover}`}
                          >
                            <Edit2 className="w-3 h-3" />
                            Rename
                          </DropdownMenu.Item>
                          <DropdownMenu.Separator className={theme.styles.dropdown.separator} />
                          <DropdownMenu.Item
                            onClick={(e) => {
                              e.stopPropagation()
                              onDeleteWallet(wallet.id)
                            }}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm text-accent hover:bg-accent/10 rounded cursor-pointer transition-all duration-300"
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
