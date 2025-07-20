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
}