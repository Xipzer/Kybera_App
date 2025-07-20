import { Network } from '../types'

export type { Network }

export const EVM_NETWORKS: Network[] = [
  {
    id: 'ethereum',
    name: 'Ethereum',
    chainId: 1,
    rpcUrl: 'https://eth.llamarpc.com',
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
    rpcUrl: 'https://mainnet.base.org',
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
    rpcUrl: 'https://api.mainnet-beta.solana.com',
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
    rpcUrl: 'https://api.devnet.solana.com',
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