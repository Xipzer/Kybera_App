import { TokenDiscoveryProvider, TokenInfo } from '../types'

export class SolanaTokenDiscoveryProvider implements TokenDiscoveryProvider {
  name = 'Solana'
  supportedChains = ['mainnet-beta', 'devnet', 'testnet']
  
  async discoverTokens(_walletAddress: string, chainId: string | number): Promise<TokenInfo[]> {
    if (typeof chainId === 'number' || !this.supportedChains.includes(chainId)) {
      return []
    }
    
    try {
      // For Solana, we'll discover tokens through:
      // 1. Token accounts owned by the wallet
      // 2. Jupiter token list for metadata
      // 3. Metaplex metadata for NFTs and custom tokens
      
      const tokens: TokenInfo[] = []
      
      // First, try Jupiter API for comprehensive token discovery
      try {
        const jupiterResponse = await fetch(`https://tokens.jup.ag/tokens?chainId=${chainId}`)
        if (jupiterResponse.ok) {
          const jupiterTokens = await jupiterResponse.json()
          
          // Create a map for quick lookup
          const tokenMap = new Map<string, any>()
          for (const token of jupiterTokens) {
            tokenMap.set(token.address, token)
          }
          
          // Get wallet's token accounts from the chain
          // This would be done in the main service using the existing getSPLTokenBalances
          // Here we just return the structure for token discovery
          
          return tokens
        }
      } catch (error) {
        console.error('Failed to fetch Jupiter token list:', error)
      }
      
      // Fallback to Solana token list
      try {
        const response = await fetch('https://cdn.jsdelivr.net/gh/solana-labs/token-list@main/src/tokens/solana.tokenlist.json')
        if (response.ok) {
          const tokenList = await response.json()
          
          // Filter for the specific network
          const networkTokens = tokenList.tokens.filter((token: any) => {
            if (chainId === 'mainnet-beta') return !token.chainId || token.chainId === 101
            if (chainId === 'devnet') return token.chainId === 103
            if (chainId === 'testnet') return token.chainId === 102
            return false
          })
          
          // Return token info structure
          return networkTokens.map((token: any) => ({
            address: token.address,
            symbol: token.symbol,
            name: token.name,
            decimals: token.decimals,
            logoURI: token.logoURI,
            chainId: chainId,
            tags: token.tags
          }))
        }
      } catch (error) {
        console.error('Failed to fetch Solana token list:', error)
      }
      
      return tokens
    } catch (error) {
      console.error('Solana token discovery error:', error)
      return []
    }
  }
  
  // Helper method to get token registry data
  async getTokenRegistry(chainId: string): Promise<Map<string, TokenInfo>> {
    const registry = new Map<string, TokenInfo>()
    
    try {
      // Fetch from multiple sources and merge
      const sources = [
        'https://cdn.jsdelivr.net/gh/solana-labs/token-list@main/src/tokens/solana.tokenlist.json',
        'https://tokens.jup.ag/tokens?chainId=' + chainId
      ]
      
      for (const source of sources) {
        try {
          const response = await fetch(source)
          if (response.ok) {
            const data = await response.json()
            const tokens = data.tokens || data
            
            for (const token of tokens) {
              if (!registry.has(token.address)) {
                registry.set(token.address, {
                  address: token.address,
                  symbol: token.symbol,
                  name: token.name,
                  decimals: token.decimals,
                  logoURI: token.logoURI,
                  chainId: chainId,
                  tags: token.tags
                })
              }
            }
          }
        } catch (error) {
          console.error(`Failed to fetch from ${source}:`, error)
        }
      }
    } catch (error) {
      console.error('Failed to build token registry:', error)
    }
    
    return registry
  }
}