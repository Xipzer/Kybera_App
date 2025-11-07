import { ToolDefinition } from '../../../types'

/**
 * Wallet Management Tools
 */
export const WALLET_TOOLS: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'create_evm_wallet',
      description: 'Creates a new Ethereum/EVM-compatible wallet in a specified wallet group',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Display name for the new wallet (e.g., "Trading Wallet", "Savings")',
          },
          groupId: {
            type: 'string',
            description:
              'ID of the wallet group to add this wallet to. Use "default" for the main group.',
          },
        },
        required: ['name', 'groupId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_solana_wallet',
      description: 'Creates a new Solana (SVM) wallet in a specified wallet group',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Display name for the new wallet',
          },
          groupId: {
            type: 'string',
            description: 'ID of the wallet group to add this wallet to',
          },
        },
        required: ['name', 'groupId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_wallets',
      description: 'Lists all available wallets with their addresses and balances',
      parameters: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            description: 'Filter by wallet type: EVM or SVM. Omit to list all wallets.',
            enum: ['EVM', 'SVM'],
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'switch_wallet',
      description: 'Switches to a different wallet as the active wallet',
      parameters: {
        type: 'object',
        properties: {
          walletId: {
            type: 'string',
            description: 'ID of the wallet to switch to',
          },
        },
        required: ['walletId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_wallet_balance',
      description:
        'Gets the balance of the active wallet or a specific wallet, including native token and all ERC20/SPL tokens',
      parameters: {
        type: 'object',
        properties: {
          walletId: {
            type: 'string',
            description: 'Optional wallet ID. Uses active wallet if not specified.',
          },
          includeUsdValue: {
            type: 'boolean',
            description: 'Include USD values for tokens. Default is true.',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_wallet_group',
      description: 'Creates a new wallet group with a new seed phrase',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Name for the wallet group',
          },
        },
        required: ['name'],
      },
    },
  },
]

/**
 * Network Management Tools
 */
export const NETWORK_TOOLS: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'switch_network',
      description:
        'Switches the active network for the current wallet (e.g., Ethereum, Polygon, BSC, Arbitrum, Optimism, Base)',
      parameters: {
        type: 'object',
        properties: {
          networkId: {
            type: 'string',
            description: 'Network ID to switch to',
            enum: [
              'ethereum',
              'polygon',
              'bsc',
              'arbitrum',
              'optimism',
              'base',
              'solana-mainnet',
              'solana-devnet',
            ],
          },
        },
        required: ['networkId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_networks',
      description: 'Lists all available networks with their chain IDs and RPC URLs',
      parameters: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            description: 'Filter by network type: EVM or SVM',
            enum: ['EVM', 'SVM'],
          },
        },
      },
    },
  },
]

/**
 * Token Transfer Tools
 */
export const TRANSFER_TOOLS: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'send_native_token',
      description:
        'Sends native tokens (ETH, BNB, MATIC, SOL, etc.) to another address on the current network',
      parameters: {
        type: 'object',
        properties: {
          toAddress: {
            type: 'string',
            description: 'Recipient wallet address',
          },
          amount: {
            type: 'string',
            description: 'Amount to send (in token units, e.g., "0.5" for 0.5 ETH)',
          },
        },
        required: ['toAddress', 'amount'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'send_token',
      description: 'Sends ERC20 tokens (on EVM chains) or SPL tokens (on Solana) to another address',
      parameters: {
        type: 'object',
        properties: {
          toAddress: {
            type: 'string',
            description: 'Recipient wallet address',
          },
          tokenAddress: {
            type: 'string',
            description: 'Contract address of the token to send',
          },
          amount: {
            type: 'string',
            description: 'Amount to send (in token units)',
          },
          tokenSymbol: {
            type: 'string',
            description: 'Token symbol (e.g., USDC, LINK) for display purposes',
          },
        },
        required: ['toAddress', 'tokenAddress', 'amount'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'estimate_gas',
      description: 'Estimates gas fees for a transaction on EVM chains',
      parameters: {
        type: 'object',
        properties: {
          toAddress: {
            type: 'string',
            description: 'Recipient address',
          },
          amount: {
            type: 'string',
            description: 'Amount to send',
          },
          tokenAddress: {
            type: 'string',
            description: 'Token contract address (omit for native token)',
          },
        },
        required: ['toAddress', 'amount'],
      },
    },
  },
]

/**
 * Token Swap Tools
 */
export const SWAP_TOOLS: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'get_swap_quote',
      description:
        'Gets a quote for swapping one token for another on the current network (Jupiter for Solana, 1inch for EVM)',
      parameters: {
        type: 'object',
        properties: {
          fromToken: {
            type: 'string',
            description: 'Token address to swap from (or "native" for native token)',
          },
          toToken: {
            type: 'string',
            description: 'Token address to swap to',
          },
          amount: {
            type: 'string',
            description: 'Amount of fromToken to swap',
          },
          slippage: {
            type: 'number',
            description: 'Maximum slippage percentage (default: 1.0 = 1%)',
          },
        },
        required: ['fromToken', 'toToken', 'amount'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'execute_swap',
      description: 'Executes a token swap on the current network',
      parameters: {
        type: 'object',
        properties: {
          fromToken: {
            type: 'string',
            description: 'Token address to swap from',
          },
          toToken: {
            type: 'string',
            description: 'Token address to swap to',
          },
          amount: {
            type: 'string',
            description: 'Amount of fromToken to swap',
          },
          slippage: {
            type: 'number',
            description: 'Maximum slippage percentage (default: 1.0)',
          },
          minAmountOut: {
            type: 'string',
            description: 'Minimum amount of toToken to receive',
          },
        },
        required: ['fromToken', 'toToken', 'amount'],
      },
    },
  },
]

/**
 * Bridge Tools
 */
export const BRIDGE_TOOLS: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'get_bridge_quote',
      description:
        'Gets a quote for bridging tokens from one network to another using relay.link',
      parameters: {
        type: 'object',
        properties: {
          fromNetwork: {
            type: 'string',
            description: 'Source network ID',
            enum: ['ethereum', 'polygon', 'bsc', 'arbitrum', 'optimism', 'base'],
          },
          toNetwork: {
            type: 'string',
            description: 'Destination network ID',
            enum: ['ethereum', 'polygon', 'bsc', 'arbitrum', 'optimism', 'base'],
          },
          token: {
            type: 'string',
            description: 'Token address to bridge (or "native" for native token)',
          },
          amount: {
            type: 'string',
            description: 'Amount to bridge',
          },
          toAddress: {
            type: 'string',
            description: 'Recipient address on destination network (uses same wallet if not specified)',
          },
        },
        required: ['fromNetwork', 'toNetwork', 'token', 'amount'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'execute_bridge',
      description: 'Executes a cross-chain bridge transaction',
      parameters: {
        type: 'object',
        properties: {
          fromNetwork: {
            type: 'string',
            description: 'Source network ID',
          },
          toNetwork: {
            type: 'string',
            description: 'Destination network ID',
          },
          token: {
            type: 'string',
            description: 'Token address to bridge',
          },
          amount: {
            type: 'string',
            description: 'Amount to bridge',
          },
          toAddress: {
            type: 'string',
            description: 'Recipient address on destination network',
          },
        },
        required: ['fromNetwork', 'toNetwork', 'token', 'amount'],
      },
    },
  },
]

/**
 * Query Tools (Read-only)
 */
export const QUERY_TOOLS: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'get_token_price',
      description: 'Gets the current USD price of a token',
      parameters: {
        type: 'object',
        properties: {
          tokenSymbol: {
            type: 'string',
            description: 'Token symbol (e.g., ETH, USDC, LINK)',
          },
          tokenAddress: {
            type: 'string',
            description: 'Token contract address (alternative to symbol)',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_transaction_history',
      description: 'Gets recent transaction history for the active wallet',
      parameters: {
        type: 'object',
        properties: {
          walletAddress: {
            type: 'string',
            description: 'Wallet address (uses active wallet if not specified)',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of transactions to return (default: 20)',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_token',
      description: 'Searches for a token by name or symbol across all networks',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Token name or symbol to search for',
          },
          network: {
            type: 'string',
            description: 'Filter by specific network (optional)',
          },
        },
        required: ['query'],
      },
    },
  },
]

/**
 * All tools combined
 */
export const ALL_TOOLS: ToolDefinition[] = [
  ...WALLET_TOOLS,
  ...NETWORK_TOOLS,
  ...TRANSFER_TOOLS,
  ...SWAP_TOOLS,
  ...BRIDGE_TOOLS,
  ...QUERY_TOOLS,
]

/**
 * Get tools by category
 */
export function getToolsByCategory(categories: string[]): ToolDefinition[] {
  const toolMap: Record<string, ToolDefinition[]> = {
    wallet: WALLET_TOOLS,
    network: NETWORK_TOOLS,
    transfer: TRANSFER_TOOLS,
    swap: SWAP_TOOLS,
    bridge: BRIDGE_TOOLS,
    query: QUERY_TOOLS,
  }

  const tools: ToolDefinition[] = []
  for (const category of categories) {
    if (toolMap[category]) {
      tools.push(...toolMap[category])
    }
  }

  return tools
}

/**
 * Get safe tools only (read-only)
 */
export function getSafeTools(): ToolDefinition[] {
  return [...QUERY_TOOLS, ...NETWORK_TOOLS, ...WALLET_TOOLS.filter((t) => t.function.name === 'list_wallets')]
}
