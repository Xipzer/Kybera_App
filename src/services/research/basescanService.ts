/**
 * Code by Xipzer
 */

import { ResearchNetwork } from '../../types/research'
import { getExplorerUrl, getChainType } from '../../utils/networks'

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

const API_URLS: Record<ResearchNetwork, string> = {
  base: 'https://api.basescan.org/api',
  ethereum: 'https://api.etherscan.io/api',
  arbitrum: 'https://api.arbiscan.io/api',
  optimism: 'https://api-optimistic.etherscan.io/api',
  solana: '',
}

class BasescanService {
  private apiKey: string | null = null

  setApiKey(key: string) {
    this.apiKey = key
  }

  async getTokenInfo(contractAddress: string, network: ResearchNetwork): Promise<TokenInfo | null> {
    if (getChainType(network) === 'SVM') {
      console.warn('[Basescan] SVM networks not supported, use Solscan API instead')
      return null
    }

    try {
      const params = new URLSearchParams({
        module: 'token',
        action: 'tokeninfo',
        contractaddress: contractAddress,
        ...(this.apiKey && { apikey: this.apiKey }),
      })

      const response = await fetch(`${API_URLS[network]}?${params}`)
      const data = await response.json()

      if (data.status !== '1' || !data.result || data.result.length === 0) {
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

  async getContractCreationInfo(
    contractAddress: string,
    network: ResearchNetwork,
  ): Promise<TokenInfo | null> {
    if (getChainType(network) === 'SVM') return null

    try {
      const params = new URLSearchParams({
        module: 'contract',
        action: 'getcontractcreation',
        contractaddresses: contractAddress,
        ...(this.apiKey && { apikey: this.apiKey }),
      })

      const response = await fetch(`${API_URLS[network]}?${params}`)
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

  async getTopHolders(
    contractAddress: string,
    network: ResearchNetwork,
    limit: number = 100,
  ): Promise<TokenHolder[]> {
    if (getChainType(network) === 'SVM') return []

    try {
      const params = new URLSearchParams({
        module: 'token',
        action: 'tokenholderlist',
        contractaddress: contractAddress,
        page: '1',
        offset: limit.toString(),
        ...(this.apiKey && { apikey: this.apiKey }),
      })

      const response = await fetch(`${API_URLS[network]}?${params}`)
      const data = await response.json()

      if (data.status !== '1' || !data.result) {
        return []
      }

      return data.result.map((holder: { TokenHolderAddress: string; TokenHolderQuantity: string; label?: string }) => ({
        address: holder.TokenHolderAddress,
        balance: holder.TokenHolderQuantity,
        percentage: 0,
        isContract: false,
        label: holder.label,
      }))
    } catch (error) {
      console.error('[Basescan] Error getting top holders:', error)
      return []
    }
  }

  async isContractVerified(contractAddress: string, network: ResearchNetwork): Promise<boolean> {
    if (getChainType(network) === 'SVM') return false

    try {
      const params = new URLSearchParams({
        module: 'contract',
        action: 'getabi',
        address: contractAddress,
        ...(this.apiKey && { apikey: this.apiKey }),
      })

      const response = await fetch(`${API_URLS[network]}?${params}`)
      const data = await response.json()

      return data.status === '1' && data.result !== 'Contract source code not verified'
    } catch (error) {
      console.error('[Basescan] Error checking contract verification:', error)
      return false
    }
  }

  async getTransactionCount(address: string, network: ResearchNetwork): Promise<number> {
    if (getChainType(network) === 'SVM') return 0

    try {
      const params = new URLSearchParams({
        module: 'proxy',
        action: 'eth_getTransactionCount',
        address: address,
        tag: 'latest',
        ...(this.apiKey && { apikey: this.apiKey }),
      })

      const response = await fetch(`${API_URLS[network]}?${params}`)
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

  async getBalance(address: string, network: ResearchNetwork): Promise<string> {
    if (getChainType(network) === 'SVM') return '0'

    try {
      const params = new URLSearchParams({
        module: 'account',
        action: 'balance',
        address: address,
        tag: 'latest',
        ...(this.apiKey && { apikey: this.apiKey }),
      })

      const data = await (await fetch(`${API_URLS[network]}?${params}`)).json()

      if (data.status === '1' && data.result) {
        return (parseInt(data.result) / 1e18).toString()
      }
      return '0'
    } catch (error) {
      console.error('[Basescan] Error getting balance:', error)
      return '0'
    }
  }

  getTokenUrl(contractAddress: string, network: ResearchNetwork): string {
    return `${getExplorerUrl(network)}/token/${contractAddress}`
  }

  getAddressUrl(address: string, network: ResearchNetwork): string {
    return `${getExplorerUrl(network)}/address/${address}`
  }

  getTxUrl(txHash: string, network: ResearchNetwork): string {
    return `${getExplorerUrl(network)}/tx/${txHash}`
  }
}

export const basescanService = new BasescanService()