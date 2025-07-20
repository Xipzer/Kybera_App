import { ethers } from 'ethers'
import { encryptData, decryptData } from '../../utils/crypto'

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
    index: number = 0
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
    const provider = new ethers.JsonRpcProvider(rpcUrl)
    const balance = await provider.getBalance(address)
    return ethers.formatEther(balance)
  }

  static async sendTransaction(
    privateKey: string,
    to: string,
    amount: string,
    rpcUrl: string,
  ): Promise<string> {
    const provider = new ethers.JsonRpcProvider(rpcUrl)
    const wallet = new ethers.Wallet(privateKey, provider)

    const tx = await wallet.sendTransaction({
      to,
      value: ethers.parseEther(amount),
    })

    await tx.wait()
    return tx.hash
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
    const provider = new ethers.JsonRpcProvider(rpcUrl)
    const wallet = new ethers.Wallet(privateKey, provider)

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
  }

  static async getERC20Balance(
    tokenAddress: string,
    walletAddress: string,
    rpcUrl: string,
  ): Promise<{ balance: string; decimals: number }> {
    const provider = new ethers.JsonRpcProvider(rpcUrl)
    
    const erc20Abi = [
      'function balanceOf(address account) view returns (uint256)',
      'function decimals() view returns (uint8)',
    ]
    
    const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, provider)
    
    const [balance, decimals] = await Promise.all([
      tokenContract.balanceOf(walletAddress),
      tokenContract.decimals(),
    ])
    
    return {
      balance: ethers.formatUnits(balance, decimals),
      decimals,
    }
  }
}