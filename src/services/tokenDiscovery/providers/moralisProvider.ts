import { TokenDiscoveryProvider, TokenInfo } from '../types'

export class MoralisTokenDiscoveryProvider implements TokenDiscoveryProvider {
  name = 'Moralis'
  supportedChains = [1, 56, 137, 42161, 10, 8453] // Ethereum, BSC, Polygon, Arbitrum, Optimism, Base
  
  private apiKey = 'YOUR_MORALIS_API_KEY' // Replace with actual API key
  private baseUrl = 'https://deep-index.moralis.io/api/v2.2'
  
  async discoverTokens(walletAddress: string, chainId: string | number): Promise<TokenInfo[]> {
    const numericChainId = typeof chainId === 'string' ? parseInt(chainId) : chainId
    
    if (!this.supportedChains.includes(numericChainId)) {
      return []
    }
    
    try {
      const chainHex = `0x${numericChainId.toString(16)}`
      const url = `${this.baseUrl}/${walletAddress}/erc20?chain=${chainHex}`
      
      const response = await fetch(url, {
        headers: {
          'X-API-Key': this.apiKey,
          'Accept': 'application/json'
        }
      })
      
      if (!response.ok) {
        if (response.status === 401) {
          console.error('Moralis API key invalid or missing')
          return []
        }
        throw new Error(`Moralis API error: ${response.statusText}`)
      }
      
      const data = await response.json()
      const tokens: TokenInfo[] = []
      
      for (const token of data.result || []) {
        // Only include tokens with balance > 0
        if (token.balance && token.balance !== '0') {
          tokens.push({
            address: token.token_address,
            symbol: token.symbol,
            name: token.name,
            decimals: token.decimals,
            logoURI: token.logo || token.thumbnail,
            chainId: numericChainId
          })
        }
      }
      
      return tokens
    } catch (error) {
      console.error('Moralis token discovery error:', error)
      return []
    }
  }
}