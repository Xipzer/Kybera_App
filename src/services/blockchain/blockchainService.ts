import { EVMWalletService } from './evmWallet'
import { SVMWalletService } from './svmWallet'
import { Wallet, Network, Transaction, TokenBalance } from '../../types'
import { db } from '../storage/database'
import { memoryProtection } from '../security/memoryProtection'

export interface BlockchainBalance {
  native: string
  nativeUSD: number
  tokens: TokenBalance[]
  totalUSD: number
  totalUSDChange?: number // Percentage change since last refresh
  lastUpdated?: number // Timestamp of last successful update
}

export interface PriceData {
  [symbol: string]: {
    usd: number
    usd_24h_change: number
  }
}

class BlockchainService {
  private PRICE_CACHE_DURATION = 60000 // 1 minute
  private BALANCE_CACHE_DURATION = 30000 // 30 seconds for rate limiting

  async getBalance(wallet: Wallet, network: Network): Promise<BlockchainBalance> {
    // Validate network type matches wallet type
    if (wallet.type !== network.type) {
      console.error('Network type mismatch detected:', {
        walletType: wallet.type,
        walletAddress: wallet.address,
        networkType: network.type,
        networkName: network.name,
        networkRPC: network.rpcUrl
      })
      throw new Error(`Network type mismatch: wallet is ${wallet.type} but network is ${network.type}`)
    }
    
    // First, try to get cached balance
    const cachedBalance = await this.getCachedBalance(wallet, network)
    if (cachedBalance) {
      // Return cached balance immediately
      // But also trigger a background refresh if it's stale
      const isStale = Date.now() - cachedBalance.lastUpdated > this.BALANCE_CACHE_DURATION
      if (isStale) {
        this.refreshBalanceInBackground(wallet, network)
      }
      // Get cached token list
      const tokens = await this.getCachedTokenBalances(wallet, network)
      
      // Recalculate total USD from cached components
      let cachedTokensUSD = 0
      for (const token of tokens) {
        const cachedTokenData = await db.tokenBalances.get(
          `${wallet.address}_${network.id}_${token.address || 'native'}`
        )
        if (cachedTokenData?.usdValue) {
          cachedTokensUSD += cachedTokenData.usdValue
        }
      }
      
      const recalculatedTotalUSD = cachedBalance.nativeUSD + cachedTokensUSD
      
      // If recalculation yields 0 but we had a stored total, use the stored total
      const finalTotalUSD = recalculatedTotalUSD === 0 && cachedBalance.totalUSD > 0 
        ? cachedBalance.totalUSD 
        : recalculatedTotalUSD
      
      const totalUSDChange = this.calculateRefreshChange(finalTotalUSD, cachedBalance.previousTotalUSD)
      
      console.log('Returning cached balance:', {
        nativeUSD: cachedBalance.nativeUSD,
        cachedTokensUSD,
        recalculatedTotalUSD,
        storedTotalUSD: cachedBalance.totalUSD,
        finalTotalUSD,
        tokenCount: tokens.length
      })
      
      return {
        native: cachedBalance.nativeBalance,
        nativeUSD: cachedBalance.nativeUSD,
        tokens,
        totalUSD: finalTotalUSD,
        totalUSDChange,
        lastUpdated: cachedBalance.lastUpdated
      }
    }

    // No cache, fetch fresh data
    try {
      // Double-check network type before calling service
      if (wallet.type !== network.type) {
        throw new Error(`Cannot fetch balance: wallet type ${wallet.type} doesn't match network type ${network.type}`)
      }
      
      // Get native balance
      const nativeBalance = wallet.type === 'EVM'
        ? await EVMWalletService.getBalance(wallet.address, network.rpcUrl)
        : await SVMWalletService.getBalance(wallet.address, network.rpcUrl)

      // Get price data - map SOL to solana for CoinGecko
      const priceId = network.symbol.toLowerCase() === 'sol' ? 'solana' : network.symbol.toLowerCase()
      let nativePrice = 0
      let nativeUSD = 0
      
      try {
        const prices = await this.getPrices([priceId])
        nativePrice = prices[priceId]?.usd || 0
        nativeUSD = parseFloat(nativeBalance) * nativePrice
      } catch (priceError) {
        console.error('Failed to fetch native token price:', priceError)
        // Try to get cached price
        const cachedPrice = await db.priceData.get(priceId)
        if (cachedPrice) {
          nativePrice = cachedPrice.usdPrice
          nativeUSD = parseFloat(nativeBalance) * nativePrice
        }
      }

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
      const tokenUSDValues: Record<string, number> = {} // Track USD value per token
      
      if (tokens.length > 0) {
        try {
          // Map token symbols to CoinGecko IDs
          const tokenPriceIds: Record<string, string> = {
            'USDC': 'usd-coin',
            'USDT': 'tether',
            'DAI': 'dai',
            'WBTC': 'wrapped-bitcoin',
            'BUSD': 'binance-usd',
            'wSOL': 'solana',
            'mSOL': 'marinade-staked-sol',
            'BONK': 'bonk',
            'JUP': 'jupiter-exchange-solana',
            'PYTH': 'pyth-network',
            'UXD': 'uxd-stablecoin',
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
                tokenUSDValues[token.address || token.symbol] = tokenUSD
                tokensUSD += tokenUSD
              }
            })
          }
        } catch (error) {
          console.error('Failed to fetch token prices:', error)
          // Try to use cached price data if fresh fetch fails
          const tokenPriceIds: Record<string, string> = {
            'USDC': 'usd-coin',
            'USDT': 'tether',
            'DAI': 'dai',
            'WBTC': 'wrapped-bitcoin',
            'BUSD': 'binance-usd',
            'wSOL': 'solana',
            'mSOL': 'marinade-staked-sol',
            'BONK': 'bonk',
            'JUP': 'jupiter-exchange-solana',
            'PYTH': 'pyth-network',
            'UXD': 'uxd-stablecoin',
          }
          
          for (const token of tokens) {
            const priceId = tokenPriceIds[token.symbol]
            if (priceId) {
              const cachedPrice = await db.priceData.get(priceId)
              if (cachedPrice) {
                const tokenUSD = parseFloat(token.balance) * cachedPrice.usdPrice
                tokenUSDValues[token.address || token.symbol] = tokenUSD
                tokensUSD += tokenUSD
              }
            }
          }
        }
      }
      
      const totalUSD = nativeUSD + tokensUSD
      
      // Get previous balance for change calculation
      const balanceId = `${wallet.address}_${network.id}`
      const previousBalance = await db.walletBalances.get(balanceId)
      const totalUSDChange = this.calculateRefreshChange(totalUSD, previousBalance?.totalUSD)
      
      console.log('Storing balance to cache:', {
        walletAddress: wallet.address,
        networkId: network.id,
        nativeBalance,
        nativeUSD,
        tokensUSD,
        totalUSD,
        tokenCount: tokens.length
      })
      
      // Cache the balance data
      await db.walletBalances.put({
        id: balanceId,
        walletAddress: wallet.address,
        networkId: network.id,
        nativeBalance,
        nativeUSD,
        totalUSD,
        previousTotalUSD: previousBalance?.totalUSD,
        lastUpdated: Date.now()
      })
      
      // Cache token balances with USD values
      for (const token of tokens) {
        const tokenKey = token.address || token.symbol
        await db.tokenBalances.put({
          id: `${wallet.address}_${network.id}_${token.address || 'native'}`,
          walletAddress: wallet.address,
          networkId: network.id,
          tokenAddress: token.address || 'native',
          symbol: token.symbol,
          name: token.name,
          decimals: token.decimals,
          balance: token.balance,
          usdValue: tokenUSDValues[tokenKey] || 0,
          logoURI: token.logoURI,
          lastUpdated: Date.now()
        })
      }
      
      // Add USD values to tokens before returning
      const tokensWithUSD = tokens.map(token => ({
        ...token,
        usdValue: tokenUSDValues[token.address || token.symbol] || 0
      }))
      
      return {
        native: nativeBalance,
        nativeUSD,
        tokens: tokensWithUSD,
        totalUSD,
        totalUSDChange,
        lastUpdated: Date.now()
      }
    } catch (error) {
      console.error('Failed to get balance:', error)
      
      // Try to return cached data on error
      const cachedBalance = await this.getCachedBalance(wallet, network)
      if (cachedBalance) {
        const tokens = await this.getCachedTokenBalances(wallet, network)
        
        // Calculate total USD from cached values
        let cachedTokensUSD = 0
        for (const token of tokens) {
          // Get cached USD value for this token
          const cachedTokenData = await db.tokenBalances.get(
            `${wallet.address}_${network.id}_${token.address || 'native'}`
          )
          if (cachedTokenData?.usdValue) {
            cachedTokensUSD += cachedTokenData.usdValue
          }
        }
        
        // Recalculate total USD from cached components
        const recalculatedTotalUSD = cachedBalance.nativeUSD + cachedTokensUSD
        
        // If recalculation yields 0 but we had a stored total, use the stored total
        const finalTotalUSD = recalculatedTotalUSD === 0 && cachedBalance.totalUSD > 0 
          ? cachedBalance.totalUSD 
          : recalculatedTotalUSD
        
        const totalUSDChange = this.calculateRefreshChange(finalTotalUSD, cachedBalance.previousTotalUSD)
        
        console.log('Returning cached balance on error:', {
          nativeUSD: cachedBalance.nativeUSD,
          cachedTokensUSD,
          recalculatedTotalUSD,
          storedTotalUSD: cachedBalance.totalUSD,
          finalTotalUSD,
          tokenCount: tokens.length,
          error: error.message || error
        })
        
        return {
          native: cachedBalance.nativeBalance,
          nativeUSD: cachedBalance.nativeUSD,
          tokens,
          totalUSD: finalTotalUSD,
          totalUSDChange,
          lastUpdated: cachedBalance.lastUpdated
        }
      }
      
      // Only return zeros if no cached data available
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
    // Validate network type matches wallet type
    if (wallet.type !== network.type) {
      throw new Error(`Network type mismatch: wallet is ${wallet.type} but network is ${network.type}`)
    }
    
    // Store private key in secure memory temporarily
    const keyId = `send_tx_${Date.now()}`
    
    try {
      // Get private key and store securely
      const privateKey = await this.getWalletPrivateKey(wallet, password)
      memoryProtection.storeSensitive(keyId, privateKey, 30000) // 30 seconds max
      
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
    } finally {
      // Always wipe sensitive data
      memoryProtection.wipeSensitive(keyId)
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
    // Validate network type matches wallet type
    if (wallet.type !== network.type) {
      throw new Error(`Network type mismatch: wallet is ${wallet.type} but network is ${network.type}`)
    }
    
    // Store private key in secure memory temporarily
    const keyId = `send_token_${Date.now()}`
    
    try {
      const privateKey = await this.getWalletPrivateKey(wallet, password)
      memoryProtection.storeSensitive(keyId, privateKey, 30000) // 30 seconds max
      
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
    } finally {
      // Always wipe sensitive data
      memoryProtection.wipeSensitive(keyId)
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

  async estimateTransactionFee(
    wallet: Wallet,
    network: Network,
    to: string,
    amount: string
  ): Promise<string> {
    // Validate network type matches wallet type
    if (wallet.type !== network.type) {
      throw new Error(`Network type mismatch: wallet is ${wallet.type} but network is ${network.type}`)
    }
    
    try {
      if (wallet.type === 'EVM') {
        return await EVMWalletService.estimateGasFee(wallet.address, to, amount, network.rpcUrl)
      } else {
        return await SVMWalletService.estimateTransactionFee(wallet.address, to, amount, network.rpcUrl)
      }
    } catch (error) {
      console.error('Failed to estimate transaction fee:', error)
      // Return a safe default fee estimate
      return wallet.type === 'EVM' ? '0.001' : '0.000005'
    }
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
          // Note: DAI is not natively on Base, would need to be bridged
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
          // Don't log as error - some tokens might not exist on certain networks
          console.debug(`Could not fetch balance for ${token.symbol} on ${network.name}`)
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
      const { getMint } = await import('@solana/spl-token')
      const connection = new Connection(rpcUrl, 'confirmed')
      const walletPublicKey = new PublicKey(walletAddress)
      
      // Get all token accounts for the wallet
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(walletPublicKey, {
        programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
      })
      
      const tokens: TokenBalance[] = []
      
      // First, let's get all tokens and their basic info
      const tokenInfoMap = new Map<string, {symbol: string, name: string, logoURI?: string}>()
      
      // Fetch token registry once
      try {
        const response = await fetch('https://cdn.jsdelivr.net/gh/solana-labs/token-list@main/src/tokens/solana.tokenlist.json', {
          signal: AbortSignal.timeout(5000)
        })
        if (response.ok) {
          const tokenList = await response.json()
          tokenList.tokens.forEach((token: any) => {
            tokenInfoMap.set(token.address, {
              symbol: token.symbol,
              name: token.name,
              logoURI: token.logoURI
            })
          })
        }
      } catch (error) {
        console.error('Failed to fetch token registry:', error)
      }
      
      
      for (const account of tokenAccounts.value) {
        const parsedInfo = account.account.data.parsed.info
        const balance = parsedInfo.tokenAmount.uiAmountString
        
        if (parseFloat(balance) > 0) {
          const mintAddress = parsedInfo.mint
          
          // Start with default values
          let symbol = 'Unknown'
          let name = 'Unknown Token'
          let logoURI: string | undefined
          
          // Check the token registry first
          if (tokenInfoMap.has(mintAddress)) {
            const tokenInfo = tokenInfoMap.get(mintAddress)!
            symbol = tokenInfo.symbol
            name = tokenInfo.name
            logoURI = tokenInfo.logoURI
          }
          // For tokens not in registry, try to fetch metadata from multiple sources
          else {
            try {
              // First try Jupiter's token list (more comprehensive)
              const jupiterResponse = await fetch(`https://token.jup.ag/strict/token/${mintAddress}`, {
                signal: AbortSignal.timeout(3000)
              })
              
              if (jupiterResponse.ok) {
                const jupiterData = await jupiterResponse.json()
                if (jupiterData) {
                  symbol = jupiterData.symbol || symbol
                  name = jupiterData.name || name
                  logoURI = jupiterData.logoURI || logoURI
                }
              }
            } catch (err) {
              console.log(`Token ${mintAddress} not found in Jupiter registry`)
            }
            
            // If still unknown, try to parse on-chain metadata
            if (symbol === 'Unknown' || name === 'Unknown Token') {
              try {
                const METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')
                const [metadataPDA] = PublicKey.findProgramAddressSync(
                  [
                    Buffer.from('metadata'),
                    METADATA_PROGRAM_ID.toBuffer(),
                    new PublicKey(mintAddress).toBuffer(),
                  ],
                  METADATA_PROGRAM_ID
                )
                
                const metadataAccount = await connection.getAccountInfo(metadataPDA)
                
                if (metadataAccount && metadataAccount.data) {
                  // Use a more robust parsing approach
                  const data = metadataAccount.data
                  
                  // The metadata structure has fixed offsets
                  // Skip: discriminator (1) + update_authority (32) + mint (32) = 65
                  let offset = 65
                  
                  // Read name (4 bytes length + up to 32 bytes data)
                  const nameLen = data.readUInt32LE(offset)
                  offset += 4
                  if (nameLen > 0 && nameLen <= 32) {
                    const nameStr = data.slice(offset, offset + nameLen).toString('utf8').replace(/\0/g, '').trim()
                    if (nameStr) name = nameStr
                  }
                  offset += 32 // Skip to next field regardless of actual name length
                  
                  // Read symbol (4 bytes length + up to 10 bytes data)
                  const symbolLen = data.readUInt32LE(offset)
                  offset += 4
                  if (symbolLen > 0 && symbolLen <= 10) {
                    const symbolStr = data.slice(offset, offset + symbolLen).toString('utf8').replace(/\0/g, '').trim()
                    if (symbolStr) symbol = symbolStr
                  }
                  offset += 10 // Skip to next field
                  
                  // Read URI (4 bytes length + up to 200 bytes data)
                  const uriLen = data.readUInt32LE(offset)
                  offset += 4
                  if (uriLen > 0 && uriLen <= 200) {
                    const uri = data.slice(offset, offset + uriLen).toString('utf8').replace(/\0/g, '').trim()
                    
                    // Fetch metadata from URI if available
                    if (uri && uri.includes('.')) {
                      try {
                        let metadataUrl = uri
                        if (uri.startsWith('ipfs://')) {
                          metadataUrl = uri.replace('ipfs://', 'https://ipfs.io/ipfs/')
                        }
                        
                        const metadataResponse = await fetch(metadataUrl, { 
                          signal: AbortSignal.timeout(3000)
                        })
                        
                        if (metadataResponse.ok) {
                          const jsonMetadata = await metadataResponse.json()
                          // Prefer off-chain metadata as it's usually more complete
                          if (jsonMetadata.symbol) symbol = jsonMetadata.symbol
                          if (jsonMetadata.name) name = jsonMetadata.name
                          if (jsonMetadata.image) {
                            logoURI = jsonMetadata.image
                            if (logoURI?.startsWith('ipfs://')) {
                              logoURI = logoURI.replace('ipfs://', 'https://ipfs.io/ipfs/')
                            }
                          }
                        }
                      } catch (err) {
                        console.log('Failed to fetch off-chain metadata')
                      }
                    }
                  }
                }
              } catch (err) {
                console.log(`Could not fetch on-chain metadata for ${mintAddress}`)
              }
            }
          }
          
          tokens.push({
            address: mintAddress,
            symbol,
            name,
            decimals: parsedInfo.tokenAmount.decimals,
            balance: balance,
            logoURI
          })
        }
      }
      
      return tokens
    } catch (error) {
      console.error('Failed to fetch SPL token balances:', error)
      return []
    }
  }
  
  // Caching methods
  private async getCachedBalance(wallet: Wallet, network: Network): Promise<any> {
    try {
      const id = `${wallet.address}_${network.id}`
      const cached = await db.walletBalances.get(id)
      return cached
    } catch (error) {
      console.error('Failed to get cached balance:', error)
      return null
    }
  }
  
  private async getCachedTokenBalances(wallet: Wallet, network: Network): Promise<TokenBalance[]> {
    try {
      const tokenBalances = await db.tokenBalances
        .where('walletAddress')
        .equals(wallet.address)
        .and(item => item.networkId === network.id)
        .toArray()
      
      return tokenBalances.map(tb => ({
        address: tb.tokenAddress,
        symbol: tb.symbol,
        name: tb.name,
        decimals: tb.decimals,
        balance: tb.balance,
        usdValue: tb.usdValue,
        logoURI: tb.logoURI
      }))
    } catch (error) {
      console.error('Failed to get cached token balances:', error)
      return []
    }
  }
  
  private async refreshBalanceInBackground(wallet: Wallet, network: Network): Promise<void> {
    // Run in background without blocking
    setTimeout(async () => {
      try {
        // Validate network type matches wallet type
        if (wallet.type !== network.type) {
          console.error(`Network type mismatch: wallet is ${wallet.type} but network is ${network.type}`)
          return
        }
        
        // Fetch fresh data directly without going through getBalance to avoid recursion
        const nativeBalance = wallet.type === 'EVM'
          ? await EVMWalletService.getBalance(wallet.address, network.rpcUrl)
          : await SVMWalletService.getBalance(wallet.address, network.rpcUrl)

        // Get price data
        const priceId = network.symbol.toLowerCase() === 'sol' ? 'solana' : network.symbol.toLowerCase()
        let nativePrice = 0
        let nativeUSD = 0
        
        try {
          const prices = await this.getPrices([priceId])
          nativePrice = prices[priceId]?.usd || 0
          nativeUSD = parseFloat(nativeBalance) * nativePrice
        } catch (priceError) {
          console.error('Background refresh: Failed to fetch native token price:', priceError)
          // Try to get cached price
          const cachedPrice = await db.priceData.get(priceId)
          if (cachedPrice) {
            nativePrice = cachedPrice.usdPrice
            nativeUSD = parseFloat(nativeBalance) * nativePrice
          }
        }

        // Fetch token balances
        const tokens: TokenBalance[] = []
        
        if (wallet.type === 'SVM') {
          try {
            const tokenBalances = await this.getSPLTokenBalances(wallet.address, network.rpcUrl)
            tokens.push(...tokenBalances)
          } catch (error) {
            console.error('Failed to fetch SPL token balances:', error)
          }
        } else if (wallet.type === 'EVM') {
          try {
            const tokenBalances = await this.getERC20TokenBalances(wallet.address, network)
            tokens.push(...tokenBalances)
          } catch (error) {
            console.error('Failed to fetch ERC-20 token balances:', error)
          }
        }
        
        // Calculate token USD values
        let tokensUSD = 0
        const tokenUSDValues: Record<string, number> = {} // Track USD value per token
        
        if (tokens.length > 0) {
          const tokenPriceIds: Record<string, string> = {
            'USDC': 'usd-coin',
            'USDT': 'tether',
            'DAI': 'dai',
            'WBTC': 'wrapped-bitcoin',
            'BUSD': 'binance-usd',
            'wSOL': 'solana',
            'mSOL': 'marinade-staked-sol',
            'BONK': 'bonk',
            'JUP': 'jupiter-exchange-solana',
            'PYTH': 'pyth-network',
            'UXD': 'uxd-stablecoin',
          }
          
          const priceIdsToFetch = tokens
            .map(token => tokenPriceIds[token.symbol])
            .filter(id => id !== undefined)
          
          if (priceIdsToFetch.length > 0) {
            try {
              const tokenPrices = await this.getPrices(priceIdsToFetch)
              
              tokens.forEach(token => {
                const priceId = tokenPriceIds[token.symbol]
                if (priceId && tokenPrices[priceId]) {
                  const tokenUSD = parseFloat(token.balance) * tokenPrices[priceId].usd
                  tokenUSDValues[token.address || token.symbol] = tokenUSD
                  tokensUSD += tokenUSD
                }
              })
            } catch (priceError) {
              console.error('Failed to fetch fresh token prices in background:', priceError)
              // Try to use cached price data if fresh fetch fails
              for (const token of tokens) {
                const priceId = tokenPriceIds[token.symbol]
                if (priceId) {
                  const cachedPrice = await db.priceData.get(priceId)
                  if (cachedPrice) {
                    const tokenUSD = parseFloat(token.balance) * cachedPrice.usdPrice
                    tokenUSDValues[token.address || token.symbol] = tokenUSD
                    tokensUSD += tokenUSD
                  }
                }
              }
            }
          }
        }
        
        const totalUSD = nativeUSD + tokensUSD
        
        // Get previous balance
        const balanceId = `${wallet.address}_${network.id}`
        const previousBalance = await db.walletBalances.get(balanceId)
        
        // Always update cache with latest successful data
        await db.walletBalances.put({
          id: balanceId,
          walletAddress: wallet.address,
          networkId: network.id,
          nativeBalance,
          nativeUSD,
          totalUSD,
          previousTotalUSD: previousBalance?.totalUSD,
          lastUpdated: Date.now()
        })
        
        // Cache token balances with USD values
        for (const token of tokens) {
          const tokenKey = token.address || token.symbol
          await db.tokenBalances.put({
            id: `${wallet.address}_${network.id}_${token.address || 'native'}`,
            walletAddress: wallet.address,
            networkId: network.id,
            tokenAddress: token.address || 'native',
            symbol: token.symbol,
            name: token.name,
            decimals: token.decimals,
            balance: token.balance,
            usdValue: tokenUSDValues[tokenKey] || 0,
            logoURI: token.logoURI,
            lastUpdated: Date.now()
          })
        }
      } catch (error) {
        console.error('Failed to refresh balance in background:', error)
      }
    }, 0)
  }
  
  private calculateRefreshChange(currentUSD: number, previousUSD?: number): number {
    if (!previousUSD || previousUSD === 0) return 0
    return ((currentUSD - previousUSD) / previousUSD) * 100
  }
  
  async getPrices(symbols: string[]): Promise<PriceData> {
    try {
      // Check cache first
      const cachedPrices: PriceData = {}
      const symbolsToFetch: string[] = []
      
      for (const symbol of symbols) {
        const cached = await db.priceData.get(symbol)
        if (cached && Date.now() - cached.lastUpdated < this.PRICE_CACHE_DURATION) {
          cachedPrices[symbol] = {
            usd: cached.usdPrice,
            usd_24h_change: cached.usd24hChange
          }
        } else {
          symbolsToFetch.push(symbol)
        }
      }
      
      // If all prices are cached, return them
      if (symbolsToFetch.length === 0) {
        return cachedPrices
      }
      
      // Fetch missing prices
      // Use proxy in development to avoid CORS issues
      const isDev = import.meta.env.DEV
      const apiPath = `/api/v3/simple/price?ids=${symbolsToFetch.join(',')}&vs_currencies=usd&include_24hr_change=true`
      const apiUrl = isDev 
        ? `/api/coingecko${apiPath}`
        : `https://api.coingecko.com${apiPath}`
      
      const response = await fetch(apiUrl)
      
      if (!response.ok) {
        throw new Error('Failed to fetch prices')
      }
      
      const data = await response.json()
      
      // Cache the fetched prices and store history
      const now = Date.now()
      for (const [id, priceInfo] of Object.entries(data)) {
        const price = (priceInfo as any).usd || 0
        
        // Update current price
        await db.priceData.put({
          id,
          symbol: id,
          usdPrice: price,
          usd24hChange: (priceInfo as any).usd_24h_change || 0,
          lastUpdated: now
        })
        
        // Store price history (sample every hour to avoid too much data)
        const lastHistory = await db.priceHistory
          .where('symbol')
          .equals(id)
          .reverse()
          .sortBy('timestamp')
          .then(results => results[0])
        
        if (!lastHistory || now - lastHistory.timestamp > 3600000) { // 1 hour
          await db.priceHistory.put({
            id: `${id}_${now}`,
            symbol: id,
            usdPrice: price,
            timestamp: now
          })
          
          // Clean up old price history (keep only last 7 days)
          const cutoffTime = now - (7 * 24 * 60 * 60 * 1000)
          await db.priceHistory
            .where('symbol')
            .equals(id)
            .and(item => item.timestamp < cutoffTime)
            .delete()
        }
      }
      
      return { ...cachedPrices, ...data }
    } catch (error) {
      console.error('Failed to fetch prices:', error)
      
      // Return cached prices even if they're stale
      const stalePrices: PriceData = {}
      for (const symbol of symbols) {
        const cached = await db.priceData.get(symbol)
        if (cached) {
          stalePrices[symbol] = {
            usd: cached.usdPrice,
            usd_24h_change: cached.usd24hChange
          }
        }
      }
      
      return stalePrices
    }
  }
}

export const blockchainService = new BlockchainService()