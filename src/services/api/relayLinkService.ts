/**
 * Relay.link Bridge Service
 * Enables cross-chain token transfers
 */

import { ethers } from 'ethers'

export interface BridgeQuote {
  fromChainId: number
  toChainId: number
  fromToken: string
  toToken: string
  amount: string
  estimatedOutput: string
  estimatedGas: string
  estimatedTime: number // in seconds
  fees: {
    protocol: string
    gas: string
    total: string
  }
  route: string[]
}

export interface BridgeTransaction {
  txHash: string
  fromChainId: number
  toChainId: number
  fromToken: string
  toToken: string
  amount: string
  recipient: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  estimatedCompletion?: number
}

class RelayLinkService {
  private readonly RELAY_API_URL = 'https://api.relay.link'
  private readonly RELAY_SDK_URL = 'https://relay.link/execute'

  /**
   * Gets a quote for bridging tokens
   */
  async getBridgeQuote(
    fromChainId: number,
    toChainId: number,
    token: string,
    amount: string,
    recipient: string,
  ): Promise<BridgeQuote> {
    try {
      // Relay.link API endpoint for quotes
      const response = await fetch(`${this.RELAY_API_URL}/quote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user: recipient,
          originChainId: fromChainId,
          destinationChainId: toChainId,
          originCurrency: token,
          destinationCurrency: token, // Same token on destination
          amount,
          recipient,
        }),
      })

      if (!response.ok) {
        throw new Error(`Relay API error: ${response.statusText}`)
      }

      const data = await response.json()

      // Parse the response into our format
      const quote: BridgeQuote = {
        fromChainId,
        toChainId,
        fromToken: token,
        toToken: token,
        amount,
        estimatedOutput: data.details?.currencyOut?.amount || amount,
        estimatedGas: data.fees?.gas?.amount || '0',
        estimatedTime: data.details?.timeEstimate || 300, // Default 5 minutes
        fees: {
          protocol: data.fees?.relayer?.amount || '0',
          gas: data.fees?.gas?.amount || '0',
          total: data.fees?.total?.amount || '0',
        },
        route: data.steps?.map((s: any) => s.id) || ['relay'],
      }

      return quote
    } catch (error: any) {
      console.error('[RelayLinkService] Error getting bridge quote:', error)
      throw new Error(`Failed to get bridge quote: ${error.message}`)
    }
  }

  /**
   * Executes a bridge transaction
   */
  async executeBridge(
    privateKey: string,
    fromChainId: number,
    toChainId: number,
    token: string,
    amount: string,
    recipient: string,
    rpcUrl: string,
  ): Promise<BridgeTransaction> {
    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl)
      const wallet = new ethers.Wallet(privateKey, provider)

      // First, get the bridge quote
      const quote = await this.getBridgeQuote(fromChainId, toChainId, token, amount, recipient)

      // For Relay.link, we need to:
      // 1. Approve token spending if it's an ERC20
      // 2. Call the Relay contract to initiate the bridge

      let txHash: string

      if (token.toLowerCase() === 'native' || token === ethers.ZeroAddress) {
        // Native token bridge (ETH, etc.)
        // Relay.link has specific contracts per chain
        const relayContractAddress = this.getRelayContract(fromChainId)

        const tx = await wallet.sendTransaction({
          to: relayContractAddress,
          value: ethers.parseEther(amount),
          data: this.encodeRelayData(toChainId, recipient, token, amount),
        })

        txHash = tx.hash
        await tx.wait()
      } else {
        // ERC20 token bridge
        const erc20Abi = [
          'function approve(address spender, uint256 amount) returns (bool)',
          'function allowance(address owner, address spender) view returns (uint256)',
        ]

        const tokenContract = new ethers.Contract(token, erc20Abi, wallet)
        const relayContractAddress = this.getRelayContract(fromChainId)

        // Check allowance
        const allowance = await tokenContract.allowance(wallet.address, relayContractAddress)
        const amountBN = ethers.parseUnits(amount, 18) // Assumes 18 decimals, should be dynamic

        if (allowance < amountBN) {
          // Approve spending
          const approveTx = await tokenContract.approve(relayContractAddress, amountBN)
          await approveTx.wait()
        }

        // Execute bridge
        const relayAbi = ['function bridge(uint256 toChainId, address token, uint256 amount, address recipient)']
        const relayContract = new ethers.Contract(relayContractAddress, relayAbi, wallet)

        const tx = await relayContract.bridge(toChainId, token, amountBN, recipient)
        txHash = tx.hash
        await tx.wait()
      }

      return {
        txHash,
        fromChainId,
        toChainId,
        fromToken: token,
        toToken: token,
        amount,
        recipient,
        status: 'processing',
        estimatedCompletion: Date.now() + quote.estimatedTime * 1000,
      }
    } catch (error: any) {
      console.error('[RelayLinkService] Error executing bridge:', error)
      throw new Error(`Failed to execute bridge: ${error.message}`)
    }
  }

  /**
   * Gets the status of a bridge transaction
   */
  async getBridgeStatus(txHash: string, fromChainId: number): Promise<BridgeTransaction> {
    try {
      const response = await fetch(`${this.RELAY_API_URL}/requests/${txHash}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to get bridge status: ${response.statusText}`)
      }

      const data = await response.json()

      return {
        txHash,
        fromChainId: data.originChainId || fromChainId,
        toChainId: data.destinationChainId,
        fromToken: data.originCurrency,
        toToken: data.destinationCurrency,
        amount: data.amount,
        recipient: data.recipient,
        status: this.mapRelayStatus(data.status),
        estimatedCompletion: data.estimatedCompletion,
      }
    } catch (error: any) {
      console.error('[RelayLinkService] Error getting bridge status:', error)
      throw new Error(`Failed to get bridge status: ${error.message}`)
    }
  }

  /**
   * Gets the Relay contract address for a chain
   */
  private getRelayContract(chainId: number): string {
    // Relay.link contract addresses (these are examples, need real addresses)
    const contracts: Record<number, string> = {
      1: '0x...', // Ethereum
      137: '0x...', // Polygon
      56: '0x...', // BSC
      42161: '0x...', // Arbitrum
      10: '0x...', // Optimism
      8453: '0x...', // Base
    }

    const address = contracts[chainId]
    if (!address) {
      throw new Error(`Relay contract not available for chain ID ${chainId}`)
    }

    return address
  }

  /**
   * Encodes data for Relay contract call
   */
  private encodeRelayData(toChainId: number, recipient: string, token: string, amount: string): string {
    // Encode the calldata for the Relay contract
    // This is a simplified example
    const iface = new ethers.Interface([
      'function bridge(uint256 toChainId, address token, uint256 amount, address recipient)',
    ])

    return iface.encodeFunctionData('bridge', [
      toChainId,
      token === 'native' ? ethers.ZeroAddress : token,
      ethers.parseEther(amount),
      recipient,
    ])
  }

  /**
   * Maps Relay status to our status
   */
  private mapRelayStatus(relayStatus: string): 'pending' | 'processing' | 'completed' | 'failed' {
    const statusMap: Record<string, 'pending' | 'processing' | 'completed' | 'failed'> = {
      pending: 'pending',
      processing: 'processing',
      success: 'completed',
      completed: 'completed',
      failed: 'failed',
      error: 'failed',
    }

    return statusMap[relayStatus.toLowerCase()] || 'pending'
  }
}

export const relayLinkService = new RelayLinkService()
