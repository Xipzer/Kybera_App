export interface TokenInfo {
  address: string
  symbol: string
  name: string
  decimals: number
  logoURI?: string
  chainId: string | number
  tags?: string[]
}

export interface TokenDiscoveryProvider {
  name: string
  supportedChains: (string | number)[]
  discoverTokens(walletAddress: string, chainId: string | number): Promise<TokenInfo[]>
}

export interface TokenListProvider {
  name: string
  url: string
  chainId: string | number
}

export interface TokenList {
  name: string
  timestamp: string
  version: {
    major: number
    minor: number
    patch: number
  }
  tokens: TokenInfo[]
}