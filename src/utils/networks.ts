/**
 * Code by Xipzer
 */

import { Network } from '../types'
import { clusterApiUrl } from '@solana/web3.js'
import { useSettingsStore } from '../store/settingsStore'

export type { Network }

const ENV_ALCHEMY_KEY = import.meta.env.VITE_ALCHEMY_API_KEY || ''
const ENV_HELIUS_KEY = import.meta.env.VITE_HELIUS_API_KEY || ''

export function getAlchemyApiKey(): string {
  return useSettingsStore.getState().alchemyApiKey || ENV_ALCHEMY_KEY
}

export function getHeliusApiKey(): string {
  return useSettingsStore.getState().heliusApiKey || ENV_HELIUS_KEY
}

function alchemyUrl(network: string): string {
  return `https://${network}.g.alchemy.com/v2/${ENV_ALCHEMY_KEY}`
}

export const EVM_NETWORKS: Network[] = [
  {
    id: 'ethereum',
    name: 'Ethereum',
    chainId: 1,
    rpcUrl: 'https://eth.llamarpc.com',
    alchemyRpcUrl: alchemyUrl('eth-mainnet'),
    symbol: 'ETH',
    explorerUrl: 'https://etherscan.io',
    type: 'EVM',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
    },
  },
  {
    id: 'base',
    name: 'Base',
    chainId: 8453,
    rpcUrl: 'https://mainnet.base.org',
    alchemyRpcUrl: alchemyUrl('base-mainnet'),
    symbol: 'ETH',
    explorerUrl: 'https://basescan.org',
    type: 'EVM',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
    },
  },
  {
    id: 'bsc',
    name: 'BNB Smart Chain',
    chainId: 56,
    rpcUrl: 'https://bsc-dataseed1.binance.org',
    alchemyRpcUrl: alchemyUrl('bnb-mainnet'),
    symbol: 'BNB',
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
    rpcUrl: 'https://polygon-bor-rpc.publicnode.com',
    alchemyRpcUrl: alchemyUrl('polygon-mainnet'),
    symbol: 'POL',
    explorerUrl: 'https://polygonscan.com',
    type: 'EVM',
    nativeCurrency: {
      name: 'POL',
      symbol: 'POL',
      decimals: 18,
    },
  },
  {
    id: 'arbitrum',
    name: 'Arbitrum',
    chainId: 42161,
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    alchemyRpcUrl: alchemyUrl('arb-mainnet'),
    symbol: 'ETH',
    explorerUrl: 'https://arbiscan.io',
    type: 'EVM',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
    },
  },
  {
    id: 'optimism',
    name: 'Optimism',
    chainId: 10,
    rpcUrl: 'https://mainnet.optimism.io',
    alchemyRpcUrl: alchemyUrl('opt-mainnet'),
    symbol: 'ETH',
    explorerUrl: 'https://optimistic.etherscan.io',
    type: 'EVM',
    nativeCurrency: {
      name: 'Ethereum',
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
    rpcUrl: `https://mainnet.helius-rpc.com/?api-key=${ENV_HELIUS_KEY}`,
    alchemyRpcUrl: alchemyUrl('solana-mainnet'),
    symbol: 'SOL',
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
    alchemyRpcUrl: alchemyUrl('solana-devnet'),
    symbol: 'SOL',
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

export function getNetworksByType(type: 'EVM' | 'SVM'): Network[] {
  return type === 'EVM' ? EVM_NETWORKS : SVM_NETWORKS
}

export function getDefaultNetworkId(type: 'EVM' | 'SVM'): string {
  return type === 'EVM' ? 'ethereum' : 'solana-mainnet'
}

export function findNetworkById(id: string): Network | undefined {
  return ALL_NETWORKS.find((n) => n.id === id)
}

export function findNetworkByResearchId(researchId: string): Network | undefined {
  return findNetworkById(researchId) || findNetworkById(`${researchId}-mainnet`)
}

export function getExplorerUrl(researchNetworkId: string): string {
  return findNetworkByResearchId(researchNetworkId)?.explorerUrl || ''
}

export function getChainId(researchNetworkId: string): number {
  const chainId = findNetworkByResearchId(researchNetworkId)?.chainId
  return typeof chainId === 'number' ? chainId : 0
}

export function getNativeSymbol(researchNetworkId: string): string {
  return findNetworkByResearchId(researchNetworkId)?.symbol || 'ETH'
}

export function getChainType(researchNetworkId: string): 'EVM' | 'SVM' {
  return findNetworkByResearchId(researchNetworkId)?.type || 'EVM'
}

const NATIVE_TOKEN_ADDRESSES: Record<string, string> = {
  base: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
  ethereum: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
  arbitrum: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
  optimism: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
  solana: 'So11111111111111111111111111111111111111112',
}

const NATIVE_PRICE_FALLBACKS: Record<string, number> = {
  base: 2300,
  ethereum: 2300,
  arbitrum: 2300,
  optimism: 2300,
  solana: 150,
}

export function getNativeTokenAddress(researchNetworkId: string): string {
  return NATIVE_TOKEN_ADDRESSES[researchNetworkId] || NATIVE_TOKEN_ADDRESSES.ethereum
}

export function getNativePriceFallback(researchNetworkId: string): number {
  return NATIVE_PRICE_FALLBACKS[researchNetworkId] || 2300
}

export function isValidAddress(address: string): boolean {
  if (address.startsWith('0x') && address.length === 42) {
    return /^0x[a-fA-F0-9]{40}$/.test(address)
  }
  if (!address.startsWith('0x') && address.length >= 32 && address.length <= 44) {
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)
  }
  return false
}

export function detectNetworkFromAddress(address: string): string {
  if (!address.startsWith('0x') && address.length >= 32 && address.length <= 44) {
    return 'solana'
  }
  return 'base'
}