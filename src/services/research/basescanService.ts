/**
 * Basescan/Etherscan API Service
 * Fetches on-chain data from block explorers
 */

import { ResearchNetwork } from '../../types/research'

export interface TokenHolder {
  address: string
  balance: string
  percentage: number
  isContract: boolean
  label?: string
}

export interface TokenInfo {
  contractAddress: string
  name: string
  symbol: string
  decimals: number
  totalSupply: string
  deployer: string
  deploymentTx: string
  deploymentBlock: number
  deploymentTime: Date
}

export interface ContractInfo {
  isVerified: boolean
  contractName?: string
  compilerVersion?: string
  sourceCode?: string
  abi?: string
}

// API URLs for different networks
const API_URLS: Record<ResearchNetwork, string> = {
  base: 'https://api.basescan.org/api',
  ethereum: 'https://api.etherscan.io/api',
  arbitrum: 'https://api.arbiscan.io/api',
  optimism: 'https://api-optimistic.etherscan.io/api',
  solana: '', // Solana uses different APIs
}

// Block explorer URLs
const EXPLORER_URLS: Record<ResearchNetwork, string> = {
  base: 'https://basescan.org',
  ethereum: 'https://etherscan.io',
  arbitrum: 'https://arbiscan.io',
  optimism: 'https://optimistic.etherscan.io',
  solana: 'https://solscan.io',
}

class BasescanService {
  private apiKey: string | null = null

  /**
   * Set API key for higher rate limits
   */
  setApiKey(key: string) {
    this.apiKey = key
  }

  /**
   * Get token info from contract
   */
  async getTokenInfo(contractAddress: string, network: ResearchNetwork): Promise<TokenInfo | null> {
    if (network === 'solana') {
      console.warn('[Basescan] Solana not supported, use Solscan API instead')
      return null
    }

    try {
      const apiUrl = API_URLS[network]

      // Get token info
      const params = new URLSearchParams({
        module: 'token',
        action: 'tokeninfo',
        contractaddress: contractAddress,
        ...(this.apiKey && { apikey: this.apiKey }),
      })

      const response = await fetch(`${apiUrl}?${params}`)
      const data = await response.json()

      if (data.status !== '1' || !data.result || data.result.length === 0) {
        // Try alternative: get contract creation info
        return await this.getContractCreationInfo(contractAddress, network)
      }

      const info = data.result[0]

      return {
        contractAddress: info.contractAddress,
        name: info.tokenName || '',
        symbol: info.symbol || '',
        decimals: parseInt(info.divisor) || 18,
        totalSupply: info.totalSupply || '0',
        deployer: info.creator || '',
        deploymentTx: '',
        deploymentBlock: 0,
        deploymentTime: new Date(),
      }
    } catch (error) {
      console.error('[Basescan] Error getting token info:', error)
      return null
    }
  }

  /**
   * Get contract creation info (deployer address)
   */
  async getContractCreationInfo(
    contractAddress: string,
    network: ResearchNetwork,
  ): Promise<TokenInfo | null> {
    if (network === 'solana') return null

    try {
      const apiUrl = API_URLS[network]

      const params = new URLSearchParams({
        module: 'contract',
        action: 'getcontractcreation',
        contractaddresses: contractAddress,
        ...(this.apiKey && { apikey: this.apiKey }),
      })

      const response = await fetch(`${apiUrl}?${params}`)
      const data = await response.json()

      if (data.status !== '1' || !data.result || data.result.length === 0) {
        return null
      }

      const info = data.result[0]

      return {
        contractAddress: contractAddress,
        name: '',
        symbol: '',
        decimals: 18,
        totalSupply: '0',
        deployer: info.contractCreator || '',
        deploymentTx: info.txHash || '',
        deploymentBlock: 0,
        deploymentTime: new Date(),
      }
    } catch (error) {
      console.error('[Basescan] Error getting contract creation info:', error)
      return null
    }
  }

  /**
   * Get top token holders
   */
  async getTopHolders(
    contractAddress: string,
    network: ResearchNetwork,
    limit: number = 100,
  ): Promise<TokenHolder[]> {
    if (network === 'solana') return []

    try {
      const apiUrl = API_URLS[network]

      // Note: The holders endpoint may require a paid API key
      const params = new URLSearchParams({
        module: 'token',
        action: 'tokenholderlist',
        contractaddress: contractAddress,
        page: '1',
        offset: limit.toString(),
        ...(this.apiKey && { apikey: this.apiKey }),
      })

      const response = await fetch(`${apiUrl}?${params}`)
      const data = await response.json()

      if (data.status !== '1' || !data.result) {
        return []
      }

      return data.result.map((holder: any) => ({
        address: holder.TokenHolderAddress,
        balance: holder.TokenHolderQuantity,
        percentage: 0, // Will need to calculate from total supply
        isContract: false, // Would need additional lookup
        label: holder.label,
      }))
    } catch (error) {
      console.error('[Basescan] Error getting top holders:', error)
      return []
    }
  }

  /**
   * Check if contract is verified
   */
  async isContractVerified(contractAddress: string, network: ResearchNetwork): Promise<boolean> {
    if (network === 'solana') return false

    try {
      const apiUrl = API_URLS[network]

      const params = new URLSearchParams({
        module: 'contract',
        action: 'getabi',
        address: contractAddress,
        ...(this.apiKey && { apikey: this.apiKey }),
      })

      const response = await fetch(`${apiUrl}?${params}`)
      const data = await response.json()

      return data.status === '1' && data.result !== 'Contract source code not verified'
    } catch (error) {
      console.error('[Basescan] Error checking contract verification:', error)
      return false
    }
  }

  /**
   * Get transaction count for an address
   */
  async getTransactionCount(address: string, network: ResearchNetwork): Promise<number> {
    if (network === 'solana') return 0

    try {
      const apiUrl = API_URLS[network]

      const params = new URLSearchParams({
        module: 'proxy',
        action: 'eth_getTransactionCount',
        address: address,
        tag: 'latest',
        ...(this.apiKey && { apikey: this.apiKey }),
      })

      const response = await fetch(`${apiUrl}?${params}`)
      const data = await response.json()

      if (data.result) {
        return parseInt(data.result, 16)
      }
      return 0
    } catch (error) {
      console.error('[Basescan] Error getting transaction count:', error)
      return 0
    }
  }

  /**
   * Get ETH/native balance for an address
   */
  async getBalance(address: string, network: ResearchNetwork): Promise<string> {
    if (network === 'solana') return '0'

    try {
      const apiUrl = API_URLS[network]

      const params = new URLSearchParams({
        module: 'account',
        action: 'balance',
        address: address,
        tag: 'latest',
        ...(this.apiKey && { apikey: this.apiKey }),
      })

      const response = await fetch(`${apiUrl}?${params}`)
      const data = await response.json()

      if (data.status === '1' && data.result) {
        // Convert from wei to ETH
        return (parseInt(data.result) / 1e18).toString()
      }
      return '0'
    } catch (error) {
      console.error('[Basescan] Error getting balance:', error)
      return '0'
    }
  }

  /**
   * Get explorer URL for a token
   */
  getTokenUrl(contractAddress: string, network: ResearchNetwork): string {
    return `${EXPLORER_URLS[network]}/token/${contractAddress}`
  }

  /**
   * Get explorer URL for an address
   */
  getAddressUrl(address: string, network: ResearchNetwork): string {
    return `${EXPLORER_URLS[network]}/address/${address}`
  }

  /**
   * Get explorer URL for a transaction
   */
  getTxUrl(txHash: string, network: ResearchNetwork): string {
    return `${EXPLORER_URLS[network]}/tx/${txHash}`
  }
}

export const basescanService = new BasescanService()
