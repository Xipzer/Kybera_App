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

export interface Wallet {
  id: string
  name: string
  address: string
  type: ChainType
  encryptedPrivateKey: string
  createdAt: Date
  isImported: boolean
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