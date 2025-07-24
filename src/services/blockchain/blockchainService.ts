import { EVMWalletService } from './evmWallet'
import { SVMWalletService } from './svmWallet'
import { Wallet, Network, Transaction, TokenBalance } from '../../types'
import { db } from '../storage/database'

export interface BlockchainBalance {
  native: string
  nativeUSD: number
  tokens: TokenBalance[]
  totalUSD: number
}

export interface PriceData {
  [symbol: string]: {
    usd: number
    usd_24h_change: number
  }
}

class BlockchainService {
  private priceCache: Map<string, { data: PriceData; timestamp: number }> = new Map()
  private PRICE_CACHE_DURATION = 60000 // 1 minute

  async getBalance(wallet: Wallet, network: Network): Promise<BlockchainBalance> {
    try {
      // Get native balance
      const nativeBalance = wallet.type === 'EVM'
        ? await EVMWalletService.getBalance(wallet.address, network.rpcUrl)
        : await SVMWalletService.getBalance(wallet.address, network.rpcUrl)

      // Get price data - map SOL to solana for CoinGecko
      const priceId = network.symbol.toLowerCase() === 'sol' ? 'solana' : network.symbol.toLowerCase()
      const prices = await this.getPrices([priceId])
      const nativePrice = prices[priceId]?.usd || 0
      const nativeUSD = parseFloat(nativeBalance) * nativePrice

      // Fetch token balances
      const tokens: TokenBalance[] = []
      
      if (wallet.type === 'SVM') {
        // Fetch SPL token balances for Solana
        try {
          const tokenBalances = await this.getSPLTokenBalances(wallet.address, network.rpcUrl)
          tokens.push(...tokenBalances)
        } catch (error) {
          console.error('Failed to fetch SPL token balances:', error)
        }
      } else if (wallet.type === 'EVM') {
        // Fetch ERC-20 token balances for EVM chains
        try {
          const tokenBalances = await this.getERC20TokenBalances(wallet.address, network)
          tokens.push(...tokenBalances)
        } catch (error) {
          console.error('Failed to fetch ERC-20 token balances:', error)
        }
      }
      
      // Fetch token prices if we have tokens
      let tokensUSD = 0
      if (tokens.length > 0) {
        try {
          // Map token symbols to CoinGecko IDs
          const tokenPriceIds: Record<string, string> = {
            'USDC': 'usd-coin',
            'USDT': 'tether',
            'DAI': 'dai',
            'WBTC': 'wrapped-bitcoin',
            'BUSD': 'binance-usd',
          }
          
          const priceIdsToFetch = tokens
            .map(token => tokenPriceIds[token.symbol])
            .filter(id => id !== undefined)
          
          if (priceIdsToFetch.length > 0) {
            const tokenPrices = await this.getPrices(priceIdsToFetch)
            
            // Calculate USD value for each token
            tokens.forEach(token => {
              const priceId = tokenPriceIds[token.symbol]
              if (priceId && tokenPrices[priceId]) {
                const tokenUSD = parseFloat(token.balance) * tokenPrices[priceId].usd
                tokensUSD += tokenUSD
              }
            })
          }
        } catch (error) {
          console.error('Failed to fetch token prices:', error)
        }
      }
      
      return {
        native: nativeBalance,
        nativeUSD,
        tokens,
        totalUSD: nativeUSD + tokensUSD
      }
    } catch (error) {
      console.error('Failed to get balance:', error)
      return {
        native: '0',
        nativeUSD: 0,
        tokens: [],
        totalUSD: 0
      }
    }
  }

  async sendTransaction(
    wallet: Wallet,
    network: Network,
    to: string,
    amount: string,
    password: string
  ): Promise<string> {
    try {
      // Get private key
      const privateKey = await this.getWalletPrivateKey(wallet, password)
      
      // Send transaction
      const txHash = wallet.type === 'EVM'
        ? await EVMWalletService.sendTransaction(privateKey, to, amount, network.rpcUrl)
        : await SVMWalletService.sendTransaction(privateKey, to, amount, network.rpcUrl)
      
      // Store transaction in database
      await db.transactions.add({
        hash: txHash,
        from: wallet.address,
        to,
        value: amount,
        status: 'confirmed',
        timestamp: Date.now(),
        network: network.id
      })
      
      return txHash
    } catch (error) {
      console.error('Failed to send transaction:', error)
      throw error
    }
  }

  async sendToken(
    wallet: Wallet,
    network: Network,
    tokenAddress: string,
    to: string,
    amount: string,
    decimals: number,
    password: string
  ): Promise<string> {
    try {
      const privateKey = await this.getWalletPrivateKey(wallet, password)
      
      const txHash = wallet.type === 'EVM'
        ? await EVMWalletService.sendERC20Token(privateKey, tokenAddress, to, amount, decimals, network.rpcUrl)
        : await SVMWalletService.sendSPLToken(privateKey, tokenAddress, to, amount, network.rpcUrl)
      
      // Store transaction
      await db.transactions.add({
        hash: txHash,
        from: wallet.address,
        to,
        value: amount,
        status: 'confirmed',
        timestamp: Date.now(),
        network: network.id
      })
      
      return txHash
    } catch (error) {
      console.error('Failed to send token:', error)
      throw error
    }
  }

  async getTransactionHistory(wallet: Wallet, network: Network): Promise<Transaction[]> {
    // For now, return transactions from database
    // TODO: Integrate with blockchain explorers for full history
    const storedTransactions = await db.transactions
      .where('from')
      .equals(wallet.address)
      .or('to')
      .equals(wallet.address)
      .toArray()
    
    // Convert stored transactions to Transaction type
    return storedTransactions
      .filter(tx => tx.network === network.id)
      .map(tx => ({
        ...tx,
        timestamp: new Date(tx.timestamp)
      }))
  }

  async getPrices(symbols: string[]): Promise<PriceData> {
    const cacheKey = symbols.join(',')
    const cached = this.priceCache.get(cacheKey)
    
    if (cached && Date.now() - cached.timestamp < this.PRICE_CACHE_DURATION) {
      return cached.data
    }
    
    try {
      // Using CoinGecko API (free tier)
      const ids = symbols.join(',')
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`
      )
      
      if (!response.ok) {
        throw new Error('Failed to fetch prices')
      }
      
      const data = await response.json()
      this.priceCache.set(cacheKey, { data, timestamp: Date.now() })
      
      return data
    } catch (error) {
      console.error('Failed to fetch prices:', error)
      return {}
    }
  }

  private async getWalletPrivateKey(wallet: Wallet, password: string): Promise<string> {
    if (wallet.encryptedPrivateKey) {
      // Imported wallet
      return wallet.type === 'EVM'
        ? EVMWalletService.decryptPrivateKey(wallet.encryptedPrivateKey, password)
        : SVMWalletService.decryptPrivateKey(wallet.encryptedPrivateKey, password)
    } else {
      // Derived wallet from group
      const group = await db.walletGroups.get(wallet.groupId)
      if (!group) throw new Error('Wallet group not found')
      
      const decryptedSeed = wallet.type === 'EVM'
        ? EVMWalletService.decryptPrivateKey(group.encryptedSeed, password)
        : SVMWalletService.decryptPrivateKey(group.encryptedSeed, password)
      
      const derived = wallet.type === 'EVM'
        ? await EVMWalletService.deriveWalletFromSeed(decryptedSeed, wallet.derivationIndex)
        : await SVMWalletService.deriveWalletFromSeed(decryptedSeed, wallet.derivationIndex)
      
      return derived.privateKey
    }
  }

  validateAddress(address: string, type: 'EVM' | 'SVM'): boolean {
    return type === 'EVM'
      ? EVMWalletService.isValidAddress(address)
      : SVMWalletService.isValidAddress(address)
  }
  
  private async getERC20TokenBalances(walletAddress: string, network: Network): Promise<TokenBalance[]> {
    try {
      // Common ERC-20 tokens by network
      const commonTokens: Record<string, Array<{address: string, symbol: string, name: string, decimals: number}>> = {
        '1': [ // Ethereum Mainnet
          { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
          { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', symbol: 'USDT', name: 'Tether USD', decimals: 6 },
          { address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18 },
          { address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', symbol: 'WBTC', name: 'Wrapped BTC', decimals: 8 },
        ],
        '8453': [ // Base
          { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
          { address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18 },
        ],
        '56': [ // BSC
          { address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', symbol: 'USDC', name: 'USD Coin', decimals: 18 },
          { address: '0x55d398326f99059fF775485246999027B3197955', symbol: 'USDT', name: 'Tether USD', decimals: 18 },
          { address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', symbol: 'BUSD', name: 'Binance USD', decimals: 18 },
        ],
        '137': [ // Polygon
          { address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
          { address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', symbol: 'USDT', name: 'Tether USD', decimals: 6 },
          { address: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063', symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18 },
        ],
      }
      
      const networkTokens = commonTokens[network.chainId] || []
      const tokens: TokenBalance[] = []
      
      // Check balance for each common token
      for (const token of networkTokens) {
        try {
          const result = await EVMWalletService.getERC20Balance(
            token.address,
            walletAddress,
            network.rpcUrl
          )
          
          if (parseFloat(result.balance) > 0) {
            tokens.push({
              address: token.address,
              symbol: token.symbol,
              name: token.name,
              decimals: token.decimals,
              balance: result.balance,
              logoURI: undefined
            })
          }
        } catch (error) {
          console.error(`Failed to fetch balance for ${token.symbol}:`, error)
        }
      }
      
      return tokens
    } catch (error) {
      console.error('Failed to fetch ERC-20 token balances:', error)
      return []
    }
  }
  
  private async getSPLTokenBalances(walletAddress: string, rpcUrl: string): Promise<TokenBalance[]> {
    try {
      const { Connection, PublicKey } = await import('@solana/web3.js')
      const connection = new Connection(rpcUrl, 'confirmed')
      const walletPublicKey = new PublicKey(walletAddress)
      
      // Get all token accounts for the wallet
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(walletPublicKey, {
        programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
      })
      
      const tokens: TokenBalance[] = []
      
      for (const account of tokenAccounts.value) {
        const parsedInfo = account.account.data.parsed.info
        const balance = parsedInfo.tokenAmount.uiAmountString
        
        if (parseFloat(balance) > 0) {
          // For now, we'll use the mint address as the token name
          // In a real implementation, you'd want to fetch token metadata
          tokens.push({
            address: parsedInfo.mint,
            symbol: 'Unknown', // TODO: Fetch actual token symbol
            name: 'Unknown Token', // TODO: Fetch actual token name
            decimals: parsedInfo.tokenAmount.decimals,
            balance: balance,
            logoURI: undefined
          })
        }
      }
      
      return tokens
    } catch (error) {
      console.error('Failed to fetch SPL token balances:', error)
      return []
    }
  }
}

export const blockchainService = new BlockchainService()