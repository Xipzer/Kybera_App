/**
 * Token Swap Service
 * Integrates with Jupiter (Solana) and 1inch (EVM) for token swaps
 */

import { ethers } from 'ethers'
import { Connection, VersionedTransaction, PublicKey } from '@solana/web3.js'
import { createProvider } from '../blockchain/provider'

export interface SwapQuote {
  fromToken: string
  toToken: string
  fromAmount: string
  toAmount: string
  toAmountMin: string // With slippage
  priceImpact: number
  slippage: number
  estimatedGas?: string
  route: string[]
  provider: 'jupiter' | '1inch'
}

export interface SwapTransaction {
  txHash: string
  fromToken: string
  toToken: string
  fromAmount: string
  toAmount: string
  status: 'pending' | 'completed' | 'failed'
}

class SwapService {
  private readonly JUPITER_API_URL = 'https://quote-api.jup.ag/v6'
  private readonly ONEINCH_API_URL = 'https://api.1inch.dev/swap/v6.0'

  /**
   * Gets a swap quote for Solana (Jupiter)
   */
  async getJupiterQuote(
    fromToken: string,
    toToken: string,
    amount: string,
    slippage: number = 1.0,
  ): Promise<SwapQuote> {
    try {
      // Convert amount to lamports/smallest unit
      const amountLamports = Math.floor(parseFloat(amount) * 1e9) // Assumes 9 decimals

      const params = new URLSearchParams({
        inputMint: fromToken,
        outputMint: toToken,
        amount: amountLamports.toString(),
        slippageBps: Math.floor(slippage * 100).toString(), // Convert to basis points
      })

      const response = await fetch(`${this.JUPITER_API_URL}/quote?${params}`)

      if (!response.ok) {
        throw new Error(`Jupiter API error: ${response.statusText}`)
      }

      const data = await response.json()

      if (!data.outAmount) {
        throw new Error('No route found for this swap')
      }

      // Parse the quote
      const toAmount = (parseInt(data.outAmount) / 1e9).toString()
      const toAmountMin = (parseInt(data.otherAmountThreshold) / 1e9).toString()
      const priceImpact = data.priceImpactPct || 0

      return {
        fromToken,
        toToken,
        fromAmount: amount,
        toAmount,
        toAmountMin,
        priceImpact,
        slippage,
        route: data.routePlan?.map((r: any) => r.swapInfo?.label) || ['Jupiter'],
        provider: 'jupiter',
      }
    } catch (error: any) {
      console.error('[SwapService] Error getting Jupiter quote:', error)
      throw new Error(`Failed to get Jupiter quote: ${error.message}`)
    }
  }

  /**
   * Executes a swap on Solana using Jupiter
   */
  async executeJupiterSwap(
    privateKey: string,
    fromToken: string,
    toToken: string,
    amount: string,
    slippage: number,
    rpcUrl: string,
  ): Promise<SwapTransaction> {
    try {
      // Get quote first
      const quote = await this.getJupiterQuote(fromToken, toToken, amount, slippage)

      // Get swap transaction from Jupiter
      const swapResponse = await fetch(`${this.JUPITER_API_URL}/swap`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quoteResponse: quote,
          userPublicKey: this.getPublicKeyFromPrivateKey(privateKey).toString(),
          wrapAndUnwrapSol: true,
        }),
      })

      if (!swapResponse.ok) {
        throw new Error(`Jupiter swap error: ${swapResponse.statusText}`)
      }

      const { swapTransaction } = await swapResponse.json()

      // Deserialize and sign the transaction
      const connection = new Connection(rpcUrl)
      const swapTransactionBuf = Buffer.from(swapTransaction, 'base64')
      const transaction = VersionedTransaction.deserialize(swapTransactionBuf)

      // Sign with private key
      // Note: This is simplified, actual implementation would use Keypair from private key
      // transaction.sign([wallet.payer])

      // Send transaction
      const txid = await connection.sendRawTransaction(transaction.serialize(), {
        skipPreflight: true,
        maxRetries: 2,
      })

      // Wait for confirmation
      await connection.confirmTransaction(txid, 'confirmed')

      return {
        txHash: txid,
        fromToken,
        toToken,
        fromAmount: amount,
        toAmount: quote.toAmount,
        status: 'completed',
      }
    } catch (error: any) {
      console.error('[SwapService] Error executing Jupiter swap:', error)
      throw new Error(`Failed to execute Jupiter swap: ${error.message}`)
    }
  }

  /**
   * Gets a swap quote for EVM chains (1inch)
   */
  async get1inchQuote(
    chainId: number,
    fromToken: string,
    toToken: string,
    amount: string,
    slippage: number = 1.0,
    walletAddress: string,
  ): Promise<SwapQuote> {
    try {
      // Convert amount to wei/smallest unit (assumes 18 decimals)
      const amountWei = ethers.parseUnits(amount, 18).toString()

      const params = new URLSearchParams({
        src: fromToken,
        dst: toToken,
        amount: amountWei,
        from: walletAddress,
        slippage: slippage.toString(),
        disableEstimate: 'false',
      })

      // Note: 1inch API requires an API key for production use
      const response = await fetch(`${this.ONEINCH_API_URL}/${chainId}/quote?${params}`, {
        headers: {
          Authorization: 'Bearer YOUR_1INCH_API_KEY', // Would need to be configured
        },
      })

      if (!response.ok) {
        throw new Error(`1inch API error: ${response.statusText}`)
      }

      const data = await response.json()

      const toAmount = ethers.formatUnits(data.dstAmount, 18)
      const toAmountMin = ethers.formatUnits(
        BigInt(data.dstAmount) -
          (BigInt(data.dstAmount) * BigInt(Math.floor(slippage * 100))) / BigInt(10000),
        18,
      )

      return {
        fromToken,
        toToken,
        fromAmount: amount,
        toAmount,
        toAmountMin,
        priceImpact: 0, // 1inch doesn't provide this directly
        slippage,
        estimatedGas: data.estimatedGas || '0',
        route: data.protocols?.[0]?.map((p: any) => p.name) || ['1inch'],
        provider: '1inch',
      }
    } catch (error: any) {
      console.error('[SwapService] Error getting 1inch quote:', error)
      throw new Error(`Failed to get 1inch quote: ${error.message}`)
    }
  }

  /**
   * Executes a swap on EVM chains using 1inch
   */
  async execute1inchSwap(
    privateKey: string,
    chainId: number,
    fromToken: string,
    toToken: string,
    amount: string,
    slippage: number,
    rpcUrl: string,
  ): Promise<SwapTransaction> {
    try {
      const provider = createProvider(rpcUrl, chainId)
      const wallet = new ethers.Wallet(privateKey, provider)

      // Get swap transaction data from 1inch
      const amountWei = ethers.parseUnits(amount, 18).toString()

      const params = new URLSearchParams({
        src: fromToken,
        dst: toToken,
        amount: amountWei,
        from: wallet.address,
        slippage: slippage.toString(),
        disableEstimate: 'false',
      })

      const response = await fetch(`${this.ONEINCH_API_URL}/${chainId}/swap?${params}`, {
        headers: {
          Authorization: 'Bearer YOUR_1INCH_API_KEY', // Would need to be configured
        },
      })

      if (!response.ok) {
        throw new Error(`1inch swap error: ${response.statusText}`)
      }

      const data = await response.json()

      // If fromToken is not native, need to approve first
      if (fromToken !== ethers.ZeroAddress && fromToken.toLowerCase() !== 'native') {
        const erc20Abi = [
          'function approve(address spender, uint256 amount) returns (bool)',
          'function allowance(address owner, address spender) view returns (uint256)',
        ]

        const tokenContract = new ethers.Contract(fromToken, erc20Abi, wallet)
        const allowance = await tokenContract.allowance(wallet.address, data.tx.to)

        if (allowance < BigInt(amountWei)) {
          const approveTx = await tokenContract.approve(data.tx.to, amountWei)
          await approveTx.wait()
        }
      }

      // Execute swap
      const tx = await wallet.sendTransaction({
        to: data.tx.to,
        data: data.tx.data,
        value: data.tx.value,
        gasLimit: data.tx.gas,
      })

      await tx.wait()

      return {
        txHash: tx.hash,
        fromToken,
        toToken,
        fromAmount: amount,
        toAmount: ethers.formatUnits(data.dstAmount, 18),
        status: 'completed',
      }
    } catch (error: any) {
      console.error('[SwapService] Error executing 1inch swap:', error)
      throw new Error(`Failed to execute 1inch swap: ${error.message}`)
    }
  }

  /**
   * Universal swap quote getter (auto-detects chain type)
   */
  async getSwapQuote(
    chainType: 'EVM' | 'SVM',
    chainId: number | string,
    fromToken: string,
    toToken: string,
    amount: string,
    slippage: number,
    walletAddress: string,
  ): Promise<SwapQuote> {
    if (chainType === 'SVM') {
      return this.getJupiterQuote(fromToken, toToken, amount, slippage)
    } else {
      return this.get1inchQuote(
        chainId as number,
        fromToken,
        toToken,
        amount,
        slippage,
        walletAddress,
      )
    }
  }

  /**
   * Universal swap executor (auto-detects chain type)
   */
  async executeSwap(
    chainType: 'EVM' | 'SVM',
    chainId: number | string,
    privateKey: string,
    fromToken: string,
    toToken: string,
    amount: string,
    slippage: number,
    rpcUrl: string,
  ): Promise<SwapTransaction> {
    if (chainType === 'SVM') {
      return this.executeJupiterSwap(privateKey, fromToken, toToken, amount, slippage, rpcUrl)
    } else {
      return this.execute1inchSwap(
        privateKey,
        chainId as number,
        fromToken,
        toToken,
        amount,
        slippage,
        rpcUrl,
      )
    }
  }

  /**
   * Helper to derive public key from private key (Solana)
   */
  private getPublicKeyFromPrivateKey(_privateKey: string): PublicKey {
    // This is a placeholder - actual implementation would properly derive the public key
    // from the private key using Solana's keypair methods
    throw new Error('Not implemented - use proper Solana keypair derivation')
  }
}

export const swapService = new SwapService()
