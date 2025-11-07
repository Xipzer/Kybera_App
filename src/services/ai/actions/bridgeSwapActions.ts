/**
 * Bridge and Swap Action Handlers
 */

import { ActionContext, ActionResult } from '../../../types'
import { useWalletStore } from '../../../store/walletStore'
import { relayLinkService } from '../../api/relayLinkService'
import { swapService } from '../../api/swapService'
import { EVM_NETWORKS } from '../../../utils/networks'

/**
 * Gets a bridge quote
 */
export async function getBridgeQuote(
  params: {
    fromNetwork: string
    toNetwork: string
    token: string
    amount: string
    toAddress?: string
  },
  context: ActionContext,
): Promise<ActionResult> {
  try {
    const { wallets, activeWalletId } = useWalletStore.getState()

    // Find network IDs
    const fromNet = EVM_NETWORKS.find((n) => n.id === params.fromNetwork)
    const toNet = EVM_NETWORKS.find((n) => n.id === params.toNetwork)

    if (!fromNet || !toNet) {
      return {
        success: false,
        error: 'Network not found',
        message: `Could not find one or both networks: ${params.fromNetwork}, ${params.toNetwork}`,
      }
    }

    if (fromNet.type !== 'EVM' || toNet.type !== 'EVM') {
      return {
        success: false,
        error: 'Bridge only supports EVM chains',
        message: 'Bridging is currently only available for EVM-compatible chains',
      }
    }

    // Get recipient address
    let recipient = params.toAddress
    if (!recipient) {
      if (!activeWalletId) {
        return {
          success: false,
          error: 'No recipient address specified',
          message: 'Please provide a recipient address or activate a wallet',
        }
      }
      const wallet = wallets.find((w) => w.id === activeWalletId)
      recipient = wallet?.address
    }

    if (!recipient) {
      return {
        success: false,
        error: 'No recipient address',
        message: 'Could not determine recipient address',
      }
    }

    context.onProgress?.('Fetching bridge quote...')

    const quote = await relayLinkService.getBridgeQuote(
      fromNet.chainId as number,
      toNet.chainId as number,
      params.token,
      params.amount,
      recipient,
    )

    return {
      success: true,
      data: {
        fromNetwork: fromNet.name,
        toNetwork: toNet.name,
        fromChainId: quote.fromChainId,
        toChainId: quote.toChainId,
        token: params.token,
        amount: params.amount,
        estimatedOutput: quote.estimatedOutput,
        estimatedTime: `${Math.ceil(quote.estimatedTime / 60)} minutes`,
        fees: {
          protocol: quote.fees.protocol,
          gas: quote.fees.gas,
          total: quote.fees.total,
        },
        recipient,
      },
      message: `Bridge ${params.amount} tokens from ${fromNet.name} to ${toNet.name}. Estimated output: ${quote.estimatedOutput}. Time: ~${Math.ceil(quote.estimatedTime / 60)} minutes`,
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to get bridge quote',
      message: `Could not get bridge quote: ${error.message}`,
    }
  }
}

/**
 * Executes a bridge transaction
 */
export async function executeBridge(
  params: {
    fromNetwork: string
    toNetwork: string
    token: string
    amount: string
    toAddress?: string
  },
  context: ActionContext,
): Promise<ActionResult> {
  try {
    const { wallets, activeWalletId, getWalletPrivateKey } = useWalletStore.getState()

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
        message: 'Please provide your password to authorize this bridge transaction',
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

    // Find networks
    const fromNet = EVM_NETWORKS.find((n) => n.id === params.fromNetwork)
    const toNet = EVM_NETWORKS.find((n) => n.id === params.toNetwork)

    if (!fromNet || !toNet) {
      return {
        success: false,
        error: 'Network not found',
        message: `Could not find one or both networks`,
      }
    }

    const recipient = params.toAddress || wallet.address

    context.onProgress?.('Retrieving wallet private key...')

    // Get private key
    const privateKey = await getWalletPrivateKey(activeWalletId, context.password)

    context.onProgress?.('Executing bridge transaction...')

    const result = await relayLinkService.executeBridge(
      privateKey,
      fromNet.chainId as number,
      toNet.chainId as number,
      params.token,
      params.amount,
      recipient,
      fromNet.rpcUrl,
    )

    context.onProgress?.('Bridge transaction submitted!')

    return {
      success: true,
      data: {
        transactionHash: result.txHash,
        fromNetwork: fromNet.name,
        toNetwork: toNet.name,
        token: params.token,
        amount: params.amount,
        recipient,
        status: result.status,
        estimatedCompletion: result.estimatedCompletion,
      },
      message: `Bridge transaction submitted! Tokens will arrive on ${toNet.name} in approximately ${Math.ceil(((result.estimatedCompletion || Date.now()) - Date.now()) / 60000)} minutes`,
      transactionHash: result.txHash,
      explorerUrl: `${fromNet.explorerUrl}/tx/${result.txHash}`,
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to execute bridge',
      message: `Bridge transaction failed: ${error.message}`,
    }
  }
}

/**
 * Gets a swap quote
 */
export async function getSwapQuote(
  params: {
    fromToken: string
    toToken: string
    amount: string
    slippage?: number
  },
  context: ActionContext,
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

    const slippage = params.slippage || 1.0

    context.onProgress?.('Fetching swap quote...')

    const quote = await swapService.getSwapQuote(
      activeNetwork.type,
      activeNetwork.chainId,
      params.fromToken,
      params.toToken,
      params.amount,
      slippage,
      wallet.address,
    )

    return {
      success: true,
      data: {
        fromToken: quote.fromToken,
        toToken: quote.toToken,
        fromAmount: quote.fromAmount,
        toAmount: quote.toAmount,
        toAmountMin: quote.toAmountMin,
        priceImpact: `${quote.priceImpact.toFixed(2)}%`,
        slippage: `${quote.slippage}%`,
        route: quote.route.join(' → '),
        provider: quote.provider,
        network: activeNetwork.name,
      },
      message: `Swap ${quote.fromAmount} tokens for approximately ${quote.toAmount} tokens (min: ${quote.toAmountMin}) via ${quote.provider}`,
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to get swap quote',
      message: `Could not get swap quote: ${error.message}`,
    }
  }
}

/**
 * Executes a token swap
 */
export async function executeSwap(
  params: {
    fromToken: string
    toToken: string
    amount: string
    slippage?: number
    minAmountOut?: string
  },
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
        message: 'Please provide your password to authorize this swap',
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

    const slippage = params.slippage || 1.0

    context.onProgress?.('Retrieving wallet private key...')

    // Get private key
    const privateKey = await getWalletPrivateKey(activeWalletId, context.password)

    context.onProgress?.('Executing swap...')

    const result = await swapService.executeSwap(
      activeNetwork.type,
      activeNetwork.chainId,
      privateKey,
      params.fromToken,
      params.toToken,
      params.amount,
      slippage,
      activeNetwork.rpcUrl,
    )

    context.onProgress?.('Swap completed!')

    return {
      success: true,
      data: {
        transactionHash: result.txHash,
        fromToken: result.fromToken,
        toToken: result.toToken,
        fromAmount: result.fromAmount,
        toAmount: result.toAmount,
        status: result.status,
        network: activeNetwork.name,
      },
      message: `Successfully swapped ${result.fromAmount} tokens for ${result.toAmount} tokens`,
      transactionHash: result.txHash,
      explorerUrl: `${activeNetwork.explorerUrl}/tx/${result.txHash}`,
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to execute swap',
      message: `Swap failed: ${error.message}`,
    }
  }
}
