export type ChainType = 'EVM' | 'SVM'

export interface Network {
  id: string
  name: string
  chainId: number | string
  rpcUrl: string
  symbol: string
  explorer: string
  explorerUrl: string // Full URL for explorer
  type: ChainType
  nativeCurrency: {
    name: string
    symbol: string
    decimals: number
  }
}

export interface WalletGroup {
  id: string
  name: string
  encryptedSeed: string // Encrypted mnemonic seed phrase
  createdAt: Date
  walletCount: number // Track total number of wallets in group
  // Track wallet counts per chain type
  evmWalletCount: number
  svmWalletCount: number
  order?: number
}

export interface Wallet {
  id: string
  groupId: string // Reference to wallet group
  name: string
  address: string
  type: ChainType
  derivationIndex: number // BIP44 derivation index
  createdAt: Date
  // For imported wallets that don't belong to a group
  encryptedPrivateKey?: string
  isImported?: boolean
  order?: number
}

export interface WalletBalance {
  native: string
  tokens: TokenBalance[]
}

export interface TokenBalance {
  address: string
  symbol: string
  name: string
  decimals: number
  balance: string
  usdValue?: number
  logoURI?: string
}

export interface Transaction {
  hash: string
  from: string
  to: string
  value: string
  status: 'pending' | 'confirmed' | 'failed'
  timestamp: Date
  network: string
}