/**
 * Wallet Management Action Handlers
 */

import { ActionContext, ActionResult } from '../../../types'
import { useWalletStore } from '../../../store/walletStore'
import { blockchainService } from '../../blockchain/blockchainService'
import { EVM_NETWORKS, SVM_NETWORKS } from '../../../utils/networks'

/**
 * Creates a new EVM wallet in a group
 */
export async function createEVMWallet(
  params: { name: string; groupId: string },
  context: ActionContext,
): Promise<ActionResult> {
  try {
    const { name, groupId } = params
    const { addWalletToGroup } = useWalletStore.getState()

    if (!context.password) {
      return {
        success: false,
        error: 'Password required to create wallet',
        message: 'Please unlock your wallet first',
      }
    }

    const wallet = await addWalletToGroup(groupId, name, 'EVM')

    return {
      success: true,
      data: {
        walletId: wallet.id,
        address: wallet.address,
        name: wallet.name,
      },
      message: `Successfully created EVM wallet "${name}" with address ${wallet.address}`,
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to create EVM wallet',
      message: `Could not create wallet: ${error.message}`,
    }
  }
}

/**
 * Creates a new Solana wallet in a group
 */
export async function createSolanaWallet(
  params: { name: string; groupId: string },
  context: ActionContext,
): Promise<ActionResult> {
  try {
    const { name, groupId } = params
    const { addWalletToGroup } = useWalletStore.getState()

    if (!context.password) {
      return {
        success: false,
        error: 'Password required to create wallet',
        message: 'Please unlock your wallet first',
      }
    }

    const wallet = await addWalletToGroup(groupId, name, 'SVM')

    return {
      success: true,
      data: {
        walletId: wallet.id,
        address: wallet.address,
        name: wallet.name,
      },
      message: `Successfully created Solana wallet "${name}" with address ${wallet.address}`,
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to create Solana wallet',
      message: `Could not create wallet: ${error.message}`,
    }
  }
}

/**
 * Lists all wallets
 */
export async function listWallets(
  params: { type?: 'EVM' | 'SVM' },
  context: ActionContext,
): Promise<ActionResult> {
  try {
    const { wallets, walletGroups } = useWalletStore.getState()

    let filteredWallets = wallets
    if (params.type) {
      filteredWallets = wallets.filter((w) => w.type === params.type)
    }

    const walletsWithGroups = filteredWallets.map((wallet) => {
      const group = walletGroups.find((g) => g.id === wallet.groupId)
      return {
        id: wallet.id,
        name: wallet.name,
        address: wallet.address,
        type: wallet.type,
        groupName: group?.name || 'Unknown',
        groupId: wallet.groupId,
      }
    })

    return {
      success: true,
      data: { wallets: walletsWithGroups, count: walletsWithGroups.length },
      message: `Found ${walletsWithGroups.length} wallet(s)`,
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to list wallets',
      message: 'Could not retrieve wallet list',
    }
  }
}

/**
 * Switches to a different wallet
 */
export async function switchWallet(
  params: { walletId: string },
  context: ActionContext,
): Promise<ActionResult> {
  try {
    const { setActiveWallet, wallets } = useWalletStore.getState()
    const wallet = wallets.find((w) => w.id === params.walletId)

    if (!wallet) {
      return {
        success: false,
        error: 'Wallet not found',
        message: `No wallet found with ID ${params.walletId}`,
      }
    }

    setActiveWallet(params.walletId)

    return {
      success: true,
      data: {
        walletId: wallet.id,
        name: wallet.name,
        address: wallet.address,
        type: wallet.type,
      },
      message: `Switched to wallet "${wallet.name}" (${wallet.address})`,
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to switch wallet',
      message: 'Could not switch to the specified wallet',
    }
  }
}

/**
 * Gets wallet balance
 */
export async function getWalletBalance(
  params: { walletId?: string; includeUsdValue?: boolean },
  context: ActionContext,
): Promise<ActionResult> {
  try {
    const { wallets, activeWalletId, activeNetwork } = useWalletStore.getState()
    const walletId = params.walletId || activeWalletId

    if (!walletId) {
      return {
        success: false,
        error: 'No wallet specified',
        message: 'Please specify a wallet or activate one first',
      }
    }

    const wallet = wallets.find((w) => w.id === walletId)
    if (!wallet) {
      return {
        success: false,
        error: 'Wallet not found',
        message: `No wallet found with ID ${walletId}`,
      }
    }

    // Get balance from blockchain service
    const balance = await blockchainService.getBalance(wallet, activeNetwork, false)

    return {
      success: true,
      data: {
        walletAddress: wallet.address,
        walletName: wallet.name,
        network: activeNetwork.name,
        nativeBalance: balance.native,
        nativeSymbol: activeNetwork.symbol,
        nativeUSD: balance.nativeUSD,
        tokens: balance.tokens,
        totalUSD: balance.totalUSD,
        change24h: balance.total24hChange,
      },
      message: `Balance for ${wallet.name}: ${balance.native} ${activeNetwork.symbol} ($${balance.totalUSD.toFixed(2)})`,
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to get wallet balance',
      message: 'Could not retrieve wallet balance',
    }
  }
}

/**
 * Creates a new wallet group
 */
export async function createWalletGroup(
  params: { name: string },
  context: ActionContext,
): Promise<ActionResult> {
  try {
    const { createWalletGroup } = useWalletStore.getState()

    if (!context.password) {
      return {
        success: false,
        error: 'Password required to create wallet group',
        message: 'Please unlock your wallet first',
      }
    }

    const group = await createWalletGroup(params.name, context.password)

    return {
      success: true,
      data: {
        groupId: group.id,
        name: group.name,
      },
      message: `Successfully created wallet group "${params.name}"`,
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to create wallet group',
      message: `Could not create wallet group: ${error.message}`,
    }
  }
}

/**
 * Switches the active network
 */
export async function switchNetwork(
  params: { networkId: string },
  context: ActionContext,
): Promise<ActionResult> {
  try {
    const { setActiveNetwork, activeWalletId, wallets } = useWalletStore.getState()

    // Find the network
    const allNetworks = [...EVM_NETWORKS, ...SVM_NETWORKS]
    const network = allNetworks.find((n) => n.id === params.networkId)

    if (!network) {
      return {
        success: false,
        error: 'Network not found',
        message: `No network found with ID ${params.networkId}`,
      }
    }

    // Check if we have an active wallet and if it matches the network type
    if (activeWalletId) {
      const activeWallet = wallets.find((w) => w.id === activeWalletId)
      if (activeWallet && activeWallet.type !== network.type) {
        return {
          success: false,
          error: 'Network type mismatch',
          message: `Active wallet is ${activeWallet.type} but trying to switch to ${network.type} network. Please switch to a compatible wallet first.`,
        }
      }
    }

    await setActiveNetwork(network)

    return {
      success: true,
      data: {
        networkId: network.id,
        networkName: network.name,
        chainId: network.chainId,
        symbol: network.symbol,
      },
      message: `Switched to ${network.name} network`,
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to switch network',
      message: 'Could not switch to the specified network',
    }
  }
}

/**
 * Lists all available networks
 */
export async function listNetworks(
  params: { type?: 'EVM' | 'SVM' },
  context: ActionContext,
): Promise<ActionResult> {
  try {
    let networks = params.type === 'EVM' ? EVM_NETWORKS : params.type === 'SVM' ? SVM_NETWORKS : [...EVM_NETWORKS, ...SVM_NETWORKS]

    const networkList = networks.map((n) => ({
      id: n.id,
      name: n.name,
      chainId: n.chainId,
      symbol: n.symbol,
      type: n.type,
      explorer: n.explorerUrl,
    }))

    return {
      success: true,
      data: { networks: networkList, count: networkList.length },
      message: `Found ${networkList.length} network(s)`,
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to list networks',
      message: 'Could not retrieve network list',
    }
  }
}
