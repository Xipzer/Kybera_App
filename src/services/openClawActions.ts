/**
 * Code by Xipzer
 */

import { useWalletStore } from '../store/walletStore'
import { useSettingsStore } from '../store/settingsStore'
import { blockchainService } from './blockchain/blockchainService'
import { swapService } from './api/swapService'
import { EVM_NETWORKS, SVM_NETWORKS, getNetworksByType } from '../utils/networks'
import { PendingAction, RiskLevel, ActionCategory } from '../types/aiActions'
import { ChainType } from '../types'

export interface ToolDefinition {
  name: string
  description: string
  parameters: {
    type: 'object'
    properties: Record<string, { type: string; description: string; enum?: string[] }>
    required: string[]
  }
  category: ActionCategory
  riskLevel: RiskLevel
  requiresConfirmation: boolean
}

export interface ActionResult {
  success: boolean
  message: string
  data?: Record<string, unknown>
  error?: string
}

type ActionHandler = (params: Record<string, unknown>) => Promise<ActionResult>

const actionHandlers: Record<string, ActionHandler> = {
  create_wallet_group: async (params) => {
    const { name, evmCount = 0, svmCount = 0, walletNames } = params as {
      name: string
      evmCount?: number
      svmCount?: number
      walletNames?: string[]
    }

    const { password, createWalletGroup, addWalletsToGroup } = useWalletStore.getState()
    if (!password) return { success: false, message: 'Wallet is locked', error: 'LOCKED' }

    try {
      const group = await createWalletGroup(name, password)

      const specs: { name: string; type: ChainType }[] = []
      let walletIndex = 0

      for (let i = 0; i < evmCount; i++) {
        specs.push({
          name: walletNames?.[walletIndex++] || `${name} - EVM #${i + 1}`,
          type: 'EVM',
        })
      }
      for (let i = 0; i < svmCount; i++) {
        specs.push({
          name: walletNames?.[walletIndex++] || `${name} - SVM #${i + 1}`,
          type: 'SVM',
        })
      }

      if (specs.length > 0) await addWalletsToGroup(group.id, specs)

      return {
        success: true,
        message: `Created wallet group "${name}" with ${evmCount} EVM and ${svmCount} SVM wallets`,
        data: { groupId: group.id, groupName: group.name, walletsCreated: specs.length },
      }
    } catch (error) {
      return { success: false, message: 'Failed to create wallet group', error: String(error) }
    }
  },

  add_wallets_to_group: async (params) => {
    const { groupId, wallets } = params as {
      groupId: string
      wallets: { name: string; type: 'EVM' | 'SVM' }[]
    }

    const { password, addWalletsToGroup, walletGroups } = useWalletStore.getState()
    if (!password) return { success: false, message: 'Wallet is locked', error: 'LOCKED' }

    const group = walletGroups.find((g) => g.id === groupId || g.name.toLowerCase() === groupId.toLowerCase())
    if (!group) return { success: false, message: `Group "${groupId}" not found`, error: 'NOT_FOUND' }

    try {
      const newWallets = await addWalletsToGroup(group.id, wallets)
      return {
        success: true,
        message: `Added ${newWallets.length} wallets to "${group.name}"`,
        data: { wallets: newWallets.map((w) => ({ id: w.id, name: w.name, address: w.address, type: w.type })) },
      }
    } catch (error) {
      return { success: false, message: 'Failed to add wallets', error: String(error) }
    }
  },

  rename_wallet: async (params) => {
    const { walletId, newName } = params as { walletId: string; newName: string }
    const { wallets, updateWallet } = useWalletStore.getState()

    const wallet = wallets.find(
      (w) => w.id === walletId || w.name.toLowerCase() === walletId.toLowerCase() || w.address.toLowerCase() === walletId.toLowerCase()
    )
    if (!wallet) return { success: false, message: `Wallet "${walletId}" not found`, error: 'NOT_FOUND' }

    try {
      await updateWallet(wallet.id, { name: newName })
      return { success: true, message: `Renamed wallet to "${newName}"`, data: { walletId: wallet.id, oldName: wallet.name, newName } }
    } catch (error) {
      return { success: false, message: 'Failed to rename wallet', error: String(error) }
    }
  },

  rename_wallet_group: async (params) => {
    const { groupId, newName } = params as { groupId: string; newName: string }
    const { walletGroups, updateWalletGroup } = useWalletStore.getState()

    const group = walletGroups.find((g) => g.id === groupId || g.name.toLowerCase() === groupId.toLowerCase())
    if (!group) return { success: false, message: `Group "${groupId}" not found`, error: 'NOT_FOUND' }

    try {
      await updateWalletGroup(group.id, { name: newName })
      return { success: true, message: `Renamed group to "${newName}"`, data: { groupId: group.id, oldName: group.name, newName } }
    } catch (error) {
      return { success: false, message: 'Failed to rename group', error: String(error) }
    }
  },

  delete_wallet: async (params) => {
    const { walletId } = params as { walletId: string }
    const { wallets, removeWallet } = useWalletStore.getState()

    const wallet = wallets.find(
      (w) => w.id === walletId || w.name.toLowerCase() === walletId.toLowerCase() || w.address.toLowerCase() === walletId.toLowerCase()
    )
    if (!wallet) return { success: false, message: `Wallet "${walletId}" not found`, error: 'NOT_FOUND' }

    try {
      await removeWallet(wallet.id)
      return { success: true, message: `Deleted wallet "${wallet.name}"`, data: { walletId: wallet.id, walletName: wallet.name } }
    } catch (error) {
      return { success: false, message: 'Failed to delete wallet', error: String(error) }
    }
  },

  delete_wallet_group: async (params) => {
    const { groupId } = params as { groupId: string }
    const { walletGroups, removeWalletGroup, wallets } = useWalletStore.getState()

    const group = walletGroups.find((g) => g.id === groupId || g.name.toLowerCase() === groupId.toLowerCase())
    if (!group) return { success: false, message: `Group "${groupId}" not found`, error: 'NOT_FOUND' }

    const walletsInGroup = wallets.filter((w) => w.groupId === group.id)

    try {
      await removeWalletGroup(group.id)
      return {
        success: true,
        message: `Deleted group "${group.name}" and ${walletsInGroup.length} wallets`,
        data: { groupId: group.id, groupName: group.name, walletsDeleted: walletsInGroup.length },
      }
    } catch (error) {
      return { success: false, message: 'Failed to delete group', error: String(error) }
    }
  },

  list_wallets: async () => {
    const { wallets, walletGroups } = useWalletStore.getState()

    const grouped = walletGroups.map((group) => ({
      groupId: group.id,
      groupName: group.name,
      wallets: wallets
        .filter((w) => w.groupId === group.id)
        .map((w) => ({ id: w.id, name: w.name, address: w.address, type: w.type })),
    }))

    return {
      success: true,
      message: `Found ${wallets.length} wallets in ${walletGroups.length} groups`,
      data: { groups: grouped, totalWallets: wallets.length, totalGroups: walletGroups.length },
    }
  },

  list_networks: async () => {
    const evmNetworks = EVM_NETWORKS.map((n) => ({ id: n.id, name: n.name, symbol: n.symbol, chainId: n.chainId }))
    const svmNetworks = SVM_NETWORKS.map((n) => ({ id: n.id, name: n.name, symbol: n.symbol }))

    return {
      success: true,
      message: `${evmNetworks.length} EVM networks and ${svmNetworks.length} SVM networks available`,
      data: { evm: evmNetworks, svm: svmNetworks },
    }
  },

  get_balance: async (params) => {
    const { walletId, networkId } = params as { walletId?: string; networkId?: string }
    const { wallets, activeWalletId, activeNetwork } = useWalletStore.getState()

    const wallet = walletId
      ? wallets.find((w) => w.id === walletId || w.name.toLowerCase() === walletId.toLowerCase() || w.address.toLowerCase() === walletId.toLowerCase())
      : wallets.find((w) => w.id === activeWalletId)

    if (!wallet) return { success: false, message: 'Wallet not found', error: 'NOT_FOUND' }

    const networks = getNetworksByType(wallet.type)
    const network = networkId ? networks.find((n) => n.id === networkId || n.name.toLowerCase() === networkId.toLowerCase()) : activeNetwork

    if (!network || network.type !== wallet.type) {
      return { success: false, message: `Network incompatible with wallet type ${wallet.type}`, error: 'INCOMPATIBLE' }
    }

    try {
      const balance = await blockchainService.getBalance(wallet, network)
      return {
        success: true,
        message: `Balance for ${wallet.name} on ${network.name}`,
        data: {
          wallet: wallet.name,
          network: network.name,
          native: balance.native,
          nativeSymbol: network.symbol,
          nativeUSD: balance.nativeUSD,
          tokens: balance.tokens.map((t) => ({ symbol: t.symbol, balance: t.balance })),
          totalUSD: balance.totalUSD,
        },
      }
    } catch (error) {
      return { success: false, message: 'Failed to fetch balance', error: String(error) }
    }
  },

  switch_wallet: async (params) => {
    const { walletId } = params as { walletId: string }
    const { wallets, setActiveWallet } = useWalletStore.getState()

    const wallet = wallets.find(
      (w) => w.id === walletId || w.name.toLowerCase() === walletId.toLowerCase() || w.address.toLowerCase() === walletId.toLowerCase()
    )
    if (!wallet) return { success: false, message: `Wallet "${walletId}" not found`, error: 'NOT_FOUND' }

    setActiveWallet(wallet.id)
    return { success: true, message: `Switched to wallet "${wallet.name}"`, data: { walletId: wallet.id, walletName: wallet.name, address: wallet.address } }
  },

  switch_network: async (params) => {
    const { networkId } = params as { networkId: string }
    const { setActiveNetwork } = useWalletStore.getState()

    const allNetworks = [...EVM_NETWORKS, ...SVM_NETWORKS]
    const network = allNetworks.find((n) => n.id === networkId || n.name.toLowerCase() === networkId.toLowerCase())

    if (!network) return { success: false, message: `Network "${networkId}" not found`, error: 'NOT_FOUND' }

    await setActiveNetwork(network)
    return { success: true, message: `Switched to ${network.name}`, data: { networkId: network.id, networkName: network.name } }
  },

  get_swap_quote: async (params) => {
    const { fromToken, toToken, amount, networkId } = params as {
      fromToken: string
      toToken: string
      amount: string
      networkId?: string
    }

    const { wallets, activeWalletId, activeNetwork } = useWalletStore.getState()
    const wallet = wallets.find((w) => w.id === activeWalletId)
    if (!wallet) return { success: false, message: 'No active wallet', error: 'NO_WALLET' }

    const networks = getNetworksByType(wallet.type)
    const network = networkId ? networks.find((n) => n.id === networkId) : activeNetwork

    if (!network) return { success: false, message: 'Network not found', error: 'NOT_FOUND' }

    try {
      const quote = await swapService.getSwapQuote(
        wallet.type,
        network.chainId || network.id,
        fromToken,
        toToken,
        amount,
        1.0,
        wallet.address
      )

      return {
        success: true,
        message: `Quote: ${amount} ${fromToken} → ${quote.toAmount} ${toToken}`,
        data: {
          fromToken,
          toToken,
          fromAmount: amount,
          toAmount: quote.toAmount,
          toAmountMin: quote.toAmountMin,
          priceImpact: quote.priceImpact,
          provider: quote.provider,
          route: quote.route,
        },
      }
    } catch (error) {
      return { success: false, message: 'Failed to get swap quote', error: String(error) }
    }
  },

  get_settings: async () => {
    const settings = useSettingsStore.getState()
    return {
      success: true,
      message: 'Current settings',
      data: {
        hasAlchemyKey: !!settings.alchemyApiKey,
        hasHeliusKey: !!settings.heliusApiKey,
        hasCoinGeckoKey: !!settings.coinGeckoApiKey,
        hasOpenClawUrl: !!settings.openClawGatewayUrl,
        openClawAutoConnect: settings.openClawAutoConnect,
      },
    }
  },
}

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: 'create_wallet_group',
    description: 'Create a new wallet group with optional pre-generated wallets. A wallet group shares a single recovery phrase.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Name for the wallet group' },
        evmCount: { type: 'number', description: 'Number of EVM wallets to create (Ethereum, Base, Polygon, etc.)' },
        svmCount: { type: 'number', description: 'Number of SVM wallets to create (Solana)' },
        walletNames: { type: 'array', description: 'Custom names for each wallet (in order: EVM wallets first, then SVM)' },
      },
      required: ['name'],
    },
    category: 'wallet_management',
    riskLevel: 'medium',
    requiresConfirmation: true,
  },
  {
    name: 'add_wallets_to_group',
    description: 'Add new wallets to an existing wallet group',
    parameters: {
      type: 'object',
      properties: {
        groupId: { type: 'string', description: 'ID or name of the wallet group' },
        wallets: { type: 'array', description: 'Array of wallets to add, each with name and type (EVM or SVM)' },
      },
      required: ['groupId', 'wallets'],
    },
    category: 'wallet_management',
    riskLevel: 'medium',
    requiresConfirmation: true,
  },
  {
    name: 'rename_wallet',
    description: 'Rename a wallet',
    parameters: {
      type: 'object',
      properties: {
        walletId: { type: 'string', description: 'ID, name, or address of the wallet to rename' },
        newName: { type: 'string', description: 'New name for the wallet' },
      },
      required: ['walletId', 'newName'],
    },
    category: 'wallet_management',
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    name: 'rename_wallet_group',
    description: 'Rename a wallet group',
    parameters: {
      type: 'object',
      properties: {
        groupId: { type: 'string', description: 'ID or name of the group to rename' },
        newName: { type: 'string', description: 'New name for the group' },
      },
      required: ['groupId', 'newName'],
    },
    category: 'wallet_management',
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    name: 'delete_wallet',
    description: 'Delete a wallet permanently',
    parameters: {
      type: 'object',
      properties: {
        walletId: { type: 'string', description: 'ID, name, or address of the wallet to delete' },
      },
      required: ['walletId'],
    },
    category: 'wallet_management',
    riskLevel: 'high',
    requiresConfirmation: true,
  },
  {
    name: 'delete_wallet_group',
    description: 'Delete a wallet group and all its wallets permanently',
    parameters: {
      type: 'object',
      properties: {
        groupId: { type: 'string', description: 'ID or name of the group to delete' },
      },
      required: ['groupId'],
    },
    category: 'wallet_management',
    riskLevel: 'critical',
    requiresConfirmation: true,
  },
  {
    name: 'list_wallets',
    description: 'List all wallets and wallet groups',
    parameters: { type: 'object', properties: {}, required: [] },
    category: 'query',
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    name: 'list_networks',
    description: 'List all available blockchain networks',
    parameters: { type: 'object', properties: {}, required: [] },
    category: 'query',
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    name: 'get_balance',
    description: 'Get the balance of a wallet on a specific network',
    parameters: {
      type: 'object',
      properties: {
        walletId: { type: 'string', description: 'ID, name, or address of the wallet (uses active wallet if not specified)' },
        networkId: { type: 'string', description: 'Network ID or name (uses active network if not specified)' },
      },
      required: [],
    },
    category: 'query',
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    name: 'switch_wallet',
    description: 'Switch to a different wallet',
    parameters: {
      type: 'object',
      properties: {
        walletId: { type: 'string', description: 'ID, name, or address of the wallet to switch to' },
      },
      required: ['walletId'],
    },
    category: 'wallet_management',
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    name: 'switch_network',
    description: 'Switch to a different blockchain network',
    parameters: {
      type: 'object',
      properties: {
        networkId: { type: 'string', description: 'Network ID or name to switch to' },
      },
      required: ['networkId'],
    },
    category: 'network',
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    name: 'get_swap_quote',
    description: 'Get a quote for swapping tokens',
    parameters: {
      type: 'object',
      properties: {
        fromToken: { type: 'string', description: 'Token address or symbol to swap from (use "native" for native currency)' },
        toToken: { type: 'string', description: 'Token address or symbol to swap to' },
        amount: { type: 'string', description: 'Amount to swap' },
        networkId: { type: 'string', description: 'Network to swap on (uses active network if not specified)' },
      },
      required: ['fromToken', 'toToken', 'amount'],
    },
    category: 'token_swap',
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    name: 'get_settings',
    description: 'Get current app settings and API key status',
    parameters: { type: 'object', properties: {}, required: [] },
    category: 'query',
    riskLevel: 'low',
    requiresConfirmation: false,
  },
]

export function getToolsForOpenClaw(): object[] {
  return TOOL_DEFINITIONS.map((tool) => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }))
}

export function getToolDefinition(name: string): ToolDefinition | undefined {
  return TOOL_DEFINITIONS.find((t) => t.name === name)
}

export async function executeAction(name: string, params: Record<string, unknown>): Promise<ActionResult> {
  const handler = actionHandlers[name]
  if (!handler) {
    return { success: false, message: `Unknown action: ${name}`, error: 'UNKNOWN_ACTION' }
  }

  try {
    return await handler(params)
  } catch (error) {
    return { success: false, message: `Action failed: ${name}`, error: String(error) }
  }
}

export function createPendingAction(
  toolCallId: string,
  name: string,
  params: Record<string, unknown>
): PendingAction | null {
  const toolDef = getToolDefinition(name)
  if (!toolDef) return null

  return {
    id: `action_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    toolCallId,
    name,
    parameters: params,
    riskLevel: toolDef.riskLevel,
    status: 'pending',
    createdAt: new Date(),
    category: toolDef.category,
    description: toolDef.description,
  }
}
