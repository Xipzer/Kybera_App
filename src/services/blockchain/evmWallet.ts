/**
 * Code by Xipzer
 */

import { ethers } from 'ethers'
import { decryptData, encryptData } from '../../utils/crypto'
import { memoryProtection } from '../security/memoryProtection'
import { createProvider } from './provider'

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
    const path = `m/44'/60'/0'/0/${index}`
    const wallet = ethers.HDNodeWallet.fromPhrase(mnemonic, undefined, path)
    return {
      address: wallet.address,
      privateKey: wallet.privateKey,
    }
  }

  static async importFromPrivateKey(privateKey: string): Promise<{ address: string }> {
    const wallet = new ethers.Wallet(privateKey)
    return { address: wallet.address }
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

  static async getBalance(address: string, rpcUrl: string, chainId: number): Promise<string> {
    const provider = createProvider(rpcUrl, chainId)
    try {
      return ethers.formatEther(await provider.getBalance(address))
    } finally {
      provider.destroy()
    }
  }

  static async sendTransaction(
    privateKey: string,
    to: string,
    amount: string,
    rpcUrl: string,
    chainId: number,
  ): Promise<string> {
    const keyId = `eth_tx_${Date.now()}`
    memoryProtection.storeSensitive(keyId, privateKey, 30000)

    const provider = createProvider(rpcUrl, chainId)
    try {
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
      memoryProtection.wipeSensitive(keyId)
      provider.destroy()
    }
  }

  static async encryptPrivateKey(privateKey: string, password: string): Promise<string> {
    return encryptData(privateKey, password)
  }

  static async decryptPrivateKey(encryptedPrivateKey: string, password: string): Promise<string> {
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
    chainId: number,
  ): Promise<string> {
    const provider = createProvider(rpcUrl, chainId)
    try {
      const gasLimit = await provider.estimateGas({
        from,
        to,
        value: ethers.parseEther(amount || '0'),
      })
      const fee = gasLimit * ((await provider.getFeeData()).gasPrice || 0n)
      return ethers.formatEther(fee)
    } catch (error) {
      console.error('Failed to estimate gas fee:', error)
      return '0.001'
    } finally {
      provider.destroy()
    }
  }

  static async sendToken(
    privateKey: string,
    rpcUrl: string,
    chainId: number,
    tokenAddress: string,
    to: string,
    amount: string,
    decimals: number,
  ): Promise<string> {
    const keyId = `eth_token_tx_${Date.now()}`
    memoryProtection.storeSensitive(keyId, privateKey, 30000)

    const provider = createProvider(rpcUrl, chainId)
    try {
      const securePrivateKey = memoryProtection.getSensitive(keyId)
      if (!securePrivateKey) throw new Error('Failed to retrieve secure key')

      const contract = new ethers.Contract(
        tokenAddress,
        ['function transfer(address to, uint256 amount) returns (bool)'],
        new ethers.Wallet(securePrivateKey, provider),
      )

      const tx = await contract.transfer(to, ethers.parseUnits(amount, decimals))
      await tx.wait()

      return tx.hash
    } finally {
      memoryProtection.wipeSensitive(keyId)
      provider.destroy()
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

  static async getERC20Balance(
    tokenAddress: string,
    walletAddress: string,
    rpcUrl: string,
    chainId: number,
  ): Promise<{ balance: string; decimals: number }> {
    const provider = createProvider(rpcUrl, chainId)
    try {
      const erc20Abi = [
        'function balanceOf(address account) view returns (uint256)',
        'function decimals() view returns (uint8)',
      ]
      const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, provider)

      if ((await provider.getCode(tokenAddress)) === '0x') {
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
      console.warn(`Failed to fetch ERC20 balance for ${tokenAddress}:`, error)
      return { balance: '0', decimals: 18 }
    } finally {
      provider.destroy()
    }
  }
}