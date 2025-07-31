import { Network } from '../../types'
import { db } from '../storage/database'
import { EVM_NETWORKS, SVM_NETWORKS } from '../../utils/networks'

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

  /**
   * Get all networks (default + custom) with visibility status
   */
  async getAllNetworks(): Promise<NetworkWithVisibility[]> {
    // Get default networks
    const defaultNetworks = [...EVM_NETWORKS, ...SVM_NETWORKS]
    
    // Get custom networks from database
    const customNetworks = await db.customNetworks.toArray()
    
    // Get visibility settings
    const visibilitySettings = await db.networkVisibility.toArray()
    const visibilityMap = new Map(
      visibilitySettings.map(v => [v.networkId, v.isHidden])
    )
    
    // Combine all networks with visibility
    const allNetworks: NetworkWithVisibility[] = [
      ...defaultNetworks.map(network => ({
        ...network,
        isCustom: false,
        isHidden: visibilityMap.get(network.id) || false
      })),
      ...customNetworks.map(network => ({
        ...network,
        isCustom: true,
        isHidden: visibilityMap.get(network.id) || false
      }))
    ]
    
    return allNetworks
  }

  /**
   * Get only visible networks
   */
  async getVisibleNetworks(): Promise<Network[]> {
    const allNetworks = await this.getAllNetworks()
    return allNetworks.filter(n => !n.isHidden)
  }

  /**
   * Get networks by type
   */
  async getNetworksByType(type: 'EVM' | 'SVM'): Promise<Network[]> {
    const visibleNetworks = await this.getVisibleNetworks()
    return visibleNetworks.filter(n => n.type === type)
  }

  /**
   * Get a specific network by ID
   */
  async getNetworkById(id: string): Promise<Network | undefined> {
    const allNetworks = await this.getVisibleNetworks()
    return allNetworks.find(n => n.id === id)
  }

  /**
   * Add a custom network
   */
  async addCustomNetwork(network: Omit<Network, 'id'>): Promise<string> {
    // Generate unique ID
    const id = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    // Validate network
    if (!network.name || !network.rpcUrl || !network.symbol) {
      throw new Error('Network name, RPC URL, and symbol are required')
    }
    
    // Check for duplicate chainId
    const existingNetworks = await this.getAllNetworks()
    const duplicate = existingNetworks.find(n => 
      n.chainId === network.chainId && n.type === network.type
    )
    
    if (duplicate) {
      throw new Error(`A network with chain ID ${network.chainId} already exists: ${duplicate.name}`)
    }
    
    // Add to database
    await db.customNetworks.add({
      id,
      ...network,
      isCustom: true,
      addedAt: Date.now()
    })
    
    return id
  }

  /**
   * Update a custom network
   */
  async updateCustomNetwork(id: string, updates: Partial<Network>): Promise<void> {
    const customNetwork = await db.customNetworks.get(id)
    
    if (!customNetwork) {
      throw new Error('Network not found or is not a custom network')
    }
    
    // Validate chainId uniqueness if being changed
    if (updates.chainId && updates.chainId !== customNetwork.chainId) {
      const existingNetworks = await this.getAllNetworks()
      const duplicate = existingNetworks.find(n => 
        n.id !== id && 
        n.chainId === updates.chainId && 
        n.type === (updates.type || customNetwork.type)
      )
      
      if (duplicate) {
        throw new Error(`A network with chain ID ${updates.chainId} already exists: ${duplicate.name}`)
      }
    }
    
    await db.customNetworks.update(id, {
      ...updates,
      updatedAt: Date.now()
    })
  }

  /**
   * Remove a custom network
   */
  async removeCustomNetwork(id: string): Promise<void> {
    const customNetwork = await db.customNetworks.get(id)
    
    if (!customNetwork) {
      throw new Error('Network not found or is not a custom network')
    }
    
    // Remove network
    await db.customNetworks.delete(id)
    
    // Also remove visibility setting
    await db.networkVisibility.delete(id)
  }

  /**
   * Toggle network visibility
   */
  async toggleNetworkVisibility(networkId: string): Promise<void> {
    const visibility = await db.networkVisibility.get(networkId)
    
    if (visibility) {
      await db.networkVisibility.update(networkId, {
        isHidden: !visibility.isHidden,
        updatedAt: Date.now()
      })
    } else {
      await db.networkVisibility.add({
        networkId,
        isHidden: true,
        updatedAt: Date.now()
      })
    }
  }

  /**
   * Set network visibility
   */
  async setNetworkVisibility(networkId: string, isHidden: boolean): Promise<void> {
    const visibility = await db.networkVisibility.get(networkId)
    
    if (visibility) {
      await db.networkVisibility.update(networkId, {
        isHidden,
        updatedAt: Date.now()
      })
    } else {
      await db.networkVisibility.add({
        networkId,
        isHidden,
        updatedAt: Date.now()
      })
    }
  }

  /**
   * Check if a network is custom
   */
  async isCustomNetwork(id: string): Promise<boolean> {
    const customNetwork = await db.customNetworks.get(id)
    return !!customNetwork
  }
}

export const networkService = NetworkService.getInstance()