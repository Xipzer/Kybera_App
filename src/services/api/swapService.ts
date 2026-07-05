/**
 * Code by Xipzer
 */

import { ethers } from 'ethers'
import { Connection, VersionedTransaction, PublicKey } from '@solana/web3.js'
import { createProvider } from '../blockchain/provider'

const KYBERSWAP_API_URL = 'https://aggregator-api.kyberswap.com'
const KYBERSWAP_CLIENT_ID = 'kybera'

const CHAIN_NAME_MAP: Record<number, string> = {
  1: 'ethereum',
  8453: 'base',
  56: 'bsc',
  137: 'polygon',
  42161: 'arbitrum',
  10: 'optimism',
}

interface JupiterRoutePlan {
  swapInfo?: { label?: string }
}

interface JupiterQuoteResponse {
  outAmount?: string
  otherAmountThreshold?: string
  priceImpactPct?: number
  routePlan?: JupiterRoutePlan[]
}

interface KyberRouteHop {
  exchange: string
}

export interface KyberRouteSummary {
  amountOut: string
  gas?: string
  route?: KyberRouteHop[][]
  [key: string]: unknown
}

interface KyberRoutesResponse {
  code?: number
  message?: string
  data?: {
    routeSummary?: KyberRouteSummary
    routerAddress?: string
  }
}

export interface SwapQuote {
  fromToken: string
  toToken: string
  fromAmount: string
  toAmount: string
  toAmountMin: string
  priceImpact: number
  slippage: number
  estimatedGas?: string
  route: string[]
  provider: 'jupiter' | 'kyberswap'
  routeSummary?: KyberRouteSummary
  routerAddress?: string
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

  async getJupiterQuote(
    fromToken: string,
    toToken: string,
    amount: string,
    slippage: number = 1.0,
  ): Promise<SwapQuote> {
    try {
      const params = new URLSearchParams({
        inputMint: fromToken,
        outputMint: toToken,
        amount: Math.floor(parseFloat(amount) * 1e9).toString(),
        slippageBps: Math.floor(slippage * 100).toString(),
      })

      const response = await fetch(`${this.JUPITER_API_URL}/quote?${params}`)

      if (!response.ok) {
        throw new Error(`Jupiter API error: ${response.statusText}`)
      }

      const data = (await response.json()) as JupiterQuoteResponse

      if (!data.outAmount) {
        throw new Error('No route found for this swap')
      }

      return {
        fromToken,
        toToken,
        fromAmount: amount,
        toAmount: (parseInt(data.outAmount) / 1e9).toString(),
        toAmountMin: (parseInt(data.otherAmountThreshold as string) / 1e9).toString(),
        priceImpact: data.priceImpactPct || 0,
        slippage,
        route: (data.routePlan?.map((r) => r.swapInfo?.label) as string[]) || ['Jupiter'],
        provider: 'jupiter',
      }
    } catch (error) {
      console.error('[SwapService] Error getting Jupiter quote:', error)
      throw new Error(`Failed to get Jupiter quote: ${(error as Error).message}`)
    }
  }

  async executeJupiterSwap(
    privateKey: string,
    fromToken: string,
    toToken: string,
    amount: string,
    slippage: number,
    rpcUrl: string,
  ): Promise<SwapTransaction> {
    try {
      const quote = await this.getJupiterQuote(fromToken, toToken, amount, slippage)

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
      const connection = new Connection(rpcUrl)

      const txid = await connection.sendRawTransaction(
        VersionedTransaction.deserialize(Buffer.from(swapTransaction, 'base64')).serialize(),
        { skipPreflight: true, maxRetries: 2 },
      )

      await connection.confirmTransaction(txid, 'confirmed')

      return {
        txHash: txid,
        fromToken,
        toToken,
        fromAmount: amount,
        toAmount: quote.toAmount,
        status: 'completed',
      }
    } catch (error) {
      console.error('[SwapService] Error executing Jupiter swap:', error)
      throw new Error(`Failed to execute Jupiter swap: ${(error as Error).message}`)
    }
  }

  async getKyberSwapQuote(
    chainId: number,
    fromToken: string,
    toToken: string,
    amount: string,
    slippage: number = 1.0,
    _walletAddress: string,
  ): Promise<SwapQuote> {
    if (!CHAIN_NAME_MAP[chainId]) throw new Error(`Unsupported chain for swaps: ${chainId}`)
    try {

      const response = await fetch(
        `${KYBERSWAP_API_URL}/${CHAIN_NAME_MAP[chainId]}/api/v1/routes?${new URLSearchParams({
          tokenIn:
            fromToken === ethers.ZeroAddress || fromToken.toLowerCase() === 'native'
              ? '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
              : fromToken,
          tokenOut:
            toToken === ethers.ZeroAddress || toToken.toLowerCase() === 'native'
              ? '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
              : toToken,
          amountIn: ethers.parseUnits(amount, 18).toString(),
        })}`,
        {
          headers: { 'x-client-id': KYBERSWAP_CLIENT_ID },
        },
      )

      if (!response.ok) {
        throw new Error(`KyberSwap API error: ${response.statusText}`)
      }

      const data = (await response.json()) as KyberRoutesResponse

      if (data.code !== 0 || !data.data?.routeSummary) {
        throw new Error(data.message || 'No route found for this swap')
      }

      const summary = data.data.routeSummary

      return {
        fromToken,
        toToken,
        fromAmount: amount,
        toAmount: ethers.formatUnits(summary.amountOut, 18),
        toAmountMin: ethers.formatUnits(
          BigInt(summary.amountOut) -
            (BigInt(summary.amountOut) * BigInt(Math.floor(slippage * 100))) / BigInt(10000),
          18,
        ),
        priceImpact: 0,
        slippage,
        estimatedGas: summary.gas || '0',
        route: summary.route?.[0]?.map((r) => r.exchange) || ['KyberSwap'],
        provider: 'kyberswap',
        routeSummary: summary,
        routerAddress: data.data.routerAddress,
      }
    } catch (error) {
      console.error('[SwapService] Error getting KyberSwap quote:', error)
      throw new Error(`Failed to get KyberSwap quote: ${(error as Error).message}`)
    }
  }

  async executeKyberSwap(
    privateKey: string,
    chainId: number,
    fromToken: string,
    toToken: string,
    amount: string,
    slippage: number,
    rpcUrl: string,
  ): Promise<SwapTransaction> {
    if (!CHAIN_NAME_MAP[chainId]) throw new Error(`Unsupported chain for swaps: ${chainId}`)
    try {
      const wallet = new ethers.Wallet(privateKey, createProvider(rpcUrl, chainId))

      const quote = await this.getKyberSwapQuote(
        chainId,
        fromToken,
        toToken,
        amount,
        slippage,
        wallet.address,
      )

      if (!quote.routeSummary || !quote.routerAddress) {
        throw new Error('Missing route data from quote')
      }

      const buildResponse = await fetch(
        `${KYBERSWAP_API_URL}/${CHAIN_NAME_MAP[chainId]}/api/v1/route/build`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-client-id': KYBERSWAP_CLIENT_ID,
          },
          body: JSON.stringify({
            routeSummary: quote.routeSummary,
            sender: wallet.address,
            recipient: wallet.address,
            slippageTolerance: Math.floor(slippage * 100),
          }),
        },
      )

      if (!buildResponse.ok) {
        throw new Error(`KyberSwap build error: ${buildResponse.statusText}`)
      }

      const buildData = await buildResponse.json()

      if (buildData.code !== 0 || !buildData.data) {
        throw new Error(buildData.message || 'Failed to build swap transaction')
      }

      const txData = buildData.data

      if (fromToken !== ethers.ZeroAddress && fromToken.toLowerCase() !== 'native') {
        const tokenContract = new ethers.Contract(
          fromToken,
          [
            'function approve(address spender, uint256 amount) returns (bool)',
            'function allowance(address owner, address spender) view returns (uint256)',
          ],
          wallet,
        )

        if (
          (await tokenContract.allowance(wallet.address, txData.routerAddress)) <
          ethers.parseUnits(amount, 18)
        ) {
          await (await tokenContract.approve(txData.routerAddress, ethers.parseUnits(amount, 18))).wait()
        }
      }

      const tx = await wallet.sendTransaction({
        to: txData.routerAddress,
        data: txData.data,
        value: txData.transactionValue || '0',
        gasLimit: txData.gas || undefined,
      })

      await tx.wait()

      return {
        txHash: tx.hash,
        fromToken,
        toToken,
        fromAmount: amount,
        toAmount: ethers.formatUnits(txData.amountOut, 18),
        status: 'completed',
      }
    } catch (error) {
      console.error('[SwapService] Error executing KyberSwap swap:', error)
      throw new Error(`Failed to execute KyberSwap swap: ${(error as Error).message}`)
    }
  }

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
      return this.getKyberSwapQuote(
        chainId as number,
        fromToken,
        toToken,
        amount,
        slippage,
        walletAddress,
      )
    }
  }

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
      return this.executeKyberSwap(
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

  private getPublicKeyFromPrivateKey(_privateKey: string): PublicKey {
    throw new Error('Not implemented - use proper Solana keypair derivation')
  }
}

export const swapService = new SwapService()
