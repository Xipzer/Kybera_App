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
      }
      
      // Calculate total USD value including tokens
      const tokensUSD = tokens.reduce((sum, _token) => {
        // For now, we don't have token prices, so just use 0
        // TODO: Fetch token prices from CoinGecko
        return sum
      }, 0)
      
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