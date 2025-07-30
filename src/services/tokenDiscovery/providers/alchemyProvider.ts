import { TokenDiscoveryProvider, TokenInfo } from '../types'

export class AlchemyTokenDiscoveryProvider implements TokenDiscoveryProvider {
  name = 'Alchemy'
  supportedChains = [1, 137, 42161, 10, 8453] // Ethereum, Polygon, Arbitrum, Optimism, Base
  
  private apiKeys: Record<number, string> = {
    1: 'demo', // Replace with actual API key
    137: 'demo',
    42161: 'demo', 
    10: 'demo',
    8453: 'demo'
  }
  
  private getAlchemyUrl(chainId: number): string {
    const apiKey = this.apiKeys[chainId] || 'demo'
    const networks: Record<number, string> = {
      1: 'eth-mainnet',
      137: 'polygon-mainnet',
      42161: 'arb-mainnet',
      10: 'opt-mainnet',
      8453: 'base-mainnet'
    }
    
    const network = networks[chainId]
    if (!network) throw new Error(`Unsupported chain ID: ${chainId}`)
    
    return `https://${network}.g.alchemy.com/v2/${apiKey}`
  }
  
  async discoverTokens(walletAddress: string, chainId: string | number): Promise<TokenInfo[]> {
    const numericChainId = typeof chainId === 'string' ? parseInt(chainId) : chainId
    
    if (!this.supportedChains.includes(numericChainId)) {
      return []
    }
    
    try {
      const url = this.getAlchemyUrl(numericChainId)
      
      // Use Alchemy's getTokenBalances endpoint
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'alchemy_getTokenBalances',
          params: [walletAddress],
          id: 1
        })
      })
      
      if (!response.ok) {
        throw new Error(`Alchemy API error: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      if (data.error) {
        throw new Error(`Alchemy API error: ${data.error.message}`)
      }
      
      const tokenBalances = data.result?.tokenBalances || []
      const tokens: TokenInfo[] = []
      
      // Fetch metadata for each token with balance > 0
      for (const tokenBalance of tokenBalances) {
        // Check if balance is greater than 0
        if (tokenBalance.tokenBalance && tokenBalance.tokenBalance !== '0x0') {
          try {
            // Get token metadata
            const metadataResponse = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'alchemy_getTokenMetadata',
                params: [tokenBalance.contractAddress],
                id: 1
              })
            })
            
            if (metadataResponse.ok) {
              const metadataData = await metadataResponse.json()
              const metadata = metadataData.result
              
              if (metadata) {
                tokens.push({
                  address: tokenBalance.contractAddress,
                  symbol: metadata.symbol || 'Unknown',
                  name: metadata.name || 'Unknown Token',
                  decimals: metadata.decimals || 18,
                  logoURI: metadata.logo,
                  chainId: numericChainId
                })
              }
            }
          } catch (error) {
            console.error(`Failed to fetch metadata for token ${tokenBalance.contractAddress}:`, error)
          }
        }
      }
      
      return tokens
    } catch (error) {
      console.error('Alchemy token discovery error:', error)
      return []
    }
  }
}