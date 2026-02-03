import { useMemo, useState } from 'react'
import {
  ChevronDown,
  Copy,
  Download,
  Edit2,
  ExternalLink,
  Lock,
  MoreVertical,
  Plus,
  Trash2,
  Upload,
  Users,
  Wallet as WalletIcon,
  Sparkles,
  Layers,
} from 'lucide-react'
import { useWalletStore } from '../../store/walletStore'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import * as Tabs from '@radix-ui/react-tabs'

import { MultiNetworkSelector } from './MultiNetworkSelector'
import { ExecutionNetworkSelector } from './ExecutionNetworkSelector'
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

// Theme color configurations for wallet drawer
const drawerThemeColors = {
  light: {
    headerBg: 'bg-white/60',
    headerBorder: 'border-gray-200/50',
    titleGradient: 'from-cyan-600 via-teal-500 to-cyan-600',
    titleIconBg: 'bg-gradient-to-r from-cyan-500 via-teal-400 to-cyan-600',
    buttonPrimaryGradient: 'from-cyan-500 via-teal-400 to-cyan-600',
    buttonPrimaryShadow: 'shadow-cyan-500/20 hover:shadow-cyan-500/30',
    buttonSecondaryBg: 'bg-gray-100/80',
    buttonSecondaryBorder: 'border-gray-200/50',
    buttonSecondaryHover: 'hover:bg-gray-200/80',
    tabActiveBg: 'bg-cyan-500/10',
    tabActiveBorder: 'border-cyan-500/30',
    tabActiveText: 'text-cyan-600',
    tabInactiveText: 'text-gray-500',
    tabHover: 'hover:bg-gray-100/60',
    groupCardBg: 'bg-white/60',
    groupCardBorder: 'border-gray-200/30',
    groupCardHover: 'hover:border-gray-300/50',
    groupHeaderBg: 'bg-gray-50/50',
    walletCardBg: 'bg-white/40',
    walletCardBorder: 'border-gray-200/30',
    walletCardActiveBg: 'bg-cyan-50/80',
    walletCardActiveBorder: 'border-cyan-400/40',
    walletCardActiveGlow: 'shadow-cyan-400/10',
    walletCardHover: 'hover:bg-gray-50/60',
    dropdownBg: 'bg-white/95',
    dropdownBorder: 'border-gray-200/50',
    dropdownHover: 'hover:bg-gray-100/80',
    deleteText: 'text-red-500',
    deleteHover: 'hover:bg-red-50/80',
    accentLine: 'bg-gradient-to-b from-cyan-500 to-teal-400',
    dragHandleColor: 'text-gray-400',
  },
  dark: {
    headerBg: 'bg-black/20',
    headerBorder: 'border-white/5',
    titleGradient: 'from-cyan-400 via-cyan-300 to-pink-400',
    titleIconBg: 'bg-gradient-to-r from-cyan-500 via-cyan-400 to-pink-500',
    buttonPrimaryGradient: 'from-cyan-500 via-cyan-400 to-pink-500',
    buttonPrimaryShadow: 'shadow-cyan-500/25 hover:shadow-cyan-500/40',
    buttonSecondaryBg: 'bg-white/5',
    buttonSecondaryBorder: 'border-white/10',
    buttonSecondaryHover: 'hover:bg-white/10',
    tabActiveBg: 'bg-cyan-500/10',
    tabActiveBorder: 'border-cyan-500/30',
    tabActiveText: 'text-cyan-400',
    tabInactiveText: 'text-white/50',
    tabHover: 'hover:bg-white/5',
    groupCardBg: 'bg-white/5',
    groupCardBorder: 'border-white/10',
    groupCardHover: 'hover:border-white/20',
    groupHeaderBg: 'bg-black/20',
    walletCardBg: 'bg-white/5',
    walletCardBorder: 'border-white/5',
    walletCardActiveBg: 'bg-cyan-500/10',
    walletCardActiveBorder: 'border-cyan-500/30',
    walletCardActiveGlow: 'shadow-cyan-500/10',
    walletCardHover: 'hover:bg-white/10',
    dropdownBg: 'bg-slate-900/95',
    dropdownBorder: 'border-white/10',
    dropdownHover: 'hover:bg-white/10',
    deleteText: 'text-red-400',
    deleteHover: 'hover:bg-red-500/10',
    accentLine: 'bg-gradient-to-b from-cyan-500 to-pink-500',
    dragHandleColor: 'text-white/30',
  },
  xipz: {
    headerBg: 'bg-primary-900/50',
    headerBorder: 'border-primary-800/50',
    titleGradient: 'from-red-400 via-red-500 to-red-400',
    titleIconBg: 'bg-gradient-to-r from-red-500 via-red-600 to-red-500',
    buttonPrimaryGradient: 'from-red-500 via-red-600 to-red-500',
    buttonPrimaryShadow: 'shadow-red-500/25 hover:shadow-red-500/40',
    buttonSecondaryBg: 'bg-primary-800/30',
    buttonSecondaryBorder: 'border-primary-800/50',
    buttonSecondaryHover: 'hover:bg-primary-800/50',
    tabActiveBg: 'bg-red-500/10',
    tabActiveBorder: 'border-red-500/30',
    tabActiveText: 'text-red-400',
    tabInactiveText: 'text-primary-400',
    tabHover: 'hover:bg-primary-800/30',
    groupCardBg: 'bg-primary-900/30',
    groupCardBorder: 'border-primary-800/50',
    groupCardHover: 'hover:border-primary-700/50',
    groupHeaderBg: 'bg-primary-800/30',
    walletCardBg: 'bg-primary-900/30',
    walletCardBorder: 'border-primary-800/30',
    walletCardActiveBg: 'bg-red-500/10',
    walletCardActiveBorder: 'border-red-500/30',
    walletCardActiveGlow: 'shadow-red-500/10',
    walletCardHover: 'hover:bg-primary-800/30',
    dropdownBg: 'bg-primary-900',
    dropdownBorder: 'border-primary-800/50',
    dropdownHover: 'hover:bg-primary-800/50',
    deleteText: 'text-red-400',
    deleteHover: 'hover:bg-red-500/10',
    accentLine: 'bg-gradient-to-b from-red-500 to-red-600',
    dragHandleColor: 'text-primary-400',
  },
}
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// Custom modifier to restrict to vertical axis
const restrictToVerticalAxis = ({
  transform,
}: {
  transform: { x: number; y: number; scaleX: number; scaleY: number }
}) => {
  return {
    ...transform,
    x: 0, // Restrict horizontal movement
  }
}

interface WalletDrawerProps {
  onToggle?: () => void
  collapsed?: boolean
}

// Custom animation to prevent bounce
const customAnimateLayoutChanges = ({
  isSorting,
  wasDragging,
}: {
  isSorting: boolean
  wasDragging?: boolean
}) => {
  if (isSorting || wasDragging) {
    return false
  }
  return true
}

// Sortable Group Component
function SortableWalletGroup(props: WalletGroupItemProps & { id: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.id,
    animateLayoutChanges: customAnimateLayoutChanges,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <WalletGroupItem {...props} dragHandleProps={listeners} />
    </div>
  )
}

// Sortable Wallet Component
function SortableWallet(props: WalletItemProps & { id: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.id,
    animateLayoutChanges: customAnimateLayoutChanges,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <WalletItem {...props} />
    </div>
  )
}

export function WalletDrawer({ collapsed }: WalletDrawerProps) {
  const {
    wallets,
    walletGroups,
    activeWalletId,
    setActiveWallet,
    removeWallet,
    activeNetwork,
    reorderWalletGroups,
    reorderWallets,
    lock,
  } = useWalletStore()

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const [showImportDialog, setShowImportDialog] = useState(false)
  const [renameWallet, setRenameWallet] = useState<(typeof wallets)[0] | null>(null)
  const [showCreateGroupDialog, setShowCreateGroupDialog] = useState(false)
  const [showAddToGroupDialog, setShowAddToGroupDialog] = useState(false)
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>()
  const [exportGroup, setExportGroup] = useState<any | null>(null)
  const [showImportGroupDialog, setShowImportGroupDialog] = useState(false)
  const { theme, themeName } = useTheme()

  // Get theme-specific colors
  const colors = drawerThemeColors[themeName] || drawerThemeColors.dark

  // Memoize filtered data to avoid recalculation on every render
  const actualGroups = useMemo(
    () =>
      walletGroups
        .filter((g) => g.id !== 'default-imported')
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [walletGroups],
  )

  // Sort wallets by order for drag and drop
  const sortedWallets = useMemo(() => {
    const sorted = [...wallets].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    return {
      all: sorted,
      EVM: sorted.filter((w) => w.type === 'EVM'),
      SVM: sorted.filter((w) => w.type === 'SVM'),
    }
  }, [wallets])

  // Keep walletsByType for backward compatibility
  const walletsByType = sortedWallets

  const handleGroupDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = actualGroups.findIndex((g) => g.id === active.id)
      const newIndex = actualGroups.findIndex((g) => g.id === over.id)

      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(actualGroups, oldIndex, newIndex)
        await reorderWalletGroups(newOrder.map((g) => g.id))
      }
    }
  }

  const handleWalletDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const activeWallet = wallets.find((w) => w.id === active.id)
      const overWallet = wallets.find((w) => w.id === over.id)

      // Only allow reordering within the same type
      if (activeWallet && overWallet && activeWallet.type === overWallet.type) {
        const oldIndex = sortedWallets.all.findIndex((w) => w.id === active.id)
        const newIndex = sortedWallets.all.findIndex((w) => w.id === over.id)

        if (oldIndex !== -1 && newIndex !== -1) {
          const newOrder = arrayMove(sortedWallets.all, oldIndex, newIndex)
          await reorderWallets(newOrder.map((w) => w.id))
        }
      }
    }
  }

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address)
  }

  const handleExportWallet = (wallet: (typeof wallets)[0]) => {
    // TODO: Implement wallet export
    console.log('Export wallet:', wallet)
  }

  if (collapsed) {
    return <div className="h-full w-full border-l border-border-subtle panel-content-fade-right" />
  }

  return (
    <div className={`h-full ${theme.styles.drawerContainer} panel-content-fade-right`}>
      <PanelGroup direction="vertical" className="h-full">
        <Panel defaultSize={50} minSize={30} maxSize={70} className="flex flex-col overflow-hidden">
          {/* Header */}
          <div className={`p-4 flex-shrink-0 ${theme.styles.panelHeader}`}>
            {/* Title with icon and lock button */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${colors.titleIconBg}`}>
                  <WalletIcon className="w-4 h-4 text-white" />
                </div>
                <h2
                  className={`text-lg font-semibold bg-gradient-to-r ${colors.titleGradient} bg-clip-text text-transparent`}
                >
                  Wallets
                </h2>
              </div>
              <button
                onClick={lock}
                className={`${theme.styles.buttonIcon} p-2 rounded-lg ${theme.styles.iconSecondary} hover:${theme.styles.iconPrimary}`}
                title="Lock wallet"
              >
                <Lock className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <MultiNetworkSelector />
              <ExecutionNetworkSelector />
            </div>

            {/* Action buttons with modern styling */}
            <div className="mt-4 space-y-2">
              <div className="flex gap-2">
                {/* New Group button with gradient */}
                <button
                  onClick={() => setShowCreateGroupDialog(true)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r ${colors.buttonPrimaryGradient} rounded-xl font-medium text-white shadow-lg ${colors.buttonPrimaryShadow} transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]`}
                >
                  <Sparkles className="w-4 h-4" />
                  New Group
                </button>

                {/* Import dropdown using theme styles */}
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <button
                      className={`${theme.styles.buttonSecondary} flex-1 flex items-center justify-center gap-2 px-3 py-2`}
                      style={theme.dynamicStyles.buttonSecondary}
                    >
                      <Upload className="w-4 h-4" />
                      Import
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.Content className={theme.styles.dropdown.content} sideOffset={5}>
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
            {/* Tabs using theme.styles for proper active state */}
            <Tabs.List className={`${theme.styles.tabs.list} flex-shrink-0`}>
              <Tabs.Trigger
                value="groups"
                className={`${theme.styles.tabs.trigger} flex items-center justify-center gap-1.5`}
              >
                <Layers className="w-3.5 h-3.5" />
                Groups ({actualGroups.length})
              </Tabs.Trigger>
              <Tabs.Trigger value="evm" className={theme.styles.tabs.trigger}>
                EVM ({walletsByType.EVM.length})
              </Tabs.Trigger>
              <Tabs.Trigger value="svm" className={theme.styles.tabs.trigger}>
                SVM ({walletsByType.SVM.length})
              </Tabs.Trigger>
              <Tabs.Trigger value="all" className={theme.styles.tabs.trigger}>
                All ({wallets.length})
              </Tabs.Trigger>
            </Tabs.List>

            <Tabs.Content value="groups" className="flex-1 overflow-hidden min-h-0">
              <div className="h-full w-full overflow-y-auto">
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
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleGroupDragEnd}
                        modifiers={[restrictToVerticalAxis]}
                      >
                        <SortableContext
                          items={actualGroups.map((g) => g.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          {actualGroups.map((group) => (
                            <SortableWalletGroup
                              key={group.id}
                              id={group.id}
                              group={group}
                              wallets={wallets
                                .filter((w) => w.groupId === group.id)
                                .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))}
                              onAddWallet={() => {
                                setSelectedGroupId(group.id)
                                setShowAddToGroupDialog(true)
                              }}
                              onSelectWallet={(walletId) => {
                                if (walletId === activeWalletId) {
                                  setActiveWallet(null)
                                } else {
                                  setActiveWallet(walletId)
                                }
                              }}
                              activeWalletId={activeWalletId}
                              onExportGroup={(group) => setExportGroup(group)}
                              onRenameWallet={(wallet) => setRenameWallet(wallet)}
                              onDeleteWallet={(walletId) => removeWallet(walletId)}
                              onCopyAddress={(address) => copyAddress(address)}
                            />
                          ))}
                        </SortableContext>
                      </DndContext>

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
                                  onSelect={() => {
                                    if (wallet.id === activeWalletId) {
                                      setActiveWallet(null)
                                    } else {
                                      setActiveWallet(wallet.id)
                                    }
                                  }}
                                  onCopy={() => copyAddress(wallet.address)}
                                  onRename={() => setRenameWallet(wallet)}
                                  onExport={() => handleExportWallet(wallet)}
                                  onDelete={() => removeWallet(wallet.id)}
                                  network={activeNetwork}
                                />
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Tabs.Content>

            <Tabs.Content value="evm" className="flex-1 overflow-hidden min-h-0">
              <div className="h-full w-full overflow-y-auto">
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
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleWalletDragEnd}
                        modifiers={[restrictToVerticalAxis]}
                      >
                        <SortableContext
                          items={sortedWallets.EVM.map((w) => w.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          {sortedWallets.EVM.map((wallet) => (
                            <SortableWallet
                              key={wallet.id}
                              id={wallet.id}
                              wallet={wallet}
                              isActive={wallet.id === activeWalletId}
                              onSelect={() =>
                                setActiveWallet(wallet.id === activeWalletId ? null : wallet.id)
                              }
                              onCopy={() => copyAddress(wallet.address)}
                              onRename={() => setRenameWallet(wallet)}
                              onExport={() => handleExportWallet(wallet)}
                              onDelete={() => removeWallet(wallet.id)}
                              network={activeNetwork}
                            />
                          ))}
                        </SortableContext>
                      </DndContext>
                    </div>
                  )}
                </div>
              </div>
            </Tabs.Content>

            <Tabs.Content value="svm" className="flex-1 overflow-hidden min-h-0">
              <div className="h-full w-full overflow-y-auto">
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
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleWalletDragEnd}
                        modifiers={[restrictToVerticalAxis]}
                      >
                        <SortableContext
                          items={sortedWallets.SVM.map((w) => w.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          {sortedWallets.SVM.map((wallet) => (
                            <SortableWallet
                              key={wallet.id}
                              id={wallet.id}
                              wallet={wallet}
                              isActive={wallet.id === activeWalletId}
                              onSelect={() =>
                                setActiveWallet(wallet.id === activeWalletId ? null : wallet.id)
                              }
                              onCopy={() => copyAddress(wallet.address)}
                              onRename={() => setRenameWallet(wallet)}
                              onExport={() => handleExportWallet(wallet)}
                              onDelete={() => removeWallet(wallet.id)}
                              network={activeNetwork}
                            />
                          ))}
                        </SortableContext>
                      </DndContext>
                    </div>
                  )}
                </div>
              </div>
            </Tabs.Content>

            <Tabs.Content value="all" className="flex-1 overflow-hidden min-h-0">
              <div className="h-full w-full overflow-y-auto">
                <div className="p-4">
                  <div className="space-y-4">
                    <div>
                      <h3 className={`text-sm font-medium mb-2 ${theme.styles.textSecondary}`}>
                        EVM Wallets
                      </h3>
                      <div className="space-y-2">
                        <DndContext
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragEnd={handleWalletDragEnd}
                          modifiers={[restrictToVerticalAxis]}
                        >
                          <SortableContext
                            items={sortedWallets.EVM.map((w) => w.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            {sortedWallets.EVM.map((wallet) => (
                              <SortableWallet
                                key={wallet.id}
                                id={wallet.id}
                                wallet={wallet}
                                isActive={wallet.id === activeWalletId}
                                onSelect={() =>
                                  setActiveWallet(wallet.id === activeWalletId ? null : wallet.id)
                                }
                                onCopy={() => copyAddress(wallet.address)}
                                onRename={() => setRenameWallet(wallet)}
                                onExport={() => handleExportWallet(wallet)}
                                onDelete={() => removeWallet(wallet.id)}
                                network={activeNetwork}
                              />
                            ))}
                          </SortableContext>
                        </DndContext>
                      </div>
                    </div>

                    <div>
                      <h3 className={`text-sm font-medium mb-2 ${theme.styles.textSecondary}`}>
                        SVM Wallets
                      </h3>
                      <div className="space-y-2">
                        <DndContext
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragEnd={handleWalletDragEnd}
                          modifiers={[restrictToVerticalAxis]}
                        >
                          <SortableContext
                            items={sortedWallets.SVM.map((w) => w.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            {sortedWallets.SVM.map((wallet) => (
                              <SortableWallet
                                key={wallet.id}
                                id={wallet.id}
                                wallet={wallet}
                                isActive={wallet.id === activeWalletId}
                                onSelect={() =>
                                  setActiveWallet(wallet.id === activeWalletId ? null : wallet.id)
                                }
                                onCopy={() => copyAddress(wallet.address)}
                                onRename={() => setRenameWallet(wallet)}
                                onExport={() => handleExportWallet(wallet)}
                                onDelete={() => removeWallet(wallet.id)}
                                network={activeNetwork}
                              />
                            ))}
                          </SortableContext>
                        </DndContext>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
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
            <PanelResizeHandle
              className={`h-px transition-colors ${theme.styles.resizeHandle} ${theme.styles.resizeHandleHover}`}
            />
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
  network?: any
}

function WalletItem({
  wallet,
  isActive,
  onSelect,
  onCopy,
  onRename,
  onExport,
  onDelete,
  network,
}: WalletItemProps) {
  const { theme, themeName } = useTheme()
  const colors = drawerThemeColors[themeName] || drawerThemeColors.dark
  const [isEditingName, setIsEditingName] = useState(false)
  const [editedName, setEditedName] = useState(wallet.name)
  const { updateWallet } = useWalletStore()

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsEditingName(true)
  }

  const handleNameSubmit = async () => {
    if (editedName.trim() && editedName !== wallet.name) {
      await updateWallet(wallet.id, { name: editedName.trim() })
    }
    setIsEditingName(false)
  }

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameSubmit()
    } else if (e.key === 'Escape') {
      setEditedName(wallet.name)
      setIsEditingName(false)
    }
  }

  return (
    <div
      className={`group relative p-3 rounded-xl border transition-all duration-200 cursor-pointer ${
        isActive
          ? `${colors.walletCardActiveBg} ${colors.walletCardActiveBorder} shadow-lg ${colors.walletCardActiveGlow}`
          : `${colors.walletCardBg} ${colors.walletCardBorder} ${colors.walletCardHover}`
      }`}
      onClick={onSelect}
    >
      {/* Active indicator line */}
      {isActive && (
        <div
          className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full ${colors.accentLine}`}
        />
      )}

      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0 mr-2 pl-1">
          <div className="flex items-center gap-2">
            {isEditingName ? (
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onBlur={handleNameSubmit}
                onKeyDown={handleNameKeyDown}
                onClick={(e) => e.stopPropagation()}
                className={`font-medium px-2 py-1 bg-white/5 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/30 text-text-primary`}
                autoFocus
              />
            ) : (
              <h4 className={`font-medium text-text-primary`} onDoubleClick={handleDoubleClick}>
                {wallet.name}
              </h4>
            )}
            {wallet.isImported && (
              <span
                className={`text-xs px-1.5 py-0.5 rounded-md ${colors.walletCardBg} text-text-tertiary`}
              >
                Imported
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <p className={`text-sm text-text-secondary font-mono`}>
              {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onCopy()
              }}
              className={`p-1 rounded-lg transition-all ${colors.walletCardHover} opacity-0 group-hover:opacity-100 hover:scale-110`}
              title="Copy address"
            >
              <Copy className={`w-3 h-3 text-text-secondary`} />
            </button>
            {network && (
              <a
                href={`${network.explorerUrl || network.explorer}/address/${wallet.address}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className={`p-1 rounded-lg transition-all ${colors.walletCardHover} opacity-0 group-hover:opacity-100 hover:scale-110`}
                title="View on explorer"
              >
                <ExternalLink className={`w-3 h-3 text-text-secondary`} />
              </a>
            )}
          </div>
        </div>

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              className={`${theme.styles.buttonIcon} opacity-0 group-hover:opacity-100`}
            >
              <MoreVertical className={`w-4 h-4 ${theme.styles.iconSecondary}`} />
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content className={theme.styles.dropdown.content} sideOffset={5}>
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
                className="flex items-center gap-2 px-3 py-2 text-sm text-accent hover:bg-accent/10 rounded cursor-pointer transition-colors"
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
  dragHandleProps?: any
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
  dragHandleProps,
}: WalletGroupItemProps) {
  const { removeWalletGroup, updateWalletGroup, activeNetwork } = useWalletStore()
  const { theme, themeName } = useTheme()
  const colors = drawerThemeColors[themeName] || drawerThemeColors.dark
  const [isExpanded, setIsExpanded] = useState(true)
  const [isEditingName, setIsEditingName] = useState(false)
  const [editedName, setEditedName] = useState(group.name)

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsEditingName(true)
  }

  const handleNameSubmit = async () => {
    if (editedName.trim() && editedName !== group.name) {
      await updateWalletGroup(group.id, { name: editedName.trim() })
    }
    setIsEditingName(false)
  }

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameSubmit()
    } else if (e.key === 'Escape') {
      setEditedName(group.name)
      setIsEditingName(false)
    }
  }

  return (
    <div
      className={`${colors.groupCardBg} backdrop-blur-sm rounded-xl border ${colors.groupCardBorder} ${colors.groupCardHover} transition-all duration-200 overflow-hidden`}
    >
      {/* Group header */}
      <div className={`${colors.groupHeaderBg} px-3 py-3`}>
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 flex-1 text-left"
          >
            {/* Drag handle */}
            <div
              {...dragHandleProps}
              className={`cursor-move p-1.5 -ml-1 rounded-lg ${colors.walletCardHover} transition-colors`}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" className={colors.dragHandleColor}>
                <circle cx="3" cy="3" r="1.5" fill="currentColor" />
                <circle cx="9" cy="3" r="1.5" fill="currentColor" />
                <circle cx="3" cy="9" r="1.5" fill="currentColor" />
                <circle cx="9" cy="9" r="1.5" fill="currentColor" />
              </svg>
            </div>

            {/* Expand/collapse icon */}
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? '' : '-rotate-90'} text-text-secondary`}
            />

            {/* Group info */}
            <div className="flex-1 min-w-0">
              {isEditingName ? (
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  onBlur={handleNameSubmit}
                  onKeyDown={handleNameKeyDown}
                  onClick={(e) => e.stopPropagation()}
                  className={`font-medium px-2 py-1 bg-white/5 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/30 text-text-primary`}
                  autoFocus
                />
              ) : (
                <h3
                  className={`font-semibold text-text-primary truncate`}
                  onDoubleClick={handleDoubleClick}
                >
                  {group.name}
                </h3>
              )}
              <p className={`text-xs text-text-secondary mt-0.5`}>
                {(() => {
                  const evmCount = group.evmWalletCount || 0
                  const svmCount = group.svmWalletCount || 0

                  if (evmCount > 0 && svmCount > 0) {
                    const totalCount = evmCount + svmCount
                    return `Mixed • ${totalCount} Wallet${totalCount !== 1 ? 's' : ''} • ${evmCount} EVM / ${svmCount} SVM`
                  } else if (evmCount > 0) {
                    return `EVM • ${evmCount} Wallet${evmCount !== 1 ? 's' : ''}`
                  } else if (svmCount > 0) {
                    return `SVM • ${svmCount} Wallet${svmCount !== 1 ? 's' : ''}`
                  } else {
                    return `No wallets`
                  }
                })()}
              </p>
            </div>
          </button>

          {/* Group actions dropdown */}
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className={theme.styles.buttonIcon}>
                <MoreVertical className={`w-4 h-4 ${theme.styles.iconSecondary}`} />
              </button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
              <DropdownMenu.Content className={theme.styles.dropdown.content} sideOffset={5}>
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
                  className="flex items-center gap-2 px-3 py-2 text-sm text-accent hover:bg-accent/10 rounded cursor-pointer transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Group
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </div>

      {/* Expanded wallet list */}
      {isExpanded && (
        <div className="p-2 space-y-1.5">
          {wallets.length === 0 ? (
            <div className="p-4 text-center">
              <p className={`text-sm mb-3 text-text-tertiary`}>No wallets in this group yet</p>
              <button
                onClick={onAddWallet}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gradient-to-r ${colors.buttonPrimaryGradient} rounded-lg text-white font-medium shadow-md hover:shadow-lg transition-all hover:scale-105`}
              >
                <Plus className="w-3.5 h-3.5" />
                Add a wallet
              </button>
            </div>
          ) : (
            wallets.map((wallet) => (
              <GroupWalletItem
                key={wallet.id}
                wallet={wallet}
                isActive={wallet.id === activeWalletId}
                onSelectWallet={onSelectWallet}
                onCopyAddress={onCopyAddress}
                onRenameWallet={onRenameWallet}
                onDeleteWallet={onDeleteWallet}
                network={activeNetwork}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}

interface GroupWalletItemProps {
  wallet: any
  isActive: boolean
  onSelectWallet: (walletId: string) => void
  onCopyAddress: (address: string) => void
  onRenameWallet: (wallet: any) => void
  onDeleteWallet: (walletId: string) => void
  network?: any
}

function GroupWalletItem({
  wallet,
  isActive,
  onSelectWallet,
  onCopyAddress,
  onRenameWallet,
  onDeleteWallet,
  network,
}: GroupWalletItemProps) {
  const { themeName } = useTheme()
  const colors = drawerThemeColors[themeName] || drawerThemeColors.dark
  const [isEditingName, setIsEditingName] = useState(false)
  const [editedName, setEditedName] = useState(wallet.name)
  const { updateWallet } = useWalletStore()

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsEditingName(true)
  }

  const handleNameSubmit = async () => {
    if (editedName.trim() && editedName !== wallet.name) {
      await updateWallet(wallet.id, { name: editedName.trim() })
    }
    setIsEditingName(false)
  }

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameSubmit()
    } else if (e.key === 'Escape') {
      setEditedName(wallet.name)
      setIsEditingName(false)
    }
  }

  return (
    <div
      className={`group relative p-2.5 rounded-lg border transition-all duration-200 ${
        isActive
          ? `${colors.walletCardActiveBg} ${colors.walletCardActiveBorder} shadow-md ${colors.walletCardActiveGlow}`
          : `border-transparent ${colors.walletCardHover}`
      }`}
    >
      {/* Active indicator */}
      {isActive && (
        <div
          className={`absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-r-full ${colors.accentLine}`}
        />
      )}

      <div
        onClick={() => onSelectWallet(wallet.id)}
        className="flex items-center justify-between cursor-pointer"
      >
        <div className="flex-1 min-w-0 mr-2 pl-1">
          {isEditingName ? (
            <input
              type="text"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              onBlur={handleNameSubmit}
              onKeyDown={handleNameKeyDown}
              onClick={(e) => e.stopPropagation()}
              className={`text-sm font-medium px-2 py-1 bg-white/5 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/30 text-text-primary`}
              autoFocus
            />
          ) : (
            <p
              className={`text-sm font-medium text-text-primary`}
              onDoubleClick={handleDoubleClick}
            >
              {wallet.name}
            </p>
          )}
          <div className="flex items-center gap-2 mt-0.5">
            <p className={`text-xs text-text-secondary font-mono`}>
              {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onCopyAddress(wallet.address)
              }}
              className={`p-1 rounded-lg transition-all ${colors.walletCardHover} opacity-0 group-hover:opacity-100 hover:scale-110`}
              title="Copy address"
            >
              <Copy className={`w-3 h-3 text-text-secondary`} />
            </button>
            {network && (
              <a
                href={`${network.explorerUrl || network.explorer}/address/${wallet.address}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className={`p-1 rounded-lg transition-all ${colors.walletCardHover} opacity-0 group-hover:opacity-100 hover:scale-110`}
                title="View on explorer"
              >
                <ExternalLink className={`w-3 h-3 text-text-secondary`} />
              </a>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-xs px-1.5 py-0.5 rounded-md ${colors.walletCardBg} text-text-tertiary`}
          >
            {wallet.type}
          </span>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className={`p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-all ${colors.walletCardHover} hover:scale-110`}
              >
                <MoreVertical className={`w-3.5 h-3.5 text-text-secondary`} />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className={`min-w-[150px] ${colors.dropdownBg} backdrop-blur-xl rounded-xl shadow-2xl border ${colors.dropdownBorder} p-1.5 z-50 animate-in fade-in-0 zoom-in-95 duration-200`}
                sideOffset={5}
              >
                <DropdownMenu.Item
                  onClick={(e) => {
                    e.stopPropagation()
                    onCopyAddress(wallet.address)
                  }}
                  className={`flex items-center gap-2 px-3 py-2 text-sm text-text-primary ${colors.dropdownHover} rounded-lg cursor-pointer transition-colors`}
                >
                  <Copy className={`w-3.5 h-3.5`} />
                  Copy Address
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  onClick={(e) => {
                    e.stopPropagation()
                    onRenameWallet(wallet)
                  }}
                  className={`flex items-center gap-2 px-3 py-2 text-sm text-text-primary ${colors.dropdownHover} rounded-lg cursor-pointer transition-colors`}
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Rename
                </DropdownMenu.Item>
                <DropdownMenu.Separator className={`h-px ${colors.dropdownBorder} my-1.5`} />
                <DropdownMenu.Item
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeleteWallet(wallet.id)
                  }}
                  className={`flex items-center gap-2 px-3 py-2 text-sm ${colors.deleteText} ${colors.deleteHover} rounded-lg cursor-pointer transition-colors`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </div>
    </div>
  )
}
