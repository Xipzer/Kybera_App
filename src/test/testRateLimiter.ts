import { rateLimiter } from '../services/api/rateLimiter'

// Test the rate limiter
async function testRateLimiter() {
  console.log('Testing rate limiter...')
  
  // Test 1: Deduplication - same request ID should return same promise
  console.log('\nTest 1: Deduplication')
  const request1 = rateLimiter.execute('test-1', async () => {
    console.log('Executing request 1')
    await new Promise(resolve => setTimeout(resolve, 1000))
    return 'Result 1'
  })
  
  const request2 = rateLimiter.execute('test-1', async () => {
    console.log('This should not execute - duplicate request')
    return 'Result 2'
  })
  
  const [result1, result2] = await Promise.all([request1, request2])
  console.log('Results:', { result1, result2 })
  console.log('Same result?', result1 === result2)
  
  // Test 2: Rate limiting - multiple requests should be queued
  console.log('\nTest 2: Rate limiting')
  const startTime = Date.now()
  const requests = []
  
  for (let i = 0; i < 5; i++) {
    requests.push(
      rateLimiter.execute(`test-rate-${i}`, async () => {
        const elapsed = Date.now() - startTime
        console.log(`Request ${i} executing at ${elapsed}ms`)
        return `Result ${i}`
      })
    )
  }
  
  await Promise.all(requests)
  const totalTime = Date.now() - startTime
  console.log(`Total time: ${totalTime}ms (should be ~4000ms for 5 requests with 1s interval)`)
  
  // Test 3: Status check
  console.log('\nTest 3: Status')
  console.log('Rate limiter status:', rateLimiter.getStatus())
}

// Run the test
testRateLimiter().catch(console.error)