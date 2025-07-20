/**
 * Code by Xipzer
 */

export type ChainType = 'EVM' | 'SVM'

export interface Network {
  id: string
  name: string
  chainId: number | string
  rpcUrl: string
  alchemyRpcUrl?: string
  symbol: string
  explorerUrl: string
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
  encryptedSeed: string
  createdAt: Date
  walletCount: number
  evmWalletCount: number
  svmWalletCount: number
  order?: number
}

export interface Wallet {
  id: string
  groupId: string
  name: string
  address: string
  type: ChainType
  derivationIndex: number
  createdAt: Date
  encryptedPrivateKey?: string
  isImported?: boolean
  order?: number
  lastNetworkId?: string
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
  change24h?: number
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
  tokenAddress?: string
  tokenSymbol?: string
  tokenDecimals?: number
  gasUsed?: string
  blockNumber?: number
}