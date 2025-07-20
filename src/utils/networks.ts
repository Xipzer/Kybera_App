import { Network } from '../types'

export const EVM_NETWORKS: Network[] = [
  {
    id: 'ethereum',
    name: 'Ethereum',
    chainId: 1,
    rpcUrl: 'https://eth.llamarpc.com',
    symbol: 'ETH',
    explorer: 'https://etherscan.io',
    type: 'EVM',
  },
  {
    id: 'base',
    name: 'Base',
    chainId: 8453,
    rpcUrl: 'https://mainnet.base.org',
    symbol: 'ETH',
    explorer: 'https://basescan.org',
    type: 'EVM',
  },
  {
    id: 'bsc',
    name: 'BNB Smart Chain',
    chainId: 56,
    rpcUrl: 'https://bsc-dataseed.binance.org',
    symbol: 'BNB',
    explorer: 'https://bscscan.com',
    type: 'EVM',
  },
  {
    id: 'polygon',
    name: 'Polygon',
    chainId: 137,
    rpcUrl: 'https://polygon-rpc.com',
    symbol: 'MATIC',
    explorer: 'https://polygonscan.com',
    type: 'EVM',
  },
  {
    id: 'arbitrum',
    name: 'Arbitrum',
    chainId: 42161,
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    symbol: 'ETH',
    explorer: 'https://arbiscan.io',
    type: 'EVM',
  },
  {
    id: 'optimism',
    name: 'Optimism',
    chainId: 10,
    rpcUrl: 'https://mainnet.optimism.io',
    symbol: 'ETH',
    explorer: 'https://optimistic.etherscan.io',
    type: 'EVM',
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
    type: 'SVM',
  },
  {
    id: 'solana-devnet',
    name: 'Solana Devnet',
    chainId: 'devnet',
    rpcUrl: 'https://api.devnet.solana.com',
    symbol: 'SOL',
    explorer: 'https://explorer.solana.com?cluster=devnet',
    type: 'SVM',
  },
]

export const ALL_NETWORKS = [...EVM_NETWORKS, ...SVM_NETWORKS]

export const getNetworkById = (id: string): Network | undefined => {
  return ALL_NETWORKS.find((network) => network.id === id)
}

export const getNetworksByType = (type: 'EVM' | 'SVM'): Network[] => {
  return ALL_NETWORKS.filter((network) => network.type === type)
}