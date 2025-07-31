import { EVM_NETWORKS, SVM_NETWORKS } from '../../utils/networks'

export function logAlchemyStatus() {
  console.log('🔷 Alchemy SDK Configuration Status:')
  console.log('=====================================')
  
  console.log('\n📊 EVM Networks:')
  EVM_NETWORKS.forEach(network => {
    if (network.alchemyRpcUrl) {
      console.log(`✅ ${network.name} (Chain ID: ${network.chainId}) - Alchemy configured`)
    } else {
      console.log(`❌ ${network.name} (Chain ID: ${network.chainId}) - No Alchemy RPC`)
    }
  })
  
  console.log('\n📊 Solana Networks:')
  SVM_NETWORKS.forEach(network => {
    if (network.alchemyRpcUrl) {
      console.log(`⚠️  ${network.name} - Alchemy RPC configured but token fetching not yet implemented`)
    } else {
      console.log(`❌ ${network.name} - No Alchemy RPC`)
    }
  })
  
  console.log('\n💡 Benefits of Alchemy SDK:')
  console.log('- Single API call for all token balances (instead of checking each token)')
  console.log('- Automatic token discovery (finds tokens you haven\'t added manually)')
  console.log('- Much faster performance')
  console.log('- Automatic fallback to standard RPC on errors')
  console.log('=====================================\n')
}

// Log status on module load
if (typeof window !== 'undefined') {
  // Only log in browser environment
  setTimeout(() => {
    logAlchemyStatus()
  }, 1000)
}