import { TokenDiscoveryProvider, TokenInfo } from '../types'

export class CovalentTokenDiscoveryProvider implements TokenDiscoveryProvider {
  name = 'Covalent'
  supportedChains = [1, 56, 137, 42161, 10, 8453] // Ethereum, BSC, Polygon, Arbitrum, Optimism, Base
  
  private apiKey = 'YOUR_COVALENT_API_KEY' // Replace with actual API key
  private baseUrl = 'https://api.covalenthq.com/v1'
  
  async discoverTokens(walletAddress: string, chainId: string | number): Promise<TokenInfo[]> {
    const numericChainId = typeof chainId === 'string' ? parseInt(chainId) : chainId
    
    if (!this.supportedChains.includes(numericChainId)) {
      return []
    }
    
    try {
      const url = `${this.baseUrl}/${numericChainId}/address/${walletAddress}/balances_v2/`
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'application/json'
        }
      })
      
      if (!response.ok) {
        if (response.status === 401) {
          console.error('Covalent API key invalid or missing')
          return []
        }
        throw new Error(`Covalent API error: ${response.statusText}`)
      }
      
      const data = await response.json()
      const tokens: TokenInfo[] = []
      
      for (const item of data.data?.items || []) {
        // Skip native token and tokens with 0 balance
        if (item.native_token || !item.balance || item.balance === '0') {
          continue
        }
        
        tokens.push({
          address: item.contract_address,
          symbol: item.contract_ticker_symbol || 'Unknown',
          name: item.contract_name || 'Unknown Token',
          decimals: item.contract_decimals || 18,
          logoURI: item.logo_url,
          chainId: numericChainId
        })
      }
      
      return tokens
    } catch (error) {
      console.error('Covalent token discovery error:', error)
      return []
    }
  }
}