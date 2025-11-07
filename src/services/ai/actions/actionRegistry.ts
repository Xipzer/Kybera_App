/**
 * Action Registry
 * Maps tool names to their handler functions with metadata
 */

import { ActionConfig } from '../../../types'

// Import all action handlers
import {
  createEVMWallet,
  createSolanaWallet,
  listWallets,
  switchWallet,
  getWalletBalance,
  createWalletGroup,
  switchNetwork,
  listNetworks,
} from './walletActions'

import {
  sendNativeToken,
  sendToken,
  estimateGas,
  getTransactionHistory,
  getTokenPrice,
  searchToken,
} from './transactionActions'

import {
  getBridgeQuote,
  executeBridge,
  getSwapQuote,
  executeSwap,
} from './bridgeSwapActions'

/**
 * Registry of all available actions
 */
export const ACTION_REGISTRY: Record<string, ActionConfig> = {
  // Wallet Management Actions
  create_evm_wallet: {
    name: 'create_evm_wallet',
    handler: createEVMWallet,
    requiresConfirmation: true,
    riskLevel: 'medium',
    category: 'wallet_management',
    description: 'Creates a new EVM wallet in a wallet group',
    estimatedTime: 2000,
  },
  create_solana_wallet: {
    name: 'create_solana_wallet',
    handler: createSolanaWallet,
    requiresConfirmation: true,
    riskLevel: 'medium',
    category: 'wallet_management',
    description: 'Creates a new Solana wallet in a wallet group',
    estimatedTime: 2000,
  },
  list_wallets: {
    name: 'list_wallets',
    handler: listWallets,
    requiresConfirmation: false,
    riskLevel: 'low',
    category: 'query',
    description: 'Lists all available wallets',
    estimatedTime: 500,
  },
  switch_wallet: {
    name: 'switch_wallet',
    handler: switchWallet,
    requiresConfirmation: false,
    riskLevel: 'low',
    category: 'wallet_management',
    description: 'Switches to a different wallet',
    estimatedTime: 500,
  },
  get_wallet_balance: {
    name: 'get_wallet_balance',
    handler: getWalletBalance,
    requiresConfirmation: false,
    riskLevel: 'low',
    category: 'query',
    description: 'Gets the balance of a wallet',
    estimatedTime: 3000,
  },
  create_wallet_group: {
    name: 'create_wallet_group',
    handler: createWalletGroup,
    requiresConfirmation: true,
    riskLevel: 'medium',
    category: 'wallet_management',
    description: 'Creates a new wallet group with a new seed phrase',
    estimatedTime: 2000,
  },

  // Network Management Actions
  switch_network: {
    name: 'switch_network',
    handler: switchNetwork,
    requiresConfirmation: false,
    riskLevel: 'low',
    category: 'network',
    description: 'Switches the active network',
    estimatedTime: 500,
  },
  list_networks: {
    name: 'list_networks',
    handler: listNetworks,
    requiresConfirmation: false,
    riskLevel: 'low',
    category: 'query',
    description: 'Lists all available networks',
    estimatedTime: 500,
  },

  // Token Transfer Actions
  send_native_token: {
    name: 'send_native_token',
    handler: sendNativeToken,
    requiresConfirmation: true,
    riskLevel: 'high',
    requiresPassword: true,
    category: 'token_transfer',
    description: 'Sends native tokens (ETH, SOL, etc.) to another address',
    estimatedTime: 15000,
  },
  send_token: {
    name: 'send_token',
    handler: sendToken,
    requiresConfirmation: true,
    riskLevel: 'high',
    requiresPassword: true,
    category: 'token_transfer',
    description: 'Sends ERC20/SPL tokens to another address',
    estimatedTime: 15000,
  },
  estimate_gas: {
    name: 'estimate_gas',
    handler: estimateGas,
    requiresConfirmation: false,
    riskLevel: 'low',
    category: 'query',
    description: 'Estimates gas fees for a transaction',
    estimatedTime: 2000,
  },

  // Query Actions
  get_transaction_history: {
    name: 'get_transaction_history',
    handler: getTransactionHistory,
    requiresConfirmation: false,
    riskLevel: 'low',
    category: 'query',
    description: 'Gets recent transaction history',
    estimatedTime: 3000,
  },
  get_token_price: {
    name: 'get_token_price',
    handler: getTokenPrice,
    requiresConfirmation: false,
    riskLevel: 'low',
    category: 'query',
    description: 'Gets the current USD price of a token',
    estimatedTime: 2000,
  },
  search_token: {
    name: 'search_token',
    handler: searchToken,
    requiresConfirmation: false,
    riskLevel: 'low',
    category: 'query',
    description: 'Searches for a token by name or symbol',
    estimatedTime: 2000,
  },

  // Swap Actions
  get_swap_quote: {
    name: 'get_swap_quote',
    handler: getSwapQuote,
    requiresConfirmation: false,
    riskLevel: 'low',
    category: 'query',
    description: 'Gets a quote for swapping tokens',
    estimatedTime: 3000,
  },
  execute_swap: {
    name: 'execute_swap',
    handler: executeSwap,
    requiresConfirmation: true,
    riskLevel: 'high',
    requiresPassword: true,
    category: 'token_swap',
    description: 'Executes a token swap',
    estimatedTime: 20000,
  },

  // Bridge Actions
  get_bridge_quote: {
    name: 'get_bridge_quote',
    handler: getBridgeQuote,
    requiresConfirmation: false,
    riskLevel: 'low',
    category: 'query',
    description: 'Gets a quote for bridging tokens across chains',
    estimatedTime: 3000,
  },
  execute_bridge: {
    name: 'execute_bridge',
    handler: executeBridge,
    requiresConfirmation: true,
    riskLevel: 'high',
    requiresPassword: true,
    category: 'token_bridge',
    description: 'Executes a cross-chain bridge transaction',
    estimatedTime: 30000,
  },
}

/**
 * Gets an action config by name
 */
export function getActionConfig(actionName: string): ActionConfig | undefined {
  return ACTION_REGISTRY[actionName]
}

/**
 * Checks if an action exists
 */
export function actionExists(actionName: string): boolean {
  return actionName in ACTION_REGISTRY
}

/**
 * Gets all actions by category
 */
export function getActionsByCategory(category: string): ActionConfig[] {
  return Object.values(ACTION_REGISTRY).filter((action) => action.category === category)
}

/**
 * Gets all safe (read-only) actions
 */
export function getSafeActions(): ActionConfig[] {
  return Object.values(ACTION_REGISTRY).filter(
    (action) => action.riskLevel === 'low' && !action.requiresConfirmation,
  )
}

/**
 * Gets all high-risk actions
 */
export function getHighRiskActions(): ActionConfig[] {
  return Object.values(ACTION_REGISTRY).filter(
    (action) => action.riskLevel === 'high' || action.riskLevel === 'critical',
  )
}
