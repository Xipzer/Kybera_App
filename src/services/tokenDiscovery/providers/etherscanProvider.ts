import { TokenDiscoveryProvider, TokenInfo } from '../types'

interface EtherscanNetwork {
  chainId: number
  apiUrl: string
  apiKey: string
}

export class EtherscanTokenDiscoveryProvider implements TokenDiscoveryProvider {
  name = 'Etherscan'
  supportedChains = [1, 56, 137, 42161, 10, 8453]
  
  private networks: EtherscanNetwork[] = [
    {
      chainId: 1,
      apiUrl: 'https://api.etherscan.io/api',
      apiKey: 'YOUR_ETHERSCAN_API_KEY'
    },
    {
      chainId: 56,
      apiUrl: 'https://api.bscscan.com/api',
      apiKey: 'YOUR_BSCSCAN_API_KEY'
    },
    {
      chainId: 137,
      apiUrl: 'https://api.polygonscan.com/api',
      apiKey: 'YOUR_POLYGONSCAN_API_KEY'
    },
    {
      chainId: 42161,
      apiUrl: 'https://api.arbiscan.io/api',
      apiKey: 'YOUR_ARBISCAN_API_KEY'
    },
    {
      chainId: 10,
      apiUrl: 'https://api-optimistic.etherscan.io/api',
      apiKey: 'YOUR_OPTIMISM_API_KEY'
    },
    {
      chainId: 8453,
      apiUrl: 'https://api.basescan.org/api',
      apiKey: 'YOUR_BASESCAN_API_KEY'
    }
  ]
  
  async discoverTokens(walletAddress: string, chainId: string | number): Promise<TokenInfo[]> {
    const numericChainId = typeof chainId === 'string' ? parseInt(chainId) : chainId
    const network = this.networks.find(n => n.chainId === numericChainId)
    
    if (!network) {
      return []
    }
    
    try {
      // Get ERC-20 token transfer events
      const url = new URL(network.apiUrl)
      url.searchParams.append('module', 'account')
      url.searchParams.append('action', 'tokentx')
      url.searchParams.append('address', walletAddress)
      url.searchParams.append('page', '1')
      url.searchParams.append('offset', '10000')
      url.searchParams.append('sort', 'desc')
      url.searchParams.append('apikey', network.apiKey)
      
      const response = await fetch(url.toString())
      
      if (!response.ok) {
        throw new Error(`Etherscan API error: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      if (data.status !== '1' || !data.result) {
        return []
      }
      
      // Extract unique tokens from transfer events
      const tokenMap = new Map<string, TokenInfo>()
      
      for (const tx of data.result) {
        const tokenAddress = tx.contractAddress.toLowerCase()
        
        if (!tokenMap.has(tokenAddress)) {
          tokenMap.set(tokenAddress, {
            address: tx.contractAddress,
            symbol: tx.tokenSymbol || 'Unknown',
            name: tx.tokenName || 'Unknown Token',
            decimals: parseInt(tx.tokenDecimal) || 18,
            chainId: numericChainId
          })
        }
      }
      
      // Get current balances for discovered tokens
      const tokens = Array.from(tokenMap.values())
      const tokensWithBalance: TokenInfo[] = []
      
      // Batch check balances (in production, use multicall)
      for (const token of tokens) {
        try {
          const balanceUrl = new URL(network.apiUrl)
          balanceUrl.searchParams.append('module', 'account')
          balanceUrl.searchParams.append('action', 'tokenbalance')
          balanceUrl.searchParams.append('contractaddress', token.address)
          balanceUrl.searchParams.append('address', walletAddress)
          balanceUrl.searchParams.append('tag', 'latest')
          balanceUrl.searchParams.append('apikey', network.apiKey)
          
          const balanceResponse = await fetch(balanceUrl.toString())
          if (balanceResponse.ok) {
            const balanceData = await balanceResponse.json()
            if (balanceData.status === '1' && balanceData.result !== '0') {
              tokensWithBalance.push(token)
            }
          }
        } catch (error) {
          console.error(`Failed to check balance for token ${token.address}:`, error)
        }
      }
      
      return tokensWithBalance
    } catch (error) {
      console.error('Etherscan token discovery error:', error)
      return []
    }
  }
}