import { ethers } from 'ethers'
import { decryptData, encryptData } from '../../utils/crypto'
import { memoryProtection } from '../security/memoryProtection'

export class EVMWalletService {
  static async createWallet(): Promise<{ address: string; privateKey: string; mnemonic: string }> {
    const wallet = ethers.Wallet.createRandom()
    return {
      address: wallet.address,
      privateKey: wallet.privateKey,
      mnemonic: wallet.mnemonic!.phrase,
    }
  }

  static async createSeedPhrase(): Promise<string> {
    const wallet = ethers.Wallet.createRandom()
    return wallet.mnemonic!.phrase
  }

  static async deriveWalletFromSeed(
    mnemonic: string,
    index: number = 0,
  ): Promise<{ address: string; privateKey: string }> {
    // BIP44 path for Ethereum: m/44'/60'/0'/0/index
    const path = `m/44'/60'/0'/0/${index}`
    const wallet = ethers.HDNodeWallet.fromPhrase(mnemonic, undefined, path)
    return {
      address: wallet.address,
      privateKey: wallet.privateKey,
    }
  }

  static async importFromPrivateKey(privateKey: string): Promise<{ address: string }> {
    const wallet = new ethers.Wallet(privateKey)
    return {
      address: wallet.address,
    }
  }

  static async importFromMnemonic(
    mnemonic: string,
  ): Promise<{ address: string; privateKey: string }> {
    const wallet = ethers.Wallet.fromPhrase(mnemonic)
    return {
      address: wallet.address,
      privateKey: wallet.privateKey,
    }
  }

  static async getBalance(address: string, rpcUrl: string): Promise<string> {
    // Check if this is a Solana RPC URL
    if (rpcUrl.includes('solana') || rpcUrl.includes('helius-rpc.com')) {
      throw new Error('Cannot use EVM wallet service with Solana RPC endpoint')
    }

    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl)
      const balance = await provider.getBalance(address)
      return ethers.formatEther(balance)
    } catch (error: any) {
      // Check if this is a network detection error that might indicate wrong RPC type
      if (
        error.message?.includes('failed to detect network') &&
        rpcUrl.includes('helius-rpc.com')
      ) {
        throw new Error(
          'Attempted to use Solana RPC endpoint with EVM wallet. Please check network configuration.',
        )
      }
      throw error
    }
  }

  static async sendTransaction(
    privateKey: string,
    to: string,
    amount: string,
    rpcUrl: string,
  ): Promise<string> {
    // Check if this is a Solana RPC URL
    if (rpcUrl.includes('solana') || rpcUrl.includes('helius-rpc.com')) {
      throw new Error('Cannot use EVM wallet service with Solana RPC endpoint')
    }

    // Store private key securely during transaction
    const keyId = `eth_tx_${Date.now()}`
    memoryProtection.storeSensitive(keyId, privateKey, 30000) // 30 second timeout

    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl)
      const securePrivateKey = memoryProtection.getSensitive(keyId)
      if (!securePrivateKey) throw new Error('Failed to retrieve secure key')

      const wallet = new ethers.Wallet(securePrivateKey, provider)

      const tx = await wallet.sendTransaction({
        to,
        value: ethers.parseEther(amount),
      })

      await tx.wait()
      return tx.hash
    } finally {
      // Always wipe the key
      memoryProtection.wipeSensitive(keyId)
    }
  }

  static encryptPrivateKey(privateKey: string, password: string): string {
    return encryptData(privateKey, password)
  }

  static decryptPrivateKey(encryptedPrivateKey: string, password: string): string {
    return decryptData(encryptedPrivateKey, password)
  }

  static isValidAddress(address: string): boolean {
    return ethers.isAddress(address)
  }

  static async estimateGasFee(
    from: string,
    to: string,
    amount: string,
    rpcUrl: string,
  ): Promise<string> {
    // Check if this is a Solana RPC URL
    if (rpcUrl.includes('solana') || rpcUrl.includes('helius-rpc.com')) {
      throw new Error('Cannot use EVM wallet service with Solana RPC endpoint')
    }

    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl)

      // Estimate gas for a simple transfer
      const gasLimit = await provider.estimateGas({
        from,
        to,
        value: ethers.parseEther(amount || '0'),
      })

      // Get current gas price
      const gasPrice = await provider.getFeeData()

      // Calculate fee (gasLimit * gasPrice)
      const fee = gasLimit * (gasPrice.gasPrice || 0n)

      // Convert to ETH
      return ethers.formatEther(fee)
    } catch (error) {
      console.error('Failed to estimate gas fee:', error)
      // Return a reasonable default
      return '0.001'
    }
  }

  // Alias for compatibility
  static async estimateTransactionFee(
    from: string,
    rpcUrl: string,
    to: string,
    amount?: string,
  ): Promise<string> {
    return this.estimateGasFee(from, to, amount || '0', rpcUrl)
  }

  static async sendToken(
    privateKey: string,
    rpcUrl: string,
    tokenAddress: string,
    to: string,
    amount: string,
    decimals: number,
  ): Promise<string> {
    // Store private key securely during transaction
    const keyId = `eth_token_tx_${Date.now()}`
    memoryProtection.storeSensitive(keyId, privateKey, 30000) // 30 second timeout

    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl)
      const securePrivateKey = memoryProtection.getSensitive(keyId)
      if (!securePrivateKey) throw new Error('Failed to retrieve secure key')

      const wallet = new ethers.Wallet(securePrivateKey, provider)

      // ERC20 ABI for transfer
      const erc20Abi = ['function transfer(address to, uint256 amount) returns (bool)']
      const contract = new ethers.Contract(tokenAddress, erc20Abi, wallet)

      // Convert amount to token units
      const tokenAmount = ethers.parseUnits(amount, decimals)

      // Send transaction
      const tx = await contract.transfer(to, tokenAmount)
      await tx.wait()

      return tx.hash
    } finally {
      // Always wipe the key
      memoryProtection.wipeSensitive(keyId)
    }
  }

  static isValidPrivateKey(privateKey: string): boolean {
    try {
      new ethers.Wallet(privateKey)
      return true
    } catch {
      return false
    }
  }

  static async sendERC20Token(
    privateKey: string,
    tokenAddress: string,
    to: string,
    amount: string,
    decimals: number,
    rpcUrl: string,
  ): Promise<string> {
    // Check if this is a Solana RPC URL
    if (rpcUrl.includes('solana') || rpcUrl.includes('helius-rpc.com')) {
      throw new Error('Cannot use EVM wallet service with Solana RPC endpoint')
    }

    // Store private key securely
    const keyId = `erc20_key_${Date.now()}`
    memoryProtection.storeSensitive(keyId, privateKey, 30000)

    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl)
      const securePrivateKey = memoryProtection.getSensitive(keyId)
      if (!securePrivateKey) throw new Error('Failed to retrieve secure key')

      const wallet = new ethers.Wallet(securePrivateKey, provider)

      // ERC20 ABI for transfer function
      const erc20Abi = [
        'function transfer(address to, uint256 amount) returns (bool)',
        'function balanceOf(address account) view returns (uint256)',
        'function decimals() view returns (uint8)',
      ]

      const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, wallet)

      // Convert amount to smallest unit based on decimals
      const amountInWei = ethers.parseUnits(amount, decimals)

      // Send the transaction
      const tx = await tokenContract.transfer(to, amountInWei)
      await tx.wait()

      return tx.hash
    } finally {
      // Always wipe the key
      memoryProtection.wipeSensitive(keyId)
    }
  }

  static async getERC20Balance(
    tokenAddress: string,
    walletAddress: string,
    rpcUrl: string,
  ): Promise<{ balance: string; decimals: number }> {
    // Check if this is a Solana RPC URL
    if (rpcUrl.includes('solana') || rpcUrl.includes('helius-rpc.com')) {
      throw new Error('Cannot use EVM wallet service with Solana RPC endpoint')
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl)

    try {
      const erc20Abi = [
        'function balanceOf(address account) view returns (uint256)',
        'function decimals() view returns (uint8)',
      ]

      const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, provider)

      // Check if the contract exists by getting the code
      const code = await provider.getCode(tokenAddress)
      if (code === '0x') {
        throw new Error('Contract does not exist at this address')
      }

      const [balance, decimals] = await Promise.all([
        tokenContract.balanceOf(walletAddress),
        tokenContract.decimals(),
      ])

      return {
        balance: ethers.formatUnits(balance, decimals),
        decimals,
      }
    } catch (error) {
      // If contract doesn't exist or call fails, return zero balance
      console.warn(`Failed to fetch ERC20 balance for ${tokenAddress}:`, error)
      return {
        balance: '0',
        decimals: 18,
      }
    } finally {
      // Clean up provider
      provider.destroy()
    }
  }

  // Alias for compatibility with action handlers
  static async sendTokenTransaction(
    privateKey: string,
    toAddress: string,
    amount: string,
    tokenAddress: string,
    rpcUrl: string,
  ): Promise<string> {
    // Assumes 18 decimals - should fetch from contract in production
    return this.sendERC20Token(privateKey, tokenAddress, toAddress, amount, 18, rpcUrl)
  }
}