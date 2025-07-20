/**
 * Code by Xipzer
 */

import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from '@solana/web3.js'
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createTransferInstruction,
  getAssociatedTokenAddress,
  getMint,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token'
import * as bip39 from 'bip39'
import { derivePath } from 'ed25519-hd-key'
import { decryptData, encryptData } from '../../utils/crypto'
import { memoryProtection } from '../security/memoryProtection'

export class SVMWalletService {
  static async createWallet(): Promise<{ address: string; privateKey: string; mnemonic: string }> {
    const mnemonic = bip39.generateMnemonic()
    const seed = await bip39.mnemonicToSeed(mnemonic)
    const derivedSeed = derivePath("m/44'/501'/0'/0'", seed.toString('hex')).key
    const keypair = Keypair.fromSeed(derivedSeed)

    return {
      address: keypair.publicKey.toBase58(),
      privateKey: Buffer.from(keypair.secretKey).toString('hex'),
      mnemonic,
    }
  }

  static async createSeedPhrase(): Promise<string> {
    return bip39.generateMnemonic()
  }

  static async deriveWalletFromSeed(
    mnemonic: string,
    index: number = 0,
  ): Promise<{ address: string; privateKey: string }> {
    const seed = await bip39.mnemonicToSeed(mnemonic)
    const derivedSeed = derivePath(`m/44'/501'/${index}'/0'`, seed.toString('hex')).key
    const keypair = Keypair.fromSeed(derivedSeed)

    return {
      address: keypair.publicKey.toBase58(),
      privateKey: Buffer.from(keypair.secretKey).toString('hex'),
    }
  }

  static async importFromPrivateKey(privateKey: string): Promise<{ address: string }> {
    const secretKey = Uint8Array.from(Buffer.from(privateKey, 'hex'))
    const keypair = Keypair.fromSecretKey(secretKey)
    return {
      address: keypair.publicKey.toBase58(),
    }
  }

  static async importFromMnemonic(
    mnemonic: string,
    derivationPath?: string,
  ): Promise<{ address: string; privateKey: string }> {
    const path = derivationPath || "m/44'/501'/0'/0'"
    const seed = await bip39.mnemonicToSeed(mnemonic)
    const keypair = Keypair.fromSeed(derivePath(path, seed.toString('hex')).key)

    return {
      address: keypair.publicKey.toBase58(),
      privateKey: Buffer.from(keypair.secretKey).toString('hex'),
    }
  }

  static async getBalance(address: string, rpcUrl: string): Promise<string> {
    try {
      const connection = new Connection(rpcUrl, 'confirmed')
      const publicKey = new PublicKey(address)
      return ((await connection.getBalance(publicKey)) / LAMPORTS_PER_SOL).toString()
    } catch (error) {
      console.error('Failed to fetch Solana balance:', error)
      throw error
    }
  }

  static async sendTransaction(
    privateKey: string,
    to: string,
    amount: string,
    rpcUrl: string,
  ): Promise<string> {
    const keyId = `tx_key_${Date.now()}`
    memoryProtection.storeSensitive(keyId, privateKey, 30000)

    try {
      const connection = new Connection(rpcUrl)
      const securePrivateKey = memoryProtection.getSensitive(keyId)
      if (!securePrivateKey) throw new Error('Failed to retrieve secure key')

      const secretKey = Uint8Array.from(Buffer.from(securePrivateKey, 'hex'))
      const fromKeypair = Keypair.fromSecretKey(secretKey)

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: fromKeypair.publicKey,
          toPubkey: new PublicKey(to),
          lamports: Number(amount) * LAMPORTS_PER_SOL,
        }),
      )

      const signature = await connection.sendTransaction(transaction, [fromKeypair])
      await connection.confirmTransaction(signature)

      secretKey.fill(0)

      return signature
    } finally {
      memoryProtection.wipeSensitive(keyId)
    }
  }

  static async encryptPrivateKey(privateKey: string, password: string): Promise<string> {
    return encryptData(privateKey, password)
  }

  static async decryptPrivateKey(encryptedPrivateKey: string, password: string): Promise<string> {
    return decryptData(encryptedPrivateKey, password)
  }

  static isValidAddress(address: string): boolean {
    try {
      new PublicKey(address)
      return true
    } catch {
      return false
    }
  }

  static async estimateTransactionFee(
    from: string,
    to: string,
    amount: string,
    rpcUrl: string,
  ): Promise<string> {
    try {
      const connection = new Connection(rpcUrl, 'confirmed')

      const { blockhash } = await connection.getLatestBlockhash()

      const transaction = new Transaction()
      transaction.recentBlockhash = blockhash
      transaction.feePayer = new PublicKey(from)

      transaction.add(
        SystemProgram.transfer({
          fromPubkey: new PublicKey(from),
          toPubkey: new PublicKey(to),
          lamports: parseFloat(amount || '0') * LAMPORTS_PER_SOL,
        }),
      )

      const fee = await connection.getFeeForMessage(transaction.compileMessage(), 'confirmed')

      if (fee.value === null) {
        return '0.00089'
      }

      let totalFee = fee.value

      const priorityFee = 850000
      totalFee += priorityFee

      totalFee += 35000

      return (totalFee / LAMPORTS_PER_SOL).toString()
    } catch (error) {
      console.error('Failed to estimate transaction fee:', error)
      return '0.00089'
    }
  }

  static isValidPrivateKey(privateKey: string): boolean {
    try {
      const secretKey = Uint8Array.from(Buffer.from(privateKey, 'hex'))
      Keypair.fromSecretKey(secretKey)
      return true
    } catch {
      return false
    }
  }

  static async sendSPLToken(
    privateKey: string,
    tokenMintAddress: string,
    to: string,
    amount: string,
    rpcUrl: string,
  ): Promise<string> {
    const keyId = `spl_key_${Date.now()}`
    memoryProtection.storeSensitive(keyId, privateKey, 30000)

    try {
      const connection = new Connection(rpcUrl)
      const securePrivateKey = memoryProtection.getSensitive(keyId)
      if (!securePrivateKey) throw new Error('Failed to retrieve secure key')

      const secretKey = Uint8Array.from(Buffer.from(securePrivateKey, 'hex'))
      const fromKeypair = Keypair.fromSecretKey(secretKey)
      const toPublicKey = new PublicKey(to)
      const mintPublicKey = new PublicKey(tokenMintAddress)

      const mintInfo = await getMint(connection, mintPublicKey)

      const fromTokenAccount = await getAssociatedTokenAddress(
        mintPublicKey,
        fromKeypair.publicKey,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID,
      )

      const toTokenAccount = await getAssociatedTokenAddress(
        mintPublicKey,
        toPublicKey,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID,
      )

      const signature = await connection.sendTransaction(
        new Transaction().add(
          createTransferInstruction(
            fromTokenAccount,
            toTokenAccount,
            fromKeypair.publicKey,
            BigInt(Math.floor(parseFloat(amount) * Math.pow(10, mintInfo.decimals))),
            [],
            TOKEN_PROGRAM_ID,
          ),
        ),
        [fromKeypair],
      )
      await connection.confirmTransaction(signature)

      secretKey.fill(0)

      return signature
    } finally {
      memoryProtection.wipeSensitive(keyId)
    }
  }

  static async getSPLTokenBalance(
    tokenMintAddress: string,
    walletAddress: string,
    rpcUrl: string,
  ): Promise<{ balance: string; decimals: number }> {
    const connection = new Connection(rpcUrl)
    const walletPublicKey = new PublicKey(walletAddress)
    const mintPublicKey = new PublicKey(tokenMintAddress)

    const mintInfo = await getMint(connection, mintPublicKey)

    const tokenAccount = await getAssociatedTokenAddress(
      mintPublicKey,
      walletPublicKey,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    )

    try {
      return {
        balance:
          (await connection.getTokenAccountBalance(tokenAccount)).value.uiAmountString || '0',
        decimals: mintInfo.decimals,
      }
    } catch {
      return {
        balance: '0',
        decimals: mintInfo.decimals,
      }
    }
  }

  static async sendTokenTransaction(
    privateKey: string,
    toAddress: string,
    amount: string,
    tokenAddress: string,
    rpcUrl: string,
  ): Promise<string> {
    return this.sendSPLToken(privateKey, tokenAddress, toAddress, amount, rpcUrl)
  }
}