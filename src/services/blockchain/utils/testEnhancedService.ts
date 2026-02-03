// Test file to verify enhanced service integration
import { enhancedBlockchainService } from '../enhancedBlockchainService'
import { blockchainEventBus } from '../core'

// Test event bus integration
console.log('Testing Enhanced Blockchain Service Integration...')

// Subscribe to events
const unsubBalance = blockchainEventBus.on('balance:update', (data) => {
  console.log('Balance update received:', data)
})

const unsubError = blockchainEventBus.on('error', (data) => {
  console.log('Error received:', data)
})

// Get stats
const stats = enhancedBlockchainService.getStats()
console.log('Service stats:', stats)

// Cleanup
unsubBalance()
unsubError()

console.log('Integration test complete!')

export {}