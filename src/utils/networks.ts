import { Network } from '../types'
import { clusterApiUrl } from '@solana/web3.js'

export type { Network }

export const EVM_NETWORKS: Network[] = [
  {
    id: 'ethereum',
    name: 'Ethereum',
    chainId: 1,
    rpcUrl: 'https://eth.llamarpc.com',
    alchemyRpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/cBCJuIqmLxI3eeYj0vQaa',
    symbol: 'ETH',
    explorer: 'https://etherscan.io',
    explorerUrl: 'https://etherscan.io',
    type: 'EVM',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
  },
  {
    id: 'base',
    name: 'Base',
    chainId: 8453,
    rpcUrl: 'https://base.llamarpc.com',
    alchemyRpcUrl: 'https://base-mainnet.g.alchemy.com/v2/cBCJuIqmLxI3eeYj0vQaa',
    symbol: 'ETH',
    explorer: 'https://basescan.org',
    explorerUrl: 'https://basescan.org',
    type: 'EVM',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
  },
  {
    id: 'bsc',
    name: 'BNB Smart Chain',
    chainId: 56,
    rpcUrl: 'https://bsc-dataseed.binance.org',
    alchemyRpcUrl: 'https://bnb-mainnet.g.alchemy.com/v2/cBCJuIqmLxI3eeYj0vQaa',
    symbol: 'BNB',
    explorer: 'https://bscscan.com',
    explorerUrl: 'https://bscscan.com',
    type: 'EVM',
    nativeCurrency: {
      name: 'Binance Coin',
      symbol: 'BNB',
      decimals: 18,
    },
  },
  {
    id: 'polygon',
    name: 'Polygon',
    chainId: 137,
    rpcUrl: 'https://polygon-rpc.com',
    alchemyRpcUrl: 'https://polygonzkevm-mainnet.g.alchemy.com/v2/cBCJuIqmLxI3eeYj0vQaa',
    symbol: 'MATIC',
    explorer: 'https://polygonscan.com',
    explorerUrl: 'https://polygonscan.com',
    type: 'EVM',
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18,
    },
  },
  {
    id: 'arbitrum',
    name: 'Arbitrum',
    chainId: 42161,
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    alchemyRpcUrl: 'https://arb-mainnet.g.alchemy.com/v2/cBCJuIqmLxI3eeYj0vQaa',
    symbol: 'ETH',
    explorer: 'https://arbiscan.io',
    explorerUrl: 'https://arbiscan.io',
    type: 'EVM',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
  },
  {
    id: 'optimism',
    name: 'Optimism',
    chainId: 10,
    rpcUrl: 'https://mainnet.optimism.io',
    symbol: 'ETH',
    explorer: 'https://optimistic.etherscan.io',
    explorerUrl: 'https://optimistic.etherscan.io',
    type: 'EVM',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
  },
]

export const SVM_NETWORKS: Network[] = [
  {
    id: 'solana-mainnet',
    name: 'Solana Mainnet',
    chainId: 'mainnet-beta',
    rpcUrl: "https://mainnet.helius-rpc.com/?api-key=b3927776-59ce-4234-a5a1-344b20b3d9bd",
    alchemyRpcUrl: 'https://solana-mainnet.g.alchemy.com/v2/cBCJuIqmLxI3eeYj0vQaa',
    symbol: 'SOL',
    explorer: 'https://explorer.solana.com',
    explorerUrl: 'https://explorer.solana.com',
    type: 'SVM',
    nativeCurrency: {
      name: 'Solana',
      symbol: 'SOL',
      decimals: 9,
    },
  },
  {
    id: 'solana-devnet',
    name: 'Solana Devnet',
    chainId: 'devnet',
    rpcUrl: clusterApiUrl('devnet'),
    alchemyRpcUrl: 'https://solana-devnet.g.alchemy.com/v2/cBCJuIqmLxI3eeYj0vQaa',
    symbol: 'SOL',
    explorer: 'https://explorer.solana.com?cluster=devnet',
    explorerUrl: 'https://explorer.solana.com?cluster=devnet',
    type: 'SVM',
    nativeCurrency: {
      name: 'Solana',
      symbol: 'SOL',
      decimals: 9,
    },
  },
]

export const ALL_NETWORKS = [...EVM_NETWORKS, ...SVM_NETWORKS]

export const getNetworkById = (id: string): Network | undefined => {
  return ALL_NETWORKS.find((network) => network.id === id)
}

export const getNetworksByType = (type: 'EVM' | 'SVM'): Network[] => {
  return ALL_NETWORKS.filter((network) => network.type === type)
}