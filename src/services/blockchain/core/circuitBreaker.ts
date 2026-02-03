export interface CircuitBreakerConfig {
  failureThreshold: number
  resetTimeout: number
  halfOpenRequests: number
  timeout?: number // Optional timeout for operations
}

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

export class CircuitBreakerError extends Error {
  constructor(
    message: string,
    public readonly state: CircuitState,
    public readonly lastError?: Error
  ) {
    super(message)
    this.name = 'CircuitBreakerError'
  }
}

export class CircuitBreaker {
  private state = CircuitState.CLOSED
  private failures = 0
  private lastFailureTime = 0
  private successCount = 0
  private lastError?: Error
  private resetTimer?: NodeJS.Timeout

  constructor(
    private name: string,
    private config: CircuitBreakerConfig = {
      failureThreshold: 5,
      resetTimeout: 60000, // 1 minute
      halfOpenRequests: 3
    }
  ) {}

  async execute<T>(
    operation: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    // Check if circuit should be reset
    this.checkReset()

    switch (this.state) {
      case CircuitState.OPEN:
        console.warn(`Circuit breaker ${this.name} is OPEN`)
        if (fallback) {
          return fallback()
        }
        throw new CircuitBreakerError(
          `Circuit breaker ${this.name} is OPEN`,
          this.state,
          this.lastError
        )

      case CircuitState.HALF_OPEN:
        console.log(`Circuit breaker ${this.name} is HALF_OPEN, testing...`)
        return this.executeInHalfOpen(operation, fallback)

      case CircuitState.CLOSED:
        return this.executeInClosed(operation, fallback)
    }
  }

  private async executeInClosed<T>(
    operation: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    try {
      const result = await this.executeWithTimeout(operation)
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure(error as Error)

      if (this.state === CircuitState.OPEN && fallback) {
        console.warn(`Circuit breaker ${this.name} opened, using fallback`)
        return fallback()
      }

      throw error
    }
  }

  private async executeInHalfOpen<T>(
    operation: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    try {
      const result = await this.executeWithTimeout(operation)
      this.successCount++

      if (this.successCount >= this.config.halfOpenRequests) {
        this.close()
      }

      return result
    } catch (error) {
      this.open(error as Error)

      if (fallback) {
        return fallback()
      }

      throw error
    }
  }

  private async executeWithTimeout<T>(operation: () => Promise<T>): Promise<T> {
    if (!this.config.timeout) {
      return operation()
    }

    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Operation timed out after ${this.config.timeout}ms`))
      }, this.config.timeout)

      operation()
        .then(result => {
          clearTimeout(timer)
          resolve(result)
        })
        .catch(error => {
          clearTimeout(timer)
          reject(error)
        })
    })
  }

  private onSuccess(): void {
    this.failures = 0
    this.lastError = undefined
  }

  private onFailure(error: Error): void {
    this.failures++
    this.lastError = error
    this.lastFailureTime = Date.now()

    if (this.failures >= this.config.failureThreshold) {
      this.open(error)
    }
  }

  private open(error?: Error): void {
    this.state = CircuitState.OPEN
    this.successCount = 0
    if (error) {
      this.lastError = error
    }
    
    console.error(`Circuit breaker ${this.name} opened after ${this.failures} failures`)
    
    // Set timer to move to half-open
    if (this.resetTimer) {
      clearTimeout(this.resetTimer)
    }
    
    this.resetTimer = setTimeout(() => {
      this.state = CircuitState.HALF_OPEN
      this.successCount = 0
      console.log(`Circuit breaker ${this.name} moved to HALF_OPEN`)
    }, this.config.resetTimeout)
  }

  private close(): void {
    this.state = CircuitState.CLOSED
    this.failures = 0
    this.successCount = 0
    this.lastError = undefined
    
    if (this.resetTimer) {
      clearTimeout(this.resetTimer)
      this.resetTimer = undefined
    }
    
    console.log(`Circuit breaker ${this.name} closed`)
  }

  private checkReset(): void {
    // Timer-based reset is now handled in open() method
    // This method is kept for potential manual reset logic
  }

  getState(): CircuitState {
    return this.state
  }

  getStats(): {
    state: CircuitState
    failures: number
    lastFailureTime: number
    lastError?: Error
  } {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime,
      lastError: this.lastError
    }
  }

  reset(): void {
    this.close()
  }

  forceOpen(error?: Error): void {
    this.open(error)
  }

  destroy(): void {
    if (this.resetTimer) {
      clearTimeout(this.resetTimer)
      this.resetTimer = undefined
    }
  }
}

// Circuit breaker factory for managing multiple breakers
export class CircuitBreakerFactory {
  private breakers = new Map<string, CircuitBreaker>()

  getBreaker(
    name: string,
    config?: CircuitBreakerConfig
  ): CircuitBreaker {
    let breaker = this.breakers.get(name)
    
    if (!breaker) {
      breaker = new CircuitBreaker(name, config)
      this.breakers.set(name, breaker)
    }
    
    return breaker
  }

  removeBreaker(name: string): void {
    const breaker = this.breakers.get(name)
    if (breaker) {
      breaker.destroy()
      this.breakers.delete(name)
    }
  }

  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset()
    }
  }

  destroyAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.destroy()
    }
    this.breakers.clear()
  }

  getStats(): Map<string, any> {
    const stats = new Map()
    for (const [name, breaker] of this.breakers) {
      stats.set(name, breaker.getStats())
    }
    return stats
  }
}

// Export singleton factory
export const circuitBreakerFactory = new CircuitBreakerFactory()