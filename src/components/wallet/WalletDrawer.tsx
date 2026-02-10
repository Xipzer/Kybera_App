/**
 * Code by Xipzer
 */

import { useEffect, useMemo, useRef, useState } from 'react'
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
} from 'lucide-react'
import { useWalletStore } from '../../store/walletStore'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import * as Tabs from '@radix-ui/react-tabs'

import { MultiNetworkSelector } from './MultiNetworkSelector'
import { ExecutionNetworkSelector } from './ExecutionNetworkSelector'
import { ImportWalletDialog } from './ImportWalletDialog'
import { EmptyState } from '../common/EmptyState'
import { RenameWalletDialog } from './RenameWalletDialog'
import { CreateGroupDialog } from './CreateGroupDialog'
import { AddWalletToGroupDialog } from './AddWalletToGroupDialog'
import { ExportGroupDialog } from './ExportGroupDialog'
import { ExportWalletDialog } from './ExportWalletDialog'
import { ImportGroupDialog } from './ImportGroupDialog'
import { WalletDetailView } from './WalletDetailView'

import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { useTheme } from '../../hooks/useTheme'
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard'
import { useUIStore } from '../../store/uiStore'
import { formatAddress, formatUSD } from '../../utils/formatters'
import { useWalletListBalances } from '../../hooks/useWalletListBalances'

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

const restrictToVerticalAxis = ({
  transform,
}: {
  transform: { x: number; y: number; scaleX: number; scaleY: number }
}) => {
  return {
    ...transform,
    x: 0,
  }
}

function CollapsedParticles({ color, opacity = 0.6 }: { color: string; opacity?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()

    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    const particles: { x: number; y: number; vx: number; vy: number; size: number; opacity: number }[] = []
    const particleCount = 40

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 1.5 + 0.5,
        opacity: (Math.random() * 0.4 + 0.1) * opacity,
      })
    }

    let animationId: number
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      particles.forEach((p, i) => {
        p.x += p.vx
        p.y += p.vy

        if (p.x < 0 || p.x > canvas.width) p.vx *= -1
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${color}, ${p.opacity})`
        ctx.fill()

        particles.slice(i + 1).forEach((p2) => {
          const dx = p.x - p2.x
          const dy = p.y - p2.y
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist < 100) {
            ctx.beginPath()
            ctx.moveTo(p.x, p.y)
            ctx.lineTo(p2.x, p2.y)
            ctx.strokeStyle = `rgba(${color}, ${0.06 * opacity * (1 - dist / 100)})`
            ctx.stroke()
          }
        })
      })

      animationId = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      ro.disconnect()
      cancelAnimationFrame(animationId)
    }
  }, [color, opacity])

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
}

interface WalletDrawerProps {
  onToggle?: () => void
  collapsed?: boolean
  isMobilePanel?: boolean
  onCollapse?: () => void
}

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
  const { particlesApp } = useUIStore()
  const [isWalletListCollapsed, setIsWalletListCollapsed] = useState(false)
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
  const [exportWallet, setExportWallet] = useState<(typeof wallets)[0] | null>(null)
  const [showImportGroupDialog, setShowImportGroupDialog] = useState(false)
  const { theme } = useTheme()

  const walletStyles = theme.styles.wallet

  const actualGroups = useMemo(
    () =>
      walletGroups
        .filter((g) => g.id !== 'default-imported')
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [walletGroups],
  )

  const sortedWallets = useMemo(() => {
    const sorted = [...wallets].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    return {
      all: sorted,
      EVM: sorted.filter((w) => w.type === 'EVM'),
      SVM: sorted.filter((w) => w.type === 'SVM'),
    }
  }, [wallets])

  const walletsByType = sortedWallets
  const walletBalances = useWalletListBalances(wallets)

  const groupTotals = useMemo(() => {
    const totals = new Map<string, number>()
    for (const group of actualGroups) {
      const groupWallets = wallets.filter((w) => w.groupId === group.id)
      totals.set(group.id, groupWallets.reduce((sum, w) => sum + (walletBalances.get(w.id) || 0), 0))
    }
    return totals
  }, [actualGroups, wallets, walletBalances])

  const tabTotals = useMemo(() => {
    const all = wallets.reduce((sum, w) => sum + (walletBalances.get(w.id) || 0), 0)
    return {
      groups: all,
      evm: walletsByType.EVM.reduce((sum, w) => sum + (walletBalances.get(w.id) || 0), 0),
      svm: walletsByType.SVM.reduce((sum, w) => sum + (walletBalances.get(w.id) || 0), 0),
      all,
    }
  }, [walletsByType, walletBalances, wallets])

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

      if (activeWallet && overWallet && activeWallet.type === overWallet.type) {
        const oldIndex = sortedWallets.all.findIndex((w) => w.id === active.id)
        const newIndex = sortedWallets.all.findIndex((w) => w.id === over.id)

        if (oldIndex !== -1 && newIndex !== -1) {
          await reorderWallets(arrayMove(sortedWallets.all, oldIndex, newIndex).map((w) => w.id))
        }
      }
    }
  }

  const { copy: copyToClipboard } = useCopyToClipboard()
  const copyAddress = (address: string) => copyToClipboard(address)

  const handleExportWallet = (wallet: (typeof wallets)[0]) => {
    setExportWallet(wallet)
  }

  const panelGroupRef = useRef<HTMLDivElement>(null)
  const tabBarRef = useRef<HTMLDivElement>(null)
  const [listMinPct, setListMinPct] = useState(15)
  const listPanelRef = useRef<any>(null)
  const detailPanelRef = useRef<any>(null)

  useEffect(() => {
    if (isWalletListCollapsed) {
      listPanelRef.current?.collapse()
    } else {
      listPanelRef.current?.expand()
    }
  }, [isWalletListCollapsed])

  useEffect(() => {
    if (activeWalletId) {
      listPanelRef.current?.resize(50)
      detailPanelRef.current?.expand()
    } else {
      detailPanelRef.current?.collapse()
      listPanelRef.current?.resize(100)
    }
  }, [activeWalletId])

  useEffect(() => {
    const update = () => {
      const panelGroupEl = panelGroupRef.current
      const tabBarEl = tabBarRef.current
      if (!panelGroupEl || !tabBarEl) return

      const panelGroupHeight = panelGroupEl.offsetHeight
      if (panelGroupHeight <= 0) return

      const pct = (tabBarEl.offsetHeight / panelGroupHeight) * 100
      setListMinPct(Math.max(5, Math.min(Math.ceil(pct), 60)))
    }

    update()
    const observer = new ResizeObserver(update)
    if (panelGroupRef.current) observer.observe(panelGroupRef.current)
    return () => observer.disconnect()
  }, [])

  if (collapsed) {
    const unlockStyles = theme.styles.unlockScreen
    return (
      <div className="h-full w-full border-l border-border-subtle panel-content-fade-right relative overflow-hidden bg-surface-base">
        {particlesApp && (
          <>
            <CollapsedParticles
              color={unlockStyles.particleColor}
              opacity={unlockStyles.particleOpacity ?? 0.6}
            />
            <div
              className="absolute inset-0 pointer-events-none opacity-30"
              style={{
                background: `radial-gradient(ellipse at 50% 0%, rgba(${unlockStyles.particleColor}, 0.15), transparent 70%)`,
              }}
            />
          </>
        )}
        <div className="relative z-10 flex flex-col items-center pt-3 pb-4 h-full gap-3">
          <button
            onClick={lock}
            className={`${theme.styles.buttonIcon} p-2 rounded-lg`}
            title="Lock wallet"
          >
            <Lock className="w-4 h-4 text-text-secondary" />
          </button>
          <ExecutionNetworkSelector collapsed />
        </div>
      </div>
    )
  }

  const dialogs = (
    <>
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
      <ExportWalletDialog
        open={exportWallet !== null}
        onOpenChange={(open) => !open && setExportWallet(null)}
        wallet={exportWallet}
      />
      <ImportGroupDialog open={showImportGroupDialog} onOpenChange={setShowImportGroupDialog} />
    </>
  )

  const walletListHeader = (
    <div
      className={`p-4 flex-shrink-0 ${theme.styles.panelHeader} ${isWalletListCollapsed ? `border-b border-border-subtle` : ''}`}
    >
      <div className={`flex items-center justify-between ${isWalletListCollapsed ? '' : 'mb-4'}`}>
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${walletStyles.titleIconBg}`}>
            <WalletIcon className="w-4 h-4 text-white" />
          </div>
          <h2
            className={`text-lg font-semibold bg-gradient-to-r ${walletStyles.titleGradient} bg-clip-text text-transparent`}
          >
            Wallets
          </h2>
          <button
            onClick={() => setIsWalletListCollapsed(!isWalletListCollapsed)}
            className={`${theme.styles.buttonIcon} p-2 rounded-lg touch-manipulation`}
            title={isWalletListCollapsed ? 'Expand wallets' : 'Collapse wallets'}
          >
            <ChevronDown
              className={`w-4 h-4 text-text-secondary ${isWalletListCollapsed ? '' : 'rotate-180'}`}
            />
          </button>
        </div>
        <button
          onClick={lock}
          className={`${theme.styles.buttonIcon} p-2 rounded-lg touch-manipulation`}
          title="Lock wallet"
        >
          <Lock className="w-4 h-4 text-text-secondary" />
        </button>
      </div>

      {!isWalletListCollapsed && (
        <>
          <div className="space-y-3">
            <MultiNetworkSelector />
            <ExecutionNetworkSelector />
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex gap-2">
              <button
                onClick={() => setShowCreateGroupDialog(true)}
                className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-3 bg-gradient-to-r ${walletStyles.buttonPrimaryGradient} rounded-xl font-medium text-white text-sm sm:text-base shadow-lg ${walletStyles.buttonPrimaryShadow} transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] touch-manipulation`}
              >
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
                New Group
              </button>

              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button
                    className={`${theme.styles.buttonSecondary} flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base touch-manipulation`}
                    style={theme.dynamicStyles.buttonSecondary}
                  >
                    <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
                    Import
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content
                    className={`${theme.styles.dropdown.content} z-[9999]`}
                    sideOffset={5}
                    side="bottom"
                    avoidCollisions={true}
                    collisionPadding={16}
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
        </>
      )}
    </div>
  )

  const walletListContent = (
    <Tabs.Root defaultValue="groups" className="flex-1 flex flex-col min-h-0">
      <Tabs.List ref={tabBarRef} className={`${theme.styles.tabs.list} flex-shrink-0`}>
        <Tabs.Trigger value="groups" className={theme.styles.tabs.trigger}>
          <span>Groups ({actualGroups.length})</span>
          <span className={`block text-xs font-medium bg-gradient-to-r ${walletStyles.titleGradient} bg-clip-text text-transparent`}>{formatUSD(tabTotals.groups)}</span>
        </Tabs.Trigger>
        <Tabs.Trigger value="evm" className={theme.styles.tabs.trigger}>
          <span>EVM ({walletsByType.EVM.length})</span>
          <span className={`block text-xs font-medium bg-gradient-to-r ${walletStyles.titleGradient} bg-clip-text text-transparent`}>{formatUSD(tabTotals.evm)}</span>
        </Tabs.Trigger>
        <Tabs.Trigger value="svm" className={theme.styles.tabs.trigger}>
          <span>SVM ({walletsByType.SVM.length})</span>
          <span className={`block text-xs font-medium bg-gradient-to-r ${walletStyles.titleGradient} bg-clip-text text-transparent`}>{formatUSD(tabTotals.svm)}</span>
        </Tabs.Trigger>
        <Tabs.Trigger value="all" className={theme.styles.tabs.trigger}>
          <span>All ({wallets.length})</span>
          <span className={`block text-xs font-medium bg-gradient-to-r ${walletStyles.titleGradient} bg-clip-text text-transparent`}>{formatUSD(tabTotals.all)}</span>
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
                        groupTotalUSD={groupTotals.get(group.id)}
                        walletBalances={walletBalances}
                      />
                    ))}
                  </SortableContext>
                </DndContext>

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
                            totalUSD={walletBalances.get(wallet.id)}
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
                        totalUSD={walletBalances.get(wallet.id)}
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
                        totalUSD={walletBalances.get(wallet.id)}
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
                          totalUSD={walletBalances.get(wallet.id)}
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
                          totalUSD={walletBalances.get(wallet.id)}
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
  )

  return (
    <div
      className={`h-full ${theme.styles.drawerContainer} panel-content-fade-right relative overflow-hidden`}
    >
      {particlesApp && (
        <>
          <CollapsedParticles
            color={theme.styles.unlockScreen.particleColor}
            opacity={theme.styles.unlockScreen.particleOpacity ?? 0.6}
          />
          <div
            className="absolute inset-0 pointer-events-none opacity-30"
            style={{
              background: `radial-gradient(ellipse at 50% 0%, rgba(${theme.styles.unlockScreen.particleColor}, 0.15), transparent 70%)`,
            }}
          />
        </>
      )}
      <div className="h-full flex flex-col relative z-10">
        <div className="flex-shrink-0">
          {walletListHeader}
        </div>
        <div ref={panelGroupRef} className="flex-1 min-h-0">
          <PanelGroup direction="vertical" className="h-full">
            <Panel
              ref={listPanelRef}
              id="wallet-list"
              defaultSize={activeWalletId ? 50 : 100}
              minSize={listMinPct}
              collapsible
              collapsedSize={0}
              className="flex flex-col"
            >
              {walletListContent}
              {dialogs}
            </Panel>

            <PanelResizeHandle
              className={`h-px transition-colors ${theme.styles.resizeHandle} ${theme.styles.resizeHandleHover}`}
              disabled={isWalletListCollapsed || !activeWalletId}
            />
            <Panel
              ref={detailPanelRef}
              id="wallet-detail"
              defaultSize={activeWalletId ? 50 : 0}
              minSize={20}
              collapsible
              collapsedSize={0}
            >
              <WalletDetailView />
            </Panel>
          </PanelGroup>
        </div>
      </div>
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
  totalUSD?: number
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
  totalUSD,
}: WalletItemProps) {
  const { theme } = useTheme()
  const walletStyles = theme.styles.wallet
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
          ? `${walletStyles.walletCardActiveBg} ${walletStyles.walletCardActiveBorder} shadow-lg ${walletStyles.walletCardActiveGlow}`
          : `${walletStyles.walletCardBg} ${walletStyles.walletCardBorder} ${walletStyles.walletCardHover}`
      }`}
      onClick={onSelect}
    >
      {isActive && (
        <div
          className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full ${walletStyles.accentLine}`}
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
                className={`font-medium px-2 py-1 bg-white/5 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500/30 text-text-primary`}
                autoFocus
              />
            ) : (
              <h4 className={`font-medium text-text-primary`} onDoubleClick={handleDoubleClick}>
                {wallet.name}
              </h4>
            )}
            {totalUSD !== undefined && totalUSD > 0 && (
              <span className="text-xs text-text-tertiary">• {formatUSD(totalUSD)}</span>
            )}
            {wallet.isImported && (
              <span
                className={`text-xs px-1.5 py-0.5 rounded-md ${walletStyles.walletCardBg} text-text-tertiary`}
              >
                Imported
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <p className={`text-sm text-text-secondary font-mono`}>
              {formatAddress(wallet.address)}
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onCopy()
              }}
              className={`p-1 rounded-lg transition-all ${walletStyles.walletCardHover} opacity-0 group-hover:opacity-100 hover:scale-110`}
              title="Copy address"
            >
              <Copy className={`w-3 h-3 text-text-secondary`} />
            </button>
            {network && (
              <a
                href={`${network.explorerUrl}/address/${wallet.address}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className={`p-1 rounded-lg transition-all ${walletStyles.walletCardHover} opacity-0 group-hover:opacity-100 hover:scale-110`}
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
            <DropdownMenu.Content
              className={`${theme.styles.dropdown.content} z-[9999]`}
              sideOffset={5}
              side="bottom"
              avoidCollisions={true}
              collisionPadding={16}
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
  groupTotalUSD?: number
  walletBalances?: Map<string, number>
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
  groupTotalUSD,
  walletBalances,
}: WalletGroupItemProps) {
  const { removeWalletGroup, updateWalletGroup, activeNetwork } = useWalletStore()
  const { theme } = useTheme()
  const walletStyles = theme.styles.wallet

  const [isExpanded, setIsExpanded] = useState(wallets.some((w) => w.id === activeWalletId))
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
      className={`${walletStyles.groupCardBg} backdrop-blur-sm rounded-xl border ${walletStyles.groupCardBorder} ${walletStyles.groupCardHover} transition-all duration-200 overflow-hidden`}
    >
      <div className={`${walletStyles.groupHeaderBg} px-3 py-3`}>
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 flex-1 text-left"
          >
            <div
              {...dragHandleProps}
              className={`cursor-move p-1.5 -ml-1 rounded-lg ${walletStyles.walletCardHover} transition-colors`}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                className={walletStyles.dragHandleColor}
              >
                <circle cx="3" cy="3" r="1.5" fill="currentColor" />
                <circle cx="9" cy="3" r="1.5" fill="currentColor" />
                <circle cx="3" cy="9" r="1.5" fill="currentColor" />
                <circle cx="9" cy="9" r="1.5" fill="currentColor" />
              </svg>
            </div>

            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? '' : '-rotate-90'} text-text-secondary`}
            />

            <div className="flex-1 min-w-0">
              {isEditingName ? (
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  onBlur={handleNameSubmit}
                  onKeyDown={handleNameKeyDown}
                  onClick={(e) => e.stopPropagation()}
                  className={`font-medium px-2 py-1 bg-white/5 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500/30 text-text-primary`}
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
                  const usdSuffix = groupTotalUSD && groupTotalUSD > 0 ? ` • ${formatUSD(groupTotalUSD)}` : ''

                  if (evmCount > 0 && svmCount > 0) {
                    const totalCount = evmCount + svmCount
                    return `Mixed • ${totalCount} Wallet${totalCount !== 1 ? 's' : ''} • ${evmCount} EVM / ${svmCount} SVM${usdSuffix}`
                  } else if (evmCount > 0) {
                    return `EVM • ${evmCount} Wallet${evmCount !== 1 ? 's' : ''}${usdSuffix}`
                  } else if (svmCount > 0) {
                    return `SVM • ${svmCount} Wallet${svmCount !== 1 ? 's' : ''}${usdSuffix}`
                  } else {
                    return `No wallets`
                  }
                })()}
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
                className={`${theme.styles.dropdown.content} z-[9999]`}
                sideOffset={5}
                side="bottom"
                avoidCollisions={true}
                collisionPadding={16}
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

      {isExpanded && (
        <div className="p-2 space-y-1.5">
          {wallets.length === 0 ? (
            <div className="p-4 text-center">
              <p className={`text-sm mb-3 text-text-tertiary`}>No wallets in this group yet</p>
              <button
                onClick={onAddWallet}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gradient-to-r ${walletStyles.buttonPrimaryGradient} rounded-lg text-white font-medium shadow-md hover:shadow-lg transition-all hover:scale-105`}
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
                totalUSD={walletBalances?.get(wallet.id)}
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
  totalUSD?: number
}

function GroupWalletItem({
  wallet,
  isActive,
  onSelectWallet,
  onCopyAddress,
  onRenameWallet,
  onDeleteWallet,
  network,
  totalUSD,
}: GroupWalletItemProps) {
  const { theme } = useTheme()
  const walletStyles = theme.styles.wallet
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
          ? `${walletStyles.walletCardActiveBg} ${walletStyles.walletCardActiveBorder} shadow-md ${walletStyles.walletCardActiveGlow}`
          : `border-transparent ${walletStyles.walletCardHover}`
      }`}
    >
      {isActive && (
        <div
          className={`absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-r-full ${walletStyles.accentLine}`}
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
              className={`text-sm font-medium px-2 py-1 bg-white/5 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500/30 text-text-primary`}
              autoFocus
            />
          ) : (
            <div className="flex items-center gap-2">
              <p
                className={`text-sm font-medium text-text-primary`}
                onDoubleClick={handleDoubleClick}
              >
                {wallet.name}
              </p>
              {totalUSD !== undefined && totalUSD > 0 && (
                <span className="text-xs text-text-tertiary">• {formatUSD(totalUSD)}</span>
              )}
            </div>
          )}
          <div className="flex items-center gap-2 mt-0.5">
            <p className={`text-xs text-text-secondary font-mono`}>
              {formatAddress(wallet.address)}
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onCopyAddress(wallet.address)
              }}
              className={`p-1 rounded-lg transition-all ${walletStyles.walletCardHover} opacity-0 group-hover:opacity-100 hover:scale-110`}
              title="Copy address"
            >
              <Copy className={`w-3 h-3 text-text-secondary`} />
            </button>
            {network && (
              <a
                href={`${network.explorerUrl}/address/${wallet.address}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className={`p-1 rounded-lg transition-all ${walletStyles.walletCardHover} opacity-0 group-hover:opacity-100 hover:scale-110`}
                title="View on explorer"
              >
                <ExternalLink className={`w-3 h-3 text-text-secondary`} />
              </a>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-xs px-1.5 py-0.5 rounded-md ${walletStyles.walletCardBg} text-text-tertiary`}
          >
            {wallet.type}
          </span>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className={`p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-all ${walletStyles.walletCardHover} hover:scale-110`}
              >
                <MoreVertical className={`w-3.5 h-3.5 text-text-secondary`} />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className={`${theme.styles.dropdown.content} backdrop-blur-xl z-[9999] animate-in fade-in-0 zoom-in-95 duration-200`}
                sideOffset={5}
                side="bottom"
                avoidCollisions={true}
                collisionPadding={16}
              >
                <DropdownMenu.Item
                  onClick={(e) => {
                    e.stopPropagation()
                    onCopyAddress(wallet.address)
                  }}
                  className={`${theme.styles.dropdown.item} ${theme.styles.dropdown.itemHover}`}
                >
                  <Copy className={`w-3.5 h-3.5`} />
                  Copy Address
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  onClick={(e) => {
                    e.stopPropagation()
                    onRenameWallet(wallet)
                  }}
                  className={`${theme.styles.dropdown.item} ${theme.styles.dropdown.itemHover}`}
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Rename
                </DropdownMenu.Item>
                <DropdownMenu.Separator className={theme.styles.dropdown.separator} />
                <DropdownMenu.Item
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeleteWallet(wallet.id)
                  }}
                  className={`${theme.styles.dropdown.item} ${walletStyles.deleteText} ${walletStyles.deleteHover}`}
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