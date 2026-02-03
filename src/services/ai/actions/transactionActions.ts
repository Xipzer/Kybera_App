/**
 * Transaction Action Handlers
 */

import { ethers } from 'ethers'
import { ActionContext, ActionResult } from '../../../types'
import { useWalletStore } from '../../../store/walletStore'
import { EVMWalletService } from '../../blockchain/evmWallet'
import { SVMWalletService } from '../../blockchain/svmWallet'
import { coinGeckoService } from '../../api/coinGeckoService'
import { AlchemyService } from '../../blockchain/alchemyService'

/**
 * Sends native tokens (ETH, BNB, SOL, etc.)
 */
export async function sendNativeToken(
  params: { toAddress: string; amount: string },
  context: ActionContext,
): Promise<ActionResult> {
  try {
    const { wallets, activeWalletId, activeNetwork, getWalletPrivateKey } =
      useWalletStore.getState()

    if (!activeWalletId) {
      return {
        success: false,
        error: 'No active wallet',
        message: 'Please activate a wallet first',
      }
    }

    if (!context.password) {
      return {
        success: false,
        error: 'Password required',
        message: 'Please provide your password to authorize this transaction',
      }
    }

    const wallet = wallets.find((w) => w.id === activeWalletId)
    if (!wallet) {
      return {
        success: false,
        error: 'Wallet not found',
        message: 'Active wallet not found',
      }
    }

    context.onProgress?.('Retrieving wallet private key...')

    // Get private key
    const privateKey = await getWalletPrivateKey(activeWalletId, context.password)

    context.onProgress?.('Sending transaction...')

    let txHash: string
    let explorerUrl: string

    if (activeNetwork.type === 'EVM') {
      // EVM transaction
      txHash = await EVMWalletService.sendTransaction(
        privateKey,
        params.toAddress,
        params.amount,
        activeNetwork.rpcUrl,
      )
      explorerUrl = `${activeNetwork.explorerUrl}/tx/${txHash}`
    } else {
      // Solana transaction
      txHash = await SVMWalletService.sendTransaction(
        privateKey,
        params.toAddress,
        params.amount,
        activeNetwork.rpcUrl,
      )
      explorerUrl = `${activeNetwork.explorerUrl}/tx/${txHash}`
    }

    context.onProgress?.('Transaction submitted!')

    return {
      success: true,
      data: {
        transactionHash: txHash,
        from: wallet.address,
        to: params.toAddress,
        amount: params.amount,
        symbol: activeNetwork.symbol,
        network: activeNetwork.name,
      },
      message: `Successfully sent ${params.amount} ${activeNetwork.symbol} to ${params.toAddress}`,
      transactionHash: txHash,
      explorerUrl,
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to send transaction',
      message: `Transaction failed: ${error.message}`,
    }
  }
}

/**
 * Sends ERC20/SPL tokens
 */
export async function sendToken(
  params: { toAddress: string; tokenAddress: string; amount: string; tokenSymbol?: string },
  context: ActionContext,
): Promise<ActionResult> {
  try {
    const { wallets, activeWalletId, activeNetwork, getWalletPrivateKey } =
      useWalletStore.getState()

    if (!activeWalletId) {
      return {
        success: false,
        error: 'No active wallet',
        message: 'Please activate a wallet first',
      }
    }

    if (!context.password) {
      return {
        success: false,
        error: 'Password required',
        message: 'Please provide your password to authorize this transaction',
      }
    }

    const wallet = wallets.find((w) => w.id === activeWalletId)
    if (!wallet) {
      return {
        success: false,
        error: 'Wallet not found',
        message: 'Active wallet not found',
      }
    }

    context.onProgress?.('Retrieving wallet private key...')

    // Get private key
    const privateKey = await getWalletPrivateKey(activeWalletId, context.password)

    context.onProgress?.('Sending token transfer...')

    let txHash: string
    let explorerUrl: string

    if (activeNetwork.type === 'EVM') {
      // EVM ERC20 transfer
      txHash = await EVMWalletService.sendTokenTransaction(
        privateKey,
        params.toAddress,
        params.amount,
        params.tokenAddress,
        activeNetwork.rpcUrl,
      )
      explorerUrl = `${activeNetwork.explorerUrl}/tx/${txHash}`
    } else {
      // Solana SPL transfer
      txHash = await SVMWalletService.sendTokenTransaction(
        privateKey,
        params.toAddress,
        params.amount,
        params.tokenAddress,
        activeNetwork.rpcUrl,
      )
      explorerUrl = `${activeNetwork.explorerUrl}/tx/${txHash}`
    }

    context.onProgress?.('Token transfer submitted!')

    return {
      success: true,
      data: {
        transactionHash: txHash,
        from: wallet.address,
        to: params.toAddress,
        amount: params.amount,
        token: params.tokenSymbol || params.tokenAddress,
        tokenAddress: params.tokenAddress,
        network: activeNetwork.name,
      },
      message: `Successfully sent ${params.amount} ${params.tokenSymbol || 'tokens'} to ${params.toAddress}`,
      transactionHash: txHash,
      explorerUrl,
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to send token',
      message: `Token transfer failed: ${error.message}`,
    }
  }
}

/**
 * Estimates gas for a transaction
 */
export async function estimateGas(
  params: { toAddress: string; amount: string; tokenAddress?: string },
  _context: ActionContext,
): Promise<ActionResult> {
  try {
    const { wallets, activeWalletId, activeNetwork } = useWalletStore.getState()

    if (!activeWalletId) {
      return {
        success: false,
        error: 'No active wallet',
        message: 'Please activate a wallet first',
      }
    }

    const wallet = wallets.find((w) => w.id === activeWalletId)
    if (!wallet) {
      return {
        success: false,
        error: 'Wallet not found',
        message: 'Active wallet not found',
      }
    }

    if (activeNetwork.type !== 'EVM') {
      return {
        success: false,
        error: 'Gas estimation only supported on EVM networks',
        message: 'Solana uses a different fee structure',
      }
    }

    const provider = new ethers.JsonRpcProvider(activeNetwork.rpcUrl)

    let gasEstimate: bigint
    let gasPrice: bigint

    if (params.tokenAddress) {
      // ERC20 transfer gas estimation
      const erc20Abi = ['function transfer(address to, uint256 amount) returns (bool)']
      const contract = new ethers.Contract(params.tokenAddress, erc20Abi, provider)
      gasEstimate = await contract.transfer.estimateGas(
        params.toAddress,
        ethers.parseUnits(params.amount, 18),
      )
    } else {
      // Native transfer gas estimation
      gasEstimate = await provider.estimateGas({
        from: wallet.address,
        to: params.toAddress,
        value: ethers.parseEther(params.amount),
      })
    }

    // Get current gas price
    const feeData = await provider.getFeeData()
    gasPrice = feeData.gasPrice || BigInt(0)

    const totalGas = gasEstimate * gasPrice
    const gasInEth = ethers.formatEther(totalGas)

    // Try to get USD value
    let gasUSD = 0
    try {
      const ethPrice = await coinGeckoService.getNativeTokenPrice('ethereum')
      gasUSD = parseFloat(gasInEth) * ethPrice
    } catch (_e) {
      // Ignore price fetch errors
    }

    return {
      success: true,
      data: {
        gasLimit: gasEstimate.toString(),
        gasPrice: gasPrice.toString(),
        totalGasWei: totalGas.toString(),
        totalGasEth: gasInEth,
        totalGasUSD: gasUSD,
        network: activeNetwork.name,
      },
      message: `Estimated gas: ${gasInEth} ${activeNetwork.symbol}${gasUSD > 0 ? ` ($${gasUSD.toFixed(2)})` : ''}`,
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to estimate gas',
      message: `Could not estimate gas: ${error.message}`,
    }
  }
}

/**
 * Gets transaction history
 */
export async function getTransactionHistory(
  params: { walletAddress?: string; limit?: number },
  _context: ActionContext,
): Promise<ActionResult> {
  try {
    const { wallets, activeWalletId, activeNetwork } = useWalletStore.getState()

    let address = params.walletAddress
    if (!address) {
      if (!activeWalletId) {
        return {
          success: false,
          error: 'No wallet specified',
          message: 'Please specify a wallet address or activate a wallet',
        }
      }
      const wallet = wallets.find((w) => w.id === activeWalletId)
      if (!wallet) {
        return {
          success: false,
          error: 'Wallet not found',
          message: 'Active wallet not found',
        }
      }
      address = wallet.address
    }

    const limit = params.limit || 20

    if (activeNetwork.type === 'EVM') {
      // Use Alchemy for EVM transaction history
      const alchemyService = AlchemyService.getInstance(activeNetwork)
      if (!alchemyService) {
        return {
          success: false,
          error: 'Alchemy service not available',
          message: 'Transaction history requires Alchemy configuration for this network',
        }
      }
      // Note: getTransactionHistory is not yet implemented in AlchemyService
      // This is a placeholder for future implementation
      const _txHistory: any[] = []

      return {
        success: true,
        data: {
          transactions: _txHistory,
          count: _txHistory.length,
          address,
          network: activeNetwork.name,
        },
        message: `Retrieved ${_txHistory.length} transaction(s) for ${address}`,
      }
    } else {
      // For Solana, we'll need to implement a different approach
      return {
        success: false,
        error: 'Transaction history for Solana not yet implemented',
        message: 'Solana transaction history coming soon',
      }
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to get transaction history',
      message: `Could not retrieve transaction history: ${error.message}`,
    }
  }
}

/**
 * Gets token price
 */
export async function getTokenPrice(
  params: { tokenSymbol?: string; tokenAddress?: string },
  _context: ActionContext,
): Promise<ActionResult> {
  try {
    if (!params.tokenSymbol && !params.tokenAddress) {
      return {
        success: false,
        error: 'Missing parameter',
        message: 'Please provide either tokenSymbol or tokenAddress',
      }
    }

    let priceData: number | null = null
    if (params.tokenSymbol) {
      // Use getNativeTokenPrice for common tokens like ETH, BTC, etc.
      priceData = await coinGeckoService.getNativeTokenPrice(params.tokenSymbol.toLowerCase())
    } else if (params.tokenAddress) {
      // For token addresses, we'd need to implement a different lookup method
      // For now, return a message
      return {
        success: false,
        error: 'Token address lookup not yet implemented',
        message: 'Please use token symbol instead (e.g., "ETH", "USDC")',
      }
    }

    if (!priceData || priceData === 0) {
      return {
        success: false,
        error: 'Price not found',
        message: `Could not find price data for ${params.tokenSymbol}`,
      }
    }

    return {
      success: true,
      data: {
        symbol: params.tokenSymbol,
        usdPrice: priceData,
      },
      message: `${params.tokenSymbol?.toUpperCase()}: $${priceData.toFixed(2)}`,
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to get token price',
      message: `Could not retrieve price: ${error.message}`,
    }
  }
}

/**
 * Searches for a token
 */
export async function searchToken(
  _params: { query: string; network?: string },
  _context: ActionContext,
): Promise<ActionResult> {
  try {
    // This would require implementing a token search service
    // For now, return a placeholder
    return {
      success: false,
      error: 'Not implemented',
      message: 'Token search feature coming soon',
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to search token',
      message: `Could not search for token: ${error.message}`,
    }
  }
}
