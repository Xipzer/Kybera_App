/**
 * Provider utilities for creating reliable EVM providers
 * Bypasses network auto-detection to avoid RPC failures
 */

import { ethers } from 'ethers'
import { Network } from '../../types'

// Map of known RPC URLs to their chain IDs
const RPC_CHAIN_MAP: Record<string, number> = {
  'eth.llamarpc.com': 1,
  'eth-mainnet.g.alchemy.com': 1,
  'mainnet.infura.io': 1,
  'base.llamarpc.com': 8453,
  'base-mainnet.g.alchemy.com': 8453,
  'mainnet.base.org': 8453,
  'bsc-dataseed.binance.org': 56,
  'bnb-mainnet.g.alchemy.com': 56,
  'polygon-rpc.com': 137,
  'polygon-mainnet.g.alchemy.com': 137,
  'polygon-bor-rpc.publicnode.com': 137,
  'arb1.arbitrum.io': 42161,
  'arb-mainnet.g.alchemy.com': 42161,
  'mainnet.optimism.io': 10,
  'opt-mainnet.g.alchemy.com': 10,
}

/**
 * Infer chain ID from RPC URL
 */
function inferChainId(rpcUrl: string): number | null {
  for (const [pattern, chainId] of Object.entries(RPC_CHAIN_MAP)) {
    if (rpcUrl.includes(pattern)) {
      return chainId
    }
  }
  return null
}

/**
 * Get the best RPC URL for a network
 * Prefers Alchemy URLs as they have better reliability and no CORS issues
 */
export function getBestRpcUrl(network: Network): string {
  // Prefer Alchemy URL for EVM networks (better reliability, no CORS)
  if (network.type === 'EVM' && network.alchemyRpcUrl) {
    return network.alchemyRpcUrl
  }
  return network.rpcUrl
}

/**
 * Create a JsonRpcProvider with static network configuration
 * This bypasses the network detection call that can fail with unreliable RPCs
 */
export function createProvider(rpcUrl: string, chainId?: number): ethers.JsonRpcProvider {
  const resolvedChainId = chainId ?? inferChainId(rpcUrl)

  if (resolvedChainId) {
    // Create a static network to bypass detection
    const network = ethers.Network.from(resolvedChainId)
    return new ethers.JsonRpcProvider(rpcUrl, network, {
      staticNetwork: network,
    })
  }

  // Fallback to auto-detection if chainId unknown
  return new ethers.JsonRpcProvider(rpcUrl)
}

/**
 * Create a provider from network config - prefers Alchemy RPC
 */
export function createProviderFromNetwork(network: Network): ethers.JsonRpcProvider {
  const chainId =
    typeof network.chainId === 'number' ? network.chainId : parseInt(network.chainId as string, 10)

  if (isNaN(chainId)) {
    // Non-numeric chainId (e.g., Solana) - shouldn't use EVM provider
    throw new Error(`Invalid EVM chainId: ${network.chainId}`)
  }

  const rpcUrl = getBestRpcUrl(network)
  return createProvider(rpcUrl, chainId)
}
