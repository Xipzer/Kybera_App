import { Keypair, Connection, PublicKey, LAMPORTS_PER_SOL, SystemProgram, Transaction } from '@solana/web3.js'
import { getAssociatedTokenAddress, createTransferInstruction, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getMint } from '@solana/spl-token'
import * as bip39 from 'bip39'
import { derivePath } from 'ed25519-hd-key'
import { encryptData, decryptData } from '../../utils/crypto'

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
    index: number = 0
  ): Promise<{ address: string; privateKey: string }> {
    const seed = await bip39.mnemonicToSeed(mnemonic)
    // BIP44 path for Solana: m/44'/501'/index'/0'
    const path = `m/44'/501'/${index}'/0'`
    const derivedSeed = derivePath(path, seed.toString('hex')).key
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
    const seed = await bip39.mnemonicToSeed(mnemonic)
    const path = derivationPath || "m/44'/501'/0'/0'"
    const derivedSeed = derivePath(path, seed.toString('hex')).key
    const keypair = Keypair.fromSeed(derivedSeed)

    return {
      address: keypair.publicKey.toBase58(),
      privateKey: Buffer.from(keypair.secretKey).toString('hex'),
    }
  }

  static async getBalance(address: string, rpcUrl: string): Promise<string> {
    try {
      const connection = new Connection(rpcUrl, 'confirmed')
      const publicKey = new PublicKey(address)
      const balance = await connection.getBalance(publicKey)
      console.log(`Solana balance for ${address}: ${balance} lamports = ${balance / LAMPORTS_PER_SOL} SOL`)
      return (balance / LAMPORTS_PER_SOL).toString()
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
    const connection = new Connection(rpcUrl)
    const secretKey = Uint8Array.from(Buffer.from(privateKey, 'hex'))
    const fromKeypair = Keypair.fromSecretKey(secretKey)
    const toPublicKey = new PublicKey(to)

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: fromKeypair.publicKey,
        toPubkey: toPublicKey,
        lamports: Number(amount) * LAMPORTS_PER_SOL,
      }),
    )

    const signature = await connection.sendTransaction(transaction, [fromKeypair])
    await connection.confirmTransaction(signature)

    return signature
  }

  static encryptPrivateKey(privateKey: string, password: string): string {
    return encryptData(privateKey, password)
  }

  static decryptPrivateKey(encryptedPrivateKey: string, password: string): string {
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
    rpcUrl: string
  ): Promise<string> {
    try {
      const connection = new Connection(rpcUrl, 'confirmed')
      
      // Get recent blockhash for fee calculation
      const { blockhash } = await connection.getLatestBlockhash()
      
      // Create a dummy transaction to estimate fees
      const transaction = new Transaction()
      transaction.recentBlockhash = blockhash
      transaction.feePayer = new PublicKey(from)
      
      // Add transfer instruction
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: new PublicKey(from),
          toPubkey: new PublicKey(to),
          lamports: parseFloat(amount || '0') * LAMPORTS_PER_SOL
        })
      )
      
      // Get fee for this transaction
      const fee = await connection.getFeeForMessage(
        transaction.compileMessage(),
        'confirmed'
      )
      
      if (fee.value === null) {
        // Fallback to default fee with priority
        return '0.00089'
      }
      
      // Base fee in lamports
      let totalFee = fee.value
      
      // Add priority fee (common on Solana now)
      // Using a realistic priority fee based on current network conditions
      // This matches what wallets like Phantom use (~0.00085 SOL)
      const priorityFee = 850000 // 0.00085 SOL in lamports
      totalFee += priorityFee
      
      // Add small buffer for safety
      totalFee += 35000 // 0.000035 SOL
      
      // Convert lamports to SOL
      return (totalFee / LAMPORTS_PER_SOL).toString()
    } catch (error) {
      console.error('Failed to estimate transaction fee:', error)
      // Return default Solana fee with priority (base + priority + buffer)
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
    const connection = new Connection(rpcUrl)
    const secretKey = Uint8Array.from(Buffer.from(privateKey, 'hex'))
    const fromKeypair = Keypair.fromSecretKey(secretKey)
    const toPublicKey = new PublicKey(to)
    const mintPublicKey = new PublicKey(tokenMintAddress)

    // Get the token mint info to determine decimals
    const mintInfo = await getMint(connection, mintPublicKey)
    
    // Get the associated token accounts
    const fromTokenAccount = await getAssociatedTokenAddress(
      mintPublicKey,
      fromKeypair.publicKey,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    )
    
    const toTokenAccount = await getAssociatedTokenAddress(
      mintPublicKey,
      toPublicKey,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    )

    // Convert amount to smallest unit based on decimals
    const amountInSmallestUnit = BigInt(Math.floor(parseFloat(amount) * Math.pow(10, mintInfo.decimals)))

    // Create the transfer instruction
    const transferInstruction = createTransferInstruction(
      fromTokenAccount,
      toTokenAccount,
      fromKeypair.publicKey,
      amountInSmallestUnit,
      [],
      TOKEN_PROGRAM_ID
    )

    // Create and send transaction
    const transaction = new Transaction().add(transferInstruction)
    const signature = await connection.sendTransaction(transaction, [fromKeypair])
    await connection.confirmTransaction(signature)

    return signature
  }

  static async getSPLTokenBalance(
    tokenMintAddress: string,
    walletAddress: string,
    rpcUrl: string,
  ): Promise<{ balance: string; decimals: number }> {
    const connection = new Connection(rpcUrl)
    const walletPublicKey = new PublicKey(walletAddress)
    const mintPublicKey = new PublicKey(tokenMintAddress)

    // Get mint info for decimals
    const mintInfo = await getMint(connection, mintPublicKey)
    
    // Get associated token account
    const tokenAccount = await getAssociatedTokenAddress(
      mintPublicKey,
      walletPublicKey,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    )

    try {
      // Get token account balance
      const accountInfo = await connection.getTokenAccountBalance(tokenAccount)
      return {
        balance: accountInfo.value.uiAmountString || '0',
        decimals: mintInfo.decimals,
      }
    } catch {
      // Token account doesn't exist, return 0 balance
      return {
        balance: '0',
        decimals: mintInfo.decimals,
      }
    }
  }
}