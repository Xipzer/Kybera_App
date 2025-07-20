/**
 * Code by Xipzer
 */

import { Network } from '../types'
import { db } from './database'
import { EVM_NETWORKS, SVM_NETWORKS } from '../utils/networks'

export interface NetworkWithVisibility extends Network {
  isCustom: boolean
  isHidden: boolean
}

class NetworkService {
  private static instance: NetworkService

  static getInstance(): NetworkService {
    if (!NetworkService.instance) {
      NetworkService.instance = new NetworkService()
    }
    return NetworkService.instance
  }

  async getAllNetworks(): Promise<NetworkWithVisibility[]> {
    const visibilityMap = new Map(
      (await db.networkVisibility.toArray()).map((v) => [v.networkId, v.isHidden]),
    )

    return [
      ...[...EVM_NETWORKS, ...SVM_NETWORKS].map((network) => ({
        ...network,
        isCustom: false,
        isHidden: visibilityMap.get(network.id) || false,
      })),
      ...(await db.customNetworks.toArray()).map((network) => ({
        ...network,
        isCustom: true,
        isHidden: visibilityMap.get(network.id) || false,
      })),
    ]
  }

  async getVisibleNetworks(): Promise<Network[]> {
    return (await this.getAllNetworks()).filter((n) => !n.isHidden)
  }

  async getNetworksByType(type: 'EVM' | 'SVM'): Promise<Network[]> {
    return (await this.getVisibleNetworks()).filter((n) => n.type === type)
  }

  async getNetworkById(id: string): Promise<Network | undefined> {
    return (await this.getVisibleNetworks()).find((n) => n.id === id)
  }

  async addCustomNetwork(network: Omit<Network, 'id'>): Promise<string> {
    const id = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    if (!network.name || !network.rpcUrl || !network.symbol) {
      throw new Error('Network name, RPC URL, and symbol are required')
    }

    const existingNetworks = await this.getAllNetworks()
    const duplicate = existingNetworks.find(
      (n) => n.chainId === network.chainId && n.type === network.type,
    )

    if (duplicate) {
      throw new Error(
        `A network with chain ID ${network.chainId} already exists: ${duplicate.name}`,
      )
    }

    await db.customNetworks.add({
      id,
      ...network,
      explorerUrl: network.explorerUrl || '',
      nativeCurrency: network.nativeCurrency || {
        name: network.symbol,
        symbol: network.symbol,
        decimals: network.type === 'EVM' ? 18 : 9,
      },
      isCustom: true,
      addedAt: Date.now(),
    })

    return id
  }

  async updateCustomNetwork(id: string, updates: Partial<Network>): Promise<void> {
    const customNetwork = await db.customNetworks.get(id)

    if (!customNetwork) {
      throw new Error('Network not found or is not a custom network')
    }

    if (updates.chainId && updates.chainId !== customNetwork.chainId) {
      const duplicate = (await this.getAllNetworks()).find(
        (n) =>
          n.id !== id &&
          n.chainId === updates.chainId &&
          n.type === (updates.type || customNetwork.type),
      )

      if (duplicate) {
        throw new Error(
          `A network with chain ID ${updates.chainId} already exists: ${duplicate.name}`,
        )
      }
    }

    await db.customNetworks.update(id, {
      ...updates,
      updatedAt: Date.now(),
    })
  }

  async removeCustomNetwork(id: string): Promise<void> {
    const customNetwork = await db.customNetworks.get(id)

    if (!customNetwork) {
      throw new Error('Network not found or is not a custom network')
    }

    await db.customNetworks.delete(id)

    await db.networkVisibility.delete(id)
  }

  async toggleNetworkVisibility(networkId: string): Promise<void> {
    const visibility = await db.networkVisibility.get(networkId)

    if (visibility) {
      await db.networkVisibility.update(networkId, {
        isHidden: !visibility.isHidden,
        updatedAt: Date.now(),
      })
    } else {
      await db.networkVisibility.add({
        networkId,
        isHidden: true,
        updatedAt: Date.now(),
      })
    }
  }

  async setNetworkVisibility(networkId: string, isHidden: boolean): Promise<void> {
    if (await db.networkVisibility.get(networkId)) {
      await db.networkVisibility.update(networkId, {
        isHidden,
        updatedAt: Date.now(),
      })
    } else {
      await db.networkVisibility.add({
        networkId,
        isHidden,
        updatedAt: Date.now(),
      })
    }
  }

  async isCustomNetwork(id: string): Promise<boolean> {
    return !!(await db.customNetworks.get(id))
  }
}

export const networkService = NetworkService.getInstance()