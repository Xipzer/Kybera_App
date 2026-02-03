import { blockchainEventBus } from '../core/eventBus'

export interface WebSocketConfig {
  urls: {
    [key: string]: string // network -> websocket URL mapping
  }
  reconnectDelay: number
  maxReconnectAttempts: number
  heartbeatInterval: number
  connectionTimeout: number
}

interface WebSocketMessage {
  type: 'balance' | 'price' | 'transaction' | 'block' | 'pong' | 'error'
  data?: any
  address?: string
  network?: string
}

interface SubscriptionRequest {
  type: 'subscribe' | 'unsubscribe'
  addresses: string[]
  events?: string[]
}

export class WebSocketProvider {
  private sockets = new Map<string, WebSocket>()
  private subscriptions = new Map<string, Set<string>>()
  private reconnectAttempts = new Map<string, number>()
  private heartbeatTimers = new Map<string, NodeJS.Timeout>()
  private reconnectTimers = new Map<string, NodeJS.Timeout>()
  private messageQueue = new Map<string, WebSocketMessage[]>()
  private isDestroyed = false

  constructor(
    private config: WebSocketConfig = {
      urls: {},
      reconnectDelay: 1000,
      maxReconnectAttempts: 5,
      heartbeatInterval: 30000,
      connectionTimeout: 10000,
    },
  ) {}

  /**
   * Update WebSocket URLs configuration
   */
  updateConfig(urls: { [key: string]: string }): void {
    this.config.urls = { ...this.config.urls, ...urls }
  }

  /**
   * Check if WebSocket is supported for a network
   */
  isSupported(network: string): boolean {
    return !!this.config.urls[network]
  }

  /**
   * Connect to WebSocket for a specific network
   */
  async connect(network: string): Promise<boolean> {
    if (this.isDestroyed) return false

    const url = this.config.urls[network]
    if (!url) {
      console.warn(`[WebSocket] No URL configured for network: ${network}`)
      return false
    }

    // Check if already connected
    const existingSocket = this.sockets.get(network)
    if (existingSocket && existingSocket.readyState === WebSocket.OPEN) {
      console.log(`[WebSocket] Already connected to ${network}`)
      return true
    }

    try {
      console.log(`[WebSocket] Connecting to ${network} at ${url}`)
      const ws = new WebSocket(url)

      // Set up connection timeout
      const connectionTimeout = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          console.error(`[WebSocket] Connection timeout for ${network}`)
          ws.close()
          this.handleDisconnection(network, 'timeout')
        }
      }, this.config.connectionTimeout)

      ws.onopen = () => {
        clearTimeout(connectionTimeout)
        console.log(`[WebSocket] Connected to ${network}`)
        this.sockets.set(network, ws)
        this.reconnectAttempts.set(network, 0)
        this.startHeartbeat(network, ws)

        // Send queued messages
        this.flushMessageQueue(network)

        blockchainEventBus.emit('connection:status', {
          status: 'connected',
          network,
        })
      }

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage
          this.handleMessage(network, message)
        } catch (error) {
          console.error(`[WebSocket] Failed to parse message from ${network}:`, error)
        }
      }

      ws.onerror = (error) => {
        clearTimeout(connectionTimeout)
        console.error(`[WebSocket] Error on ${network}:`, error)
        blockchainEventBus.emit('connection:status', {
          status: 'error',
          network,
        })
      }

      ws.onclose = (event) => {
        clearTimeout(connectionTimeout)
        console.log(`[WebSocket] Disconnected from ${network} (code: ${event.code})`)
        this.handleDisconnection(network, 'closed')
      }

      // Wait for connection to establish
      return new Promise((resolve) => {
        const checkConnection = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            clearInterval(checkConnection)
            resolve(true)
          } else if (ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
            clearInterval(checkConnection)
            resolve(false)
          }
        }, 100)

        // Timeout after connectionTimeout
        setTimeout(() => {
          clearInterval(checkConnection)
          resolve(false)
        }, this.config.connectionTimeout)
      })
    } catch (error) {
      console.error(`[WebSocket] Failed to create WebSocket for ${network}:`, error)
      blockchainEventBus.emit('connection:status', {
        status: 'error',
        network,
      })
      return false
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(network: string, message: WebSocketMessage): void {
    switch (message.type) {
      case 'balance':
        if (message.address && message.data) {
          blockchainEventBus.emit('balance:update', {
            wallet: message.address,
            network: network,
            balance: message.data,
          })
        }
        break

      case 'price':
        if (message.data) {
          blockchainEventBus.emit('price:update', {
            tokens: message.data,
          })
        }
        break

      case 'transaction':
        if (message.data) {
          blockchainEventBus.emit('transaction:new', {
            transaction: message.data,
          })
        }
        break

      case 'pong':
        // Heartbeat response received
        break

      case 'error':
        console.error(`[WebSocket] Error from ${network}:`, message.data)
        break

      default:
        console.warn(`[WebSocket] Unknown message type from ${network}:`, message.type)
    }
  }

  /**
   * Handle WebSocket disconnection
   */
  private handleDisconnection(network: string, _reason: string): void {
    this.stopHeartbeat(network)
    this.sockets.delete(network)

    if (this.isDestroyed) return

    blockchainEventBus.emit('connection:status', {
      status: 'disconnected',
      network,
    })

    const attempts = this.reconnectAttempts.get(network) || 0

    if (attempts < this.config.maxReconnectAttempts) {
      this.reconnectAttempts.set(network, attempts + 1)
      const delay = this.config.reconnectDelay * Math.pow(2, attempts)

      console.log(`[WebSocket] Reconnecting to ${network} in ${delay}ms (attempt ${attempts + 1})`)

      const timer = setTimeout(() => {
        if (!this.isDestroyed) {
          this.connect(network)
        }
      }, delay)

      this.reconnectTimers.set(network, timer)
    } else {
      console.error(`[WebSocket] Max reconnection attempts reached for ${network}`)
      blockchainEventBus.emit('connection:status', {
        status: 'error',
        network,
      })
    }
  }

  /**
   * Start heartbeat for connection monitoring
   */
  private startHeartbeat(network: string, ws: WebSocket): void {
    const timer = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }))
      } else {
        this.handleDisconnection(network, 'heartbeat_failed')
      }
    }, this.config.heartbeatInterval)

    this.heartbeatTimers.set(network, timer)
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(network: string): void {
    const timer = this.heartbeatTimers.get(network)
    if (timer) {
      clearInterval(timer)
      this.heartbeatTimers.delete(network)
    }
  }

  /**
   * Subscribe to updates for specific addresses
   */
  subscribe(network: string, addresses: string[]): void {
    const ws = this.sockets.get(network)
    const existingSubs = this.subscriptions.get(network) || new Set()
    const newSubs = addresses.filter((addr) => !existingSubs.has(addr.toLowerCase()))

    if (newSubs.length === 0) return

    if (ws && ws.readyState === WebSocket.OPEN) {
      const request: SubscriptionRequest = {
        type: 'subscribe',
        addresses: newSubs,
        events: ['balance', 'transaction'],
      }

      ws.send(JSON.stringify(request))
      newSubs.forEach((addr) => existingSubs.add(addr.toLowerCase()))
      this.subscriptions.set(network, existingSubs)
    } else {
      // Queue the subscription request
      console.debug(`[WebSocket] Queueing subscription for ${network} (not connected)`)
      this.queueMessage(network, {
        type: 'subscribe',
        addresses: newSubs,
      } as any)
    }
  }

  /**
   * Unsubscribe from updates
   */
  unsubscribe(network: string, addresses: string[]): void {
    const ws = this.sockets.get(network)
    const subs = this.subscriptions.get(network)

    if (ws && subs && ws.readyState === WebSocket.OPEN) {
      const request: SubscriptionRequest = {
        type: 'unsubscribe',
        addresses: addresses,
      }

      ws.send(JSON.stringify(request))
      addresses.forEach((addr) => subs.delete(addr.toLowerCase()))
    }
  }

  /**
   * Queue messages to send when reconnected
   */
  private queueMessage(network: string, message: WebSocketMessage): void {
    const queue = this.messageQueue.get(network) || []
    queue.push(message)
    this.messageQueue.set(network, queue)
  }

  /**
   * Send queued messages after reconnection
   */
  private flushMessageQueue(network: string): void {
    const queue = this.messageQueue.get(network)
    const ws = this.sockets.get(network)

    if (queue && ws && ws.readyState === WebSocket.OPEN) {
      queue.forEach((message) => {
        try {
          ws.send(JSON.stringify(message))
        } catch (error) {
          console.error(`[WebSocket] Failed to send queued message:`, error)
        }
      })
      this.messageQueue.delete(network)
    }
  }

  /**
   * Disconnect from a specific network
   */
  disconnect(network: string): void {
    const timer = this.reconnectTimers.get(network)
    if (timer) {
      clearTimeout(timer)
      this.reconnectTimers.delete(network)
    }

    this.stopHeartbeat(network)
    const ws = this.sockets.get(network)
    if (ws) {
      ws.close(1000, 'Client disconnect')
      this.sockets.delete(network)
    }
    this.subscriptions.delete(network)
    this.reconnectAttempts.delete(network)
    this.messageQueue.delete(network)
  }

  /**
   * Disconnect from all networks
   */
  disconnectAll(): void {
    Array.from(this.sockets.keys()).forEach((network) => {
      this.disconnect(network)
    })
  }

  /**
   * Get connection status
   */
  getConnectionStatus(network?: string): Map<string, 'connected' | 'disconnected' | 'connecting'> {
    const status = new Map<string, 'connected' | 'disconnected' | 'connecting'>()

    if (network) {
      const ws = this.sockets.get(network)
      if (ws) {
        switch (ws.readyState) {
          case WebSocket.CONNECTING:
            status.set(network, 'connecting')
            break
          case WebSocket.OPEN:
            status.set(network, 'connected')
            break
          default:
            status.set(network, 'disconnected')
        }
      } else {
        status.set(network, 'disconnected')
      }
    } else {
      // Get status for all networks
      for (const [net, ws] of this.sockets) {
        switch (ws.readyState) {
          case WebSocket.CONNECTING:
            status.set(net, 'connecting')
            break
          case WebSocket.OPEN:
            status.set(net, 'connected')
            break
          default:
            status.set(net, 'disconnected')
        }
      }
    }

    return status
  }

  /**
   * Clean up all resources
   */
  destroy(): void {
    this.isDestroyed = true
    this.disconnectAll()
    this.messageQueue.clear()
  }
}

// Create singleton instance
export const webSocketProvider = new WebSocketProvider()