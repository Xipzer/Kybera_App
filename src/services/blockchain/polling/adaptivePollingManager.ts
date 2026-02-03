import { blockchainEventBus } from '../core/eventBus'

export interface AdaptivePollingConfig {
  intervals: {
    active: number      // User actively interacting
    idle: number        // User present but not active
    background: number  // Tab hidden or minimized
    offline: number     // No network connection
  }
  thresholds: {
    activityTimeout: number  // Time before considering user idle
    errorBackoff: number[]   // Exponential backoff on errors
  }
}

interface PollTask {
  callback: () => Promise<void>
  lastRun: number
  errorCount: number
  timer?: NodeJS.Timeout
}

export class AdaptivePollingManager {
  private config: AdaptivePollingConfig = {
    intervals: {
      active: 5000,      // 5 seconds
      idle: 30000,       // 30 seconds
      background: 60000, // 1 minute
      offline: 0         // Stop polling
    },
    thresholds: {
      activityTimeout: 60000,  // 1 minute
      errorBackoff: [5000, 10000, 30000, 60000] // Up to 1 minute
    }
  }

  private lastActivity = Date.now()
  private visibilityState: DocumentVisibilityState = 'visible'
  private connectionStatus: 'online' | 'offline' = 'online'
  private polls = new Map<string, PollTask>()
  private activityListeners: Array<() => void> = []
  private isInitialized = false

  constructor(customConfig?: Partial<AdaptivePollingConfig>) {
    if (customConfig) {
      this.config = {
        intervals: { ...this.config.intervals, ...customConfig.intervals },
        thresholds: { ...this.config.thresholds, ...customConfig.thresholds }
      }
    }
    this.initialize()
  }

  private initialize(): void {
    if (this.isInitialized || typeof window === 'undefined') return
    
    this.setupEventListeners()
    this.isInitialized = true
  }

  private setupEventListeners(): void {
    // User activity detection
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove']
    
    const handleActivity = () => {
      const now = Date.now()
      // Only update if it's been more than 1 second since last activity
      if (now - this.lastActivity > 1000) {
        this.lastActivity = now
        blockchainEventBus.emit('activity:detected', { type: 'user' })
        this.adjustAllPollingIntervals()
      }
    }
    
    activityEvents.forEach(event => {
      const listener = () => handleActivity()
      document.addEventListener(event, listener, { passive: true })
      this.activityListeners.push(() => 
        document.removeEventListener(event, listener)
      )
    })

    // Visibility change detection
    const handleVisibilityChange = () => {
      this.visibilityState = document.visibilityState
      blockchainEventBus.emit('activity:detected', { 
        type: this.visibilityState === 'visible' ? 'user' : 'background' 
      })
      this.adjustAllPollingIntervals()
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    this.activityListeners.push(() => 
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    )

    // Network status detection
    const handleOnline = () => {
      this.connectionStatus = 'online'
      blockchainEventBus.emit('connection:status', { status: 'connected' })
      this.adjustAllPollingIntervals()
    }
    
    const handleOffline = () => {
      this.connectionStatus = 'offline'
      blockchainEventBus.emit('connection:status', { status: 'disconnected' })
      this.adjustAllPollingIntervals()
    }
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    this.activityListeners.push(() => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    })
  }

  getCurrentInterval(errorCount: number = 0): number {
    // Offline - no polling
    if (this.connectionStatus === 'offline') {
      return this.config.intervals.offline
    }

    // Error backoff
    if (errorCount > 0) {
      const backoffIndex = Math.min(
        errorCount - 1, 
        this.config.thresholds.errorBackoff.length - 1
      )
      return this.config.thresholds.errorBackoff[backoffIndex]
    }

    // Background tab
    if (this.visibilityState === 'hidden') {
      return this.config.intervals.background
    }

    // Check if user is active
    const timeSinceActivity = Date.now() - this.lastActivity
    if (timeSinceActivity < this.config.thresholds.activityTimeout) {
      return this.config.intervals.active
    }

    // User is idle
    return this.config.intervals.idle
  }

  startPolling(
    id: string,
    callback: () => Promise<void>,
    options?: { immediate?: boolean }
  ): void {
    // Stop existing poll
    this.stopPolling(id)

    const pollTask: PollTask = {
      callback,
      lastRun: 0,
      errorCount: 0
    }

    const executePoll = async () => {
      // Don't run if offline
      if (this.connectionStatus === 'offline') {
        this.scheduleNextPoll(id, pollTask)
        return
      }

      pollTask.lastRun = Date.now()

      try {
        await callback()
        pollTask.errorCount = 0 // Reset on success
      } catch (error) {
        pollTask.errorCount++
        console.error(`Polling error for ${id}:`, error)
        blockchainEventBus.emit('error', {
          source: 'adaptive_polling',
          error: error as Error
        })
      }

      this.scheduleNextPoll(id, pollTask)
    }

    this.polls.set(id, pollTask)

    // Start immediately if requested
    if (options?.immediate !== false) {
      executePoll()
    } else {
      this.scheduleNextPoll(id, pollTask)
    }
  }

  private scheduleNextPoll(id: string, task: PollTask): void {
    const interval = this.getCurrentInterval(task.errorCount)
    
    if (interval > 0) {
      task.timer = setTimeout(async () => {
        const currentTask = this.polls.get(id)
        if (currentTask === task) {
          await this.executePollTask(id, task)
        }
      }, interval)
    }
  }

  private async executePollTask(id: string, task: PollTask): Promise<void> {
    // Re-check if task is still active
    if (this.polls.get(id) !== task) return

    task.lastRun = Date.now()

    try {
      await task.callback()
      task.errorCount = 0
    } catch (error) {
      task.errorCount++
      console.error(`Polling error for ${id}:`, error)
    }

    // Schedule next poll
    if (this.polls.has(id)) {
      this.scheduleNextPoll(id, task)
    }
  }

  stopPolling(id: string): void {
    const task = this.polls.get(id)
    if (task) {
      if (task.timer) {
        clearTimeout(task.timer)
      }
      this.polls.delete(id)
    }
  }

  stopAll(): void {
    for (const [id, task] of this.polls) {
      if (task.timer) {
        clearTimeout(task.timer)
      }
    }
    this.polls.clear()
  }

  private adjustAllPollingIntervals(): void {
    // Re-schedule all polls with new intervals
    for (const [id, task] of this.polls) {
      if (task.timer) {
        clearTimeout(task.timer)
        this.scheduleNextPoll(id, task)
      }
    }
  }

  getPollingStats(): {
    activePolls: number
    intervals: Record<string, number>
    status: {
      connection: 'online' | 'offline'
      visibility: DocumentVisibilityState
      lastActivity: number
      currentState: 'active' | 'idle' | 'background' | 'offline'
    }
  } {
    const timeSinceActivity = Date.now() - this.lastActivity
    let currentState: 'active' | 'idle' | 'background' | 'offline'

    if (this.connectionStatus === 'offline') {
      currentState = 'offline'
    } else if (this.visibilityState === 'hidden') {
      currentState = 'background'
    } else if (timeSinceActivity < this.config.thresholds.activityTimeout) {
      currentState = 'active'
    } else {
      currentState = 'idle'
    }

    const intervals: Record<string, number> = {}
    for (const [id, task] of this.polls) {
      intervals[id] = this.getCurrentInterval(task.errorCount)
    }

    return {
      activePolls: this.polls.size,
      intervals,
      status: {
        connection: this.connectionStatus,
        visibility: this.visibilityState,
        lastActivity: this.lastActivity,
        currentState
      }
    }
  }

  updateConfig(newConfig: Partial<AdaptivePollingConfig>): void {
    this.config = {
      intervals: { ...this.config.intervals, ...newConfig.intervals },
      thresholds: { ...this.config.thresholds, ...newConfig.thresholds }
    }
    this.adjustAllPollingIntervals()
  }

  destroy(): void {
    this.stopAll()
    
    // Remove all event listeners
    this.activityListeners.forEach(cleanup => cleanup())
    this.activityListeners = []
    
    this.isInitialized = false
  }
}

// Create singleton instance
export const adaptivePollingManager = new AdaptivePollingManager()