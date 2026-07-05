/**
 * Code by Xipzer
 */

import React, { useState, useEffect } from 'react'
import * as Tabs from '@radix-ui/react-tabs'
import { Wallet, Users, Edit2, Plus, AlertCircle } from 'lucide-react'
import { useWalletStore } from '../../store/walletStore'
import { ChainType } from '../../types'
import {
  ModernDialog,
  ModernDialogHeader,
  ModernDialogSection,
  ModernDialogActions,
  ModernAlert,
  ModernInput,
  ModernButton,
  ModernToggle,
  ModernNumberInput,
} from '../ModernDialog'
import { WalletNameEditor } from './WalletNameEditor'
import { EVMWalletService } from '../../services/blockchain/evmWallet'
import { SVMWalletService } from '../../services/blockchain/svmWallet'

interface AddWalletToGroupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  groupId?: string
}

export function AddWalletToGroupDialog({ open, onOpenChange, groupId }: AddWalletToGroupDialogProps) {
  const { walletGroups, wallets, addWalletToGroup, addWalletsToGroup, password, exportGroupSeed } =
    useWalletStore()
  const [selectedGroupId, setSelectedGroupId] = useState('')
  const [walletName, setWalletName] = useState('')
  const [walletType, setWalletType] = useState<ChainType>('EVM')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedGroup, setSelectedGroup] = useState<(typeof walletGroups)[0] | null>(null)
  const [addMultiple, setAddMultiple] = useState(false)
  const [walletCount, setWalletCount] = useState(1)
  const [walletNames, setWalletNames] = useState<string[]>([])
  const [previewAddresses, setPreviewAddresses] = useState<string[]>([])
  const [showNameEditor, setShowNameEditor] = useState(false)

  const compatibleGroups = walletGroups.filter((g) => g.id !== 'default-imported')

  const getExistingTypeCount = (gId: string, type: ChainType) =>
    wallets.filter((w) => w.groupId === gId && w.type === type).length

  const defaultName = (group: { name: string }, type: ChainType, offset: number) =>
    `${group.name} - ${type} #${offset + 1}`

  useEffect(() => {
    if (!open) return
    const targetGroupId = groupId || selectedGroupId
    if (!targetGroupId) return

    setSelectedGroupId(targetGroupId)
    const group = walletGroups.find((g) => g.id === targetGroupId)
    if (group) {
      setSelectedGroup(group)
      if (!addMultiple) {
        setWalletName(
          defaultName(group, walletType, getExistingTypeCount(targetGroupId, walletType)),
        )
      }
    }
  }, [open, groupId, selectedGroupId, walletGroups, wallets, walletType])

  const handleClose = () => {
    setWalletName('')
    setSelectedGroupId(groupId || '')
    setError('')
    setAddMultiple(false)
    setWalletCount(1)
    setWalletNames([])
    setPreviewAddresses([])
    setShowNameEditor(false)
    onOpenChange(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedGroupId) return
    if (!addMultiple && !walletName.trim()) return

    setIsLoading(true)
    setError('')

    try {
      if (addMultiple) {
        const existingCount = getExistingTypeCount(selectedGroupId, walletType)
        const specs = Array.from({ length: walletCount }, (_, i) => ({
          name:
            walletNames[i] ||
            `${selectedGroup?.name || 'Wallet'} - ${walletType} #${existingCount + i + 1}`,
          type: walletType,
        }))
        await addWalletsToGroup(selectedGroupId, specs)
      } else {
        await addWalletToGroup(selectedGroupId, walletName.trim(), walletType)
      }
      handleClose()
    } catch (err) {
      console.error('Failed to add wallet to group:', err)
      setError(err instanceof Error ? err.message : 'Failed to add wallet')
    } finally {
      setIsLoading(false)
    }
  }

  const handleTypeChange = (newType: ChainType) => {
    setWalletType(newType)
    if (selectedGroup && !addMultiple) {
      setWalletName(
        defaultName(selectedGroup, newType, getExistingTypeCount(selectedGroup.id, newType)),
      )
    }
  }

  const handleEditNames = async () => {
    const existingCount = getExistingTypeCount(selectedGroupId, walletType)
    const names = Array.from(
      { length: walletCount },
      (_, i) => `${selectedGroup?.name || 'Wallet'} - ${walletType} #${existingCount + i + 1}`,
    )
    setWalletNames(names)

    const addresses: string[] = []
    if (password && selectedGroupId) {
      try {
        const seed = await exportGroupSeed(selectedGroupId, password)
        const derive =
          walletType === 'EVM'
            ? EVMWalletService.deriveWalletFromSeed
            : SVMWalletService.deriveWalletFromSeed
        for (let i = 0; i < walletCount; i++) {
          const w = await derive(seed, existingCount + i)
          addresses.push(w.address)
        }
      } catch {
        /* preview is best-effort; ignore derivation failures */
      }
    }
    setPreviewAddresses(addresses)
    setShowNameEditor(true)
  }

  const handleSelectGroup = (group: (typeof walletGroups)[0]) => {
    setSelectedGroupId(group.id)
    setSelectedGroup(group)
    if (!addMultiple) {
      setWalletName(defaultName(group, walletType, getExistingTypeCount(group.id, walletType)))
    }
  }

  if (showNameEditor) {
    const existingCount = getExistingTypeCount(selectedGroupId, walletType)
    return (
      <WalletNameEditor
        open={open}
        onOpenChange={onOpenChange}
        walletNames={walletNames}
        addresses={previewAddresses}
        onUpdateName={(i, name) => {
          const next = [...walletNames]
          next[i] = name
          setWalletNames(next)
        }}
        onClose={handleClose}
        onBack={() => setShowNameEditor(false)}
        subtitle={`${walletCount} ${walletType} wallets`}
        getLabel={(i) => `${walletType} #${existingCount + i + 1}`}
      />
    )
  }

  if (compatibleGroups.length === 0) {
    return (
      <ModernDialog open={open} onOpenChange={onOpenChange} width="md">
        <ModernDialogHeader
          icon={<Plus className="w-5 h-5" />}
          title="Add Wallet"
          onClose={handleClose}
        />
        <ModernDialogSection className="py-8 text-center">
          <div className="p-4 rounded-full bg-white/5 inline-block mb-4">
            <Users className="w-8 h-8 text-text-tertiary" />
          </div>
          <p className="text-sm sm:text-base text-text-secondary mb-2">No wallet groups found.</p>
          <p className="text-xs sm:text-sm text-text-tertiary">
            Create a new group first to add wallets.
          </p>
        </ModernDialogSection>
      </ModernDialog>
    )
  }

  return (
    <ModernDialog open={open} onOpenChange={onOpenChange} width="md">
      <ModernDialogHeader
        icon={<Plus className="w-5 h-5" />}
        title={addMultiple ? 'Add Multiple Wallets' : 'Add Wallet'}
        subtitle={selectedGroup ? 'Derive new wallet from group' : undefined}
        onClose={handleClose}
      />

      <form onSubmit={handleSubmit} id="add-wallet-form">
        <ModernDialogSection className="space-y-4 pb-4">
          <Tabs.Root
            value={walletType}
            onValueChange={(value) => handleTypeChange(value as ChainType)}
          >
            <Tabs.List className="flex p-1 bg-white/5 rounded-xl border border-white/10">
              {(['EVM', 'SVM'] as const).map((t) => (
                <Tabs.Trigger
                  key={t}
                  value={t}
                  className="flex-1 py-2.5 text-sm font-medium rounded-lg text-text-secondary transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-accent-500 data-[state=active]:to-accent-600 data-[state=active]:text-white data-[state=active]:shadow-lg"
                >
                  {t}
                </Tabs.Trigger>
              ))}
            </Tabs.List>
          </Tabs.Root>

          {selectedGroup && (
            <div className="space-y-1.5 sm:space-y-2">
              <label className="block text-xs sm:text-sm font-medium text-text-secondary">
                Adding to Group
              </label>
              <div className="p-3 sm:p-4 bg-white/5 border border-white/10 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-accent-500/10">
                    <Users className="w-4 h-4 text-accent-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-text-primary text-sm sm:text-base">
                      {selectedGroup.name}
                    </p>
                    <p className="text-2xs sm:text-xs text-text-tertiary">
                      {(() => {
                        const evmCount = selectedGroup.evmWalletCount || 0
                        const svmCount = selectedGroup.svmWalletCount || 0
                        if (evmCount > 0 && svmCount > 0)
                          return `${evmCount + svmCount} Wallets - ${evmCount} EVM / ${svmCount} SVM`
                        if (evmCount > 0)
                          return `${evmCount} EVM Wallet${evmCount !== 1 ? 's' : ''}`
                        if (svmCount > 0)
                          return `${svmCount} SVM Wallet${svmCount !== 1 ? 's' : ''}`
                        return 'No wallets yet'
                      })()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!groupId && (
            <div className="space-y-1.5 sm:space-y-2">
              <label className="block text-xs sm:text-sm font-medium text-text-secondary">
                Select Group
              </label>
              <div className="grid grid-cols-1 gap-2 max-h-[180px] overflow-y-auto pr-1">
                {compatibleGroups.map((group) => (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => handleSelectGroup(group)}
                    className={`w-full p-3 rounded-xl border text-left transition-all ${
                      selectedGroupId === group.id
                        ? 'bg-accent-500/10 border-accent-500/50 ring-1 ring-accent-500/30'
                        : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Users
                        className={`w-4 h-4 ${selectedGroupId === group.id ? 'text-accent-500' : 'text-text-secondary'}`}
                      />
                      <span
                        className={`text-sm font-medium ${selectedGroupId === group.id ? 'text-accent-500' : 'text-text-primary'}`}
                      >
                        {group.name}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <ModernToggle
            checked={addMultiple}
            onChange={(checked) => {
              setAddMultiple(checked)
              if (!checked) {
                setWalletCount(1)
                setWalletNames([])
              }
            }}
            label="Add Multiple Wallets"
            description="Create several wallets at once"
          />

          <div className="border-t border-white/5" />

          {addMultiple ? (
            <div className="space-y-4">
              <ModernNumberInput
                label="Number of Wallets"
                value={walletCount}
                onChange={setWalletCount}
                min={1}
                max={99}
              />
              <button
                type="button"
                onClick={handleEditNames}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-text-secondary hover:bg-white/10 hover:text-text-primary transition-all"
              >
                <Edit2 className="w-4 h-4" />
                Edit Names
              </button>
              <p className="text-xs text-text-tertiary">
                {walletNames.length > 0 ? 'Custom names configured' : 'Default names will be used'}
              </p>
            </div>
          ) : (
            <ModernInput
              label="Wallet Name"
              type="text"
              value={walletName}
              onChange={(e) => setWalletName(e.target.value)}
              placeholder="e.g., Trading Wallet #1"
              autoFocus
            />
          )}

          {error && (
            <ModernAlert type="error" icon={<AlertCircle className="w-4 h-4" />}>
              {error}
            </ModernAlert>
          )}
        </ModernDialogSection>

        <ModernDialogActions>
          <ModernButton variant="secondary" fullWidth onClick={handleClose} type="button">
            Cancel
          </ModernButton>
          <ModernButton
            variant="primary"
            fullWidth
            disabled={!selectedGroupId || (!addMultiple && !walletName.trim())}
            loading={isLoading}
            type="submit"
            icon={<Wallet className="w-4 h-4" />}
          >
            {addMultiple ? `Add ${walletCount} Wallets` : 'Add Wallet'}
          </ModernButton>
        </ModernDialogActions>
      </form>
    </ModernDialog>
  )
}