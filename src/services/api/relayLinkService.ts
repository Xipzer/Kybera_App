/**
 * Code by Xipzer
 */

import { ethers } from 'ethers'
import { createProvider } from '../blockchain/provider'

export interface BridgeQuote {
  fromChainId: number
  toChainId: number
  fromToken: string
  toToken: string
  amount: string
  estimatedOutput: string
  estimatedGas: string
  estimatedTime: number
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

  async getBridgeQuote(
    fromChainId: number,
    toChainId: number,
    token: string,
    amount: string,
    recipient: string,
  ): Promise<BridgeQuote> {
    try {
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
          destinationCurrency: token,
          amount,
          recipient,
        }),
      })

      if (!response.ok) {
        throw new Error(`Relay API error: ${response.statusText}`)
      }

      const data = await response.json()

      return {
        fromChainId,
        toChainId,
        fromToken: token,
        toToken: token,
        amount,
        estimatedOutput: data.details?.currencyOut?.amount || amount,
        estimatedGas: data.fees?.gas?.amount || '0',
        estimatedTime: data.details?.timeEstimate || 300,
        fees: {
          protocol: data.fees?.relayer?.amount || '0',
          gas: data.fees?.gas?.amount || '0',
          total: data.fees?.total?.amount || '0',
        },
        route: data.steps?.map((s: any) => s.id) || ['relay'],
      }
    } catch (error: any) {
      console.error('[RelayLinkService] Error getting bridge quote:', error)
      throw new Error(`Failed to get bridge quote: ${error.message}`)
    }
  }

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
      const wallet = new ethers.Wallet(privateKey, createProvider(rpcUrl, fromChainId))

      const quote = await this.getBridgeQuote(fromChainId, toChainId, token, amount, recipient)

      let txHash: string

      if (token.toLowerCase() === 'native' || token === ethers.ZeroAddress) {
        const tx = await wallet.sendTransaction({
          to: this.getRelayContract(fromChainId),
          value: ethers.parseEther(amount),
          data: this.encodeRelayData(toChainId, recipient, token, amount),
        })

        txHash = tx.hash
        await tx.wait()
      } else {
        const erc20Abi = [
          'function approve(address spender, uint256 amount) returns (bool)',
          'function allowance(address owner, address spender) view returns (uint256)',
        ]

        const tokenContract = new ethers.Contract(token, erc20Abi, wallet)
        const relayContractAddress = this.getRelayContract(fromChainId)

        const amountBN = ethers.parseUnits(amount, 18)

        if ((await tokenContract.allowance(wallet.address, relayContractAddress)) < amountBN) {
          const approveTx = await tokenContract.approve(relayContractAddress, amountBN)
          await approveTx.wait()
        }

        const relayAbi = [
          'function bridge(uint256 toChainId, address token, uint256 amount, address recipient)',
        ]

        const tx = await new ethers.Contract(relayContractAddress, relayAbi, wallet).bridge(
          toChainId,
          token,
          amountBN,
          recipient,
        )
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

  private getRelayContract(chainId: number): string {
    const contracts: Record<number, string> = {
      1: '0x...',
      137: '0x...',
      56: '0x...',
      42161: '0x...',
      10: '0x...',
      8453: '0x...',
    }

    const address = contracts[chainId]
    if (!address) {
      throw new Error(`Relay contract not available for chain ID ${chainId}`)
    }

    return address
  }

  private encodeRelayData(
    toChainId: number,
    recipient: string,
    token: string,
    amount: string,
  ): string {
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