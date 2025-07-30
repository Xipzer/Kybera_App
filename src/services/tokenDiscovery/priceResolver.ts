
interface PriceInfo {
  usd: number
  usd_24h_change: number
}

export class TokenPriceResolver {
  private lastApiCall = 0
  private minApiDelay = 1000 // 1 second between API calls
  
  private async rateLimit() {
    const now = Date.now()
    const timeSinceLastCall = now - this.lastApiCall
    if (timeSinceLastCall < this.minApiDelay) {
      await new Promise(resolve => setTimeout(resolve, this.minApiDelay - timeSinceLastCall))
    }
    this.lastApiCall = Date.now()
  }
  
  async getTokenPrices(
    tokens: Array<{ address: string; symbol: string }>,
    chainId: string | number
  ): Promise<Record<string, PriceInfo>> {
    const prices: Record<string, PriceInfo> = {}
    
    // For EVM chains, try to get prices by contract address
    if (typeof chainId === 'number') {
      const platformIds: Record<number, string> = {
        1: 'ethereum',
        56: 'binance-smart-chain',
        137: 'polygon-pos',
        8453: 'base',
        42161: 'arbitrum-one',
        10: 'optimistic-ethereum'
      }
      
      const platformId = platformIds[chainId]
      if (platformId) {
        const contractAddresses = tokens.map(t => t.address).filter(addr => addr)
        
        if (contractAddresses.length > 0) {
          try {
            const tokenPrices = await this.getTokenPricesByContract(platformId, contractAddresses)
            
            for (const [address, price] of Object.entries(tokenPrices)) {
              prices[address] = price
            }
          } catch (error) {
            console.error('Failed to fetch EVM token prices:', error)
          }
        }
      }
    }
    
    // For Solana and tokens without prices, try various methods
    const tokensWithoutPrices = tokens.filter(token => !prices[token.address])
    
    if (tokensWithoutPrices.length > 0) {
      // Method 1: Try Jupiter API for Solana tokens
      if (typeof chainId === 'string' && chainId.includes('solana')) {
        try {
          const jupiterPrices = await this.getJupiterPrices(tokensWithoutPrices.map(t => t.address))
          for (const [address, price] of Object.entries(jupiterPrices)) {
            prices[address] = price
          }
        } catch (error) {
          console.error('Failed to fetch Jupiter prices:', error)
        }
      }
      
      // Method 2: Try CoinGecko by symbol mapping
      const symbolToPriceId: Record<string, string> = {
        // Stablecoins
        'USDC': 'usd-coin',
        'USDT': 'tether',
        'DAI': 'dai',
        'BUSD': 'binance-usd',
        'TUSD': 'true-usd',
        'USDP': 'paxos-standard',
        'GUSD': 'gemini-dollar',
        
        // Major tokens
        'WETH': 'weth',
        'WBTC': 'wrapped-bitcoin',
        'BNB': 'binancecoin',
        'MATIC': 'matic-network',
        'AVAX': 'avalanche-2',
        'SOL': 'solana',
        'wSOL': 'solana',
        
        // Solana ecosystem
        'mSOL': 'marinade-staked-sol',
        'BONK': 'bonk',
        'JUP': 'jupiter-exchange-solana',
        'PYTH': 'pyth-network',
        'ORCA': 'orca',
        'RAY': 'raydium',
        'SRM': 'serum',
        'MNDE': 'marinade',
        
        // Popular DeFi tokens
        'UNI': 'uniswap',
        'SUSHI': 'sushi',
        'AAVE': 'aave',
        'COMP': 'compound-governance-token',
        'MKR': 'maker',
        'SNX': 'synthetix-network-token',
        'CRV': 'curve-dao-token',
        'LDO': 'lido-dao',
        
        // Layer 2 tokens
        'ARB': 'arbitrum',
        'OP': 'optimism',
        
        // Other popular tokens
        'LINK': 'chainlink',
        'SAND': 'the-sandbox',
        'MANA': 'decentraland',
        'AXS': 'axie-infinity',
        'ENS': 'ethereum-name-service',
        'APE': 'apecoin',
        'SHIB': 'shiba-inu',
        'PEPE': 'pepe',
      }
      
      const symbolsToFetch = tokensWithoutPrices
        .filter(token => symbolToPriceId[token.symbol])
        .map(token => ({ symbol: token.symbol, address: token.address, priceId: symbolToPriceId[token.symbol] }))
      
      if (symbolsToFetch.length > 0) {
        try {
          const priceIds = symbolsToFetch.map(t => t.priceId)
          const coinGeckoPrices = await this.getCoinGeckoPrices(priceIds)
          
          for (const tokenInfo of symbolsToFetch) {
            if (coinGeckoPrices[tokenInfo.priceId]) {
              prices[tokenInfo.address] = coinGeckoPrices[tokenInfo.priceId]
            }
          }
        } catch (error) {
          console.error('Failed to fetch CoinGecko prices:', error)
        }
      }
    }
    
    return prices
  }
  
  private async getTokenPricesByContract(
    platformId: string,
    contractAddresses: string[]
  ): Promise<Record<string, PriceInfo>> {
    try {
      await this.rateLimit()
      
      const isDev = import.meta.env.DEV
      const apiPath = `/api/v3/simple/token_price/${platformId}?contract_addresses=${contractAddresses.join(',')}&vs_currencies=usd&include_24hr_change=true`
      const apiUrl = isDev 
        ? `/api/coingecko${apiPath}`
        : `https://api.coingecko.com${apiPath}`
      
      const response = await fetch(apiUrl)
      
      if (!response.ok) {
        throw new Error('Failed to fetch token prices')
      }
      
      const data = await response.json()
      const prices: Record<string, PriceInfo> = {}
      
      for (const [address, priceData] of Object.entries(data)) {
        prices[address] = {
          usd: (priceData as any).usd || 0,
          usd_24h_change: (priceData as any).usd_24h_change || 0
        }
      }
      
      return prices
    } catch (error) {
      console.error('Failed to fetch token prices by contract:', error)
      return {}
    }
  }
  
  private async getCoinGeckoPrices(priceIds: string[]): Promise<Record<string, PriceInfo>> {
    try {
      await this.rateLimit()
      
      const isDev = import.meta.env.DEV
      const apiPath = `/api/v3/simple/price?ids=${priceIds.join(',')}&vs_currencies=usd&include_24hr_change=true`
      const apiUrl = isDev 
        ? `/api/coingecko${apiPath}`
        : `https://api.coingecko.com${apiPath}`
      
      const response = await fetch(apiUrl)
      
      if (!response.ok) {
        throw new Error('Failed to fetch prices')
      }
      
      const data = await response.json()
      const prices: Record<string, PriceInfo> = {}
      
      for (const [id, priceData] of Object.entries(data)) {
        prices[id] = {
          usd: (priceData as any).usd || 0,
          usd_24h_change: (priceData as any).usd_24h_change || 0
        }
      }
      
      return prices
    } catch (error) {
      console.error('Failed to fetch CoinGecko prices:', error)
      return {}
    }
  }
  
  private async getJupiterPrices(mintAddresses: string[]): Promise<Record<string, PriceInfo>> {
    try {
      const response = await fetch(`https://price.jup.ag/v4/price?ids=${mintAddresses.join(',')}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch Jupiter prices')
      }
      
      const data = await response.json()
      const prices: Record<string, PriceInfo> = {}
      
      for (const [mint, priceData] of Object.entries(data.data || {})) {
        prices[mint] = {
          usd: (priceData as any).price || 0,
          usd_24h_change: 0 // Jupiter doesn't provide 24h change
        }
      }
      
      return prices
    } catch (error: any) {
      // Check if it's a CSP error
      if (error.message?.includes('Content Security Policy') || error.message?.includes('Failed to fetch')) {
        console.warn('Jupiter price API blocked by CSP - falling back to symbol-based pricing')
      } else {
        console.error('Failed to fetch Jupiter prices:', error)
      }
      return {}
    }
  }
}

export const tokenPriceResolver = new TokenPriceResolver()