import { TokenDiscoveryConfig } from '../services/tokenDiscovery/tokenDiscoveryService'

// Token discovery configuration
// For production, these should be environment variables
export const tokenDiscoveryConfig: TokenDiscoveryConfig = {
  // Alchemy API keys for different networks
  // Get your API keys from https://www.alchemy.com/
  alchemyApiKey: import.meta.env.VITE_ALCHEMY_API_KEY || undefined,
  
  // Moralis API key
  // Get your API key from https://moralis.io/
  moralisApiKey: import.meta.env.VITE_MORALIS_API_KEY || undefined,
  
  // Covalent API key
  // Get your API key from https://www.covalenthq.com/
  covalentApiKey: import.meta.env.VITE_COVALENT_API_KEY || undefined,
  
  // Etherscan API keys for different networks
  // Get your API keys from respective block explorers
  etherscanApiKeys: {
    1: import.meta.env.VITE_ETHERSCAN_API_KEY || undefined,
    56: import.meta.env.VITE_BSCSCAN_API_KEY || undefined,
    137: import.meta.env.VITE_POLYGONSCAN_API_KEY || undefined,
    42161: import.meta.env.VITE_ARBISCAN_API_KEY || undefined,
    10: import.meta.env.VITE_OPTIMISM_API_KEY || undefined,
    8453: import.meta.env.VITE_BASESCAN_API_KEY || undefined,
  },
  
  // Enable specific providers
  // IMPORTANT: tokenlist provider disabled to prevent loading thousands of tokens
  // which causes RPC rate limiting. Only enable specific providers with API keys.
  enabledProviders: [
    // 'tokenlist', // DISABLED - loads entire token lists causing RPC overload
    'solana',    // Always enabled - uses Solana token registry
    // Enable these when you have API keys:
    ...(import.meta.env.VITE_ALCHEMY_API_KEY ? ['alchemy'] : []),
    ...(import.meta.env.VITE_MORALIS_API_KEY ? ['moralis'] : []),
    ...(import.meta.env.VITE_COVALENT_API_KEY ? ['covalent'] : []),
    ...(import.meta.env.VITE_ETHERSCAN_API_KEY ? ['etherscan'] : []),
  ]
}

// Initialize token discovery with config
export function getTokenDiscoveryConfig(): TokenDiscoveryConfig {
  return tokenDiscoveryConfig
}