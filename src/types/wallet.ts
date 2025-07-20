export type ChainType = 'EVM' | 'SVM'

export interface Network {
  id: string
  name: string
  chainId: number | string
  rpcUrl: string
  symbol: string
  explorer: string
  type: ChainType
}

export interface WalletGroup {
  id: string
  name: string
  type: ChainType // Groups are restricted to a single chain type
  encryptedSeed: string // Encrypted mnemonic seed phrase
  createdAt: Date
  walletCount: number // Track number of wallets in group
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