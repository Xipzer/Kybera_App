/**
 * Code by Xipzer
 */

import { ethers } from 'ethers'
import { Network } from '../../types'
import { getAlchemyApiKey, getHeliusApiKey } from '../../utils/networks'

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

function inferChainId(rpcUrl: string): number | null {
  for (const [pattern, chainId] of Object.entries(RPC_CHAIN_MAP)) {
    if (rpcUrl.includes(pattern)) {
      return chainId
    }
  }
  return null
}

function resolveRpcUrl(url: string): string {
  if (url.includes('.g.alchemy.com/v2/')) {
    return url.replace(/\/v2\/.*$/, `/v2/${getAlchemyApiKey()}`)
  }
  if (url.includes('helius-rpc.com')) {
    return url.replace(/api-key=[^&]*/, `api-key=${getHeliusApiKey()}`)
  }
  return url
}

export function getBestRpcUrl(network: Network): string {
  if (network.type === 'EVM' && network.alchemyRpcUrl) {
    return resolveRpcUrl(network.alchemyRpcUrl)
  }
  return resolveRpcUrl(network.rpcUrl)
}

export function createProvider(rpcUrl: string, chainId?: number): ethers.JsonRpcProvider {
  const resolvedChainId = chainId ?? inferChainId(rpcUrl)

  if (resolvedChainId) {
    const staticNetwork = ethers.Network.from(resolvedChainId)
    return new ethers.JsonRpcProvider(rpcUrl, staticNetwork, { staticNetwork })
  }

  return new ethers.JsonRpcProvider(rpcUrl)
}

export function createProviderFromNetwork(network: Network): ethers.JsonRpcProvider {
  if (network.type !== 'EVM') {
    throw new Error(`Cannot create EVM provider for ${network.type} network: ${network.name}`)
  }

  const chainId = typeof network.chainId === 'number' ? network.chainId : Number(network.chainId)

  if (!Number.isInteger(chainId) || chainId < 0) {
    throw new Error(`Invalid EVM chainId: ${network.chainId}`)
  }

  return createProvider(getBestRpcUrl(network), chainId)
}