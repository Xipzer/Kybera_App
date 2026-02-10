/**
 * Code by Xipzer
 */

import { ResearchNetwork } from '../../types/research'

const GOPLUS_CHAIN_IDS: Record<ResearchNetwork, string> = {
  ethereum: '1',
  base: '8453',
  arbitrum: '42161',
  optimism: '10',
  solana: 'solana',
}

export interface GoPlusTokenSecurity {
  isHoneypot: boolean
  isOpenSource: boolean
  isProxy: boolean
  ownerAddress: string | null
  canTakeBackOwnership: boolean
  cannotSellAll: boolean
  slippageModifiable: boolean
  isAntiWhale: boolean
  tradingCooldown: boolean
  transferPausable: boolean
  hiddenOwner: boolean
  selfDestruct: boolean
  externalCall: boolean
  isMintable: boolean
  isBlacklisted: boolean
  isTrueToken: boolean
  trustList: boolean
  holderCount: number
  lpHolderCount: number
  totalSupply: string
  riskScore: number
  riskFlags: string[]
}

export interface GoPlusMaliciousAddress {
  isMalicious: boolean
  maliciousType: string | null
  tag: string | null
}

export interface GoPlusSecurityReport {
  tokenSecurity: GoPlusTokenSecurity | null
  deployerRisk: GoPlusMaliciousAddress | null
  overallRiskScore: number
  riskSummary: string
}

const RISK_FLAG_DEFINITIONS: {
  key: keyof GoPlusTokenSecurity
  flag: string
  points: number
  condition: 'truthy' | 'falsy'
}[] = [
  { key: 'isHoneypot', flag: 'Honeypot detected', points: 25, condition: 'truthy' },
  { key: 'canTakeBackOwnership', flag: 'Owner can take back ownership', points: 15, condition: 'truthy' },
  { key: 'cannotSellAll', flag: 'Cannot sell all tokens', points: 20, condition: 'truthy' },
  { key: 'slippageModifiable', flag: 'Slippage is modifiable', points: 10, condition: 'truthy' },
  { key: 'hiddenOwner', flag: 'Hidden owner detected', points: 15, condition: 'truthy' },
  { key: 'selfDestruct', flag: 'Self-destruct function present', points: 20, condition: 'truthy' },
  { key: 'externalCall', flag: 'External call risk', points: 10, condition: 'truthy' },
  { key: 'isMintable', flag: 'Minting enabled', points: 10, condition: 'truthy' },
  { key: 'isProxy', flag: 'Proxy contract (upgradeable)', points: 5, condition: 'truthy' },
  { key: 'transferPausable', flag: 'Transfers can be paused', points: 10, condition: 'truthy' },
  { key: 'tradingCooldown', flag: 'Trading cooldown enabled', points: 5, condition: 'truthy' },
  { key: 'isBlacklisted', flag: 'Blacklist function present', points: 10, condition: 'truthy' },
  { key: 'isOpenSource', flag: 'Contract is not open source', points: 15, condition: 'falsy' },
]

class GoPlusService {
  private readonly BASE_URL = 'https://api.gopluslabs.io/api/v1'

  async getTokenSecurity(
    address: string,
    network: ResearchNetwork,
  ): Promise<GoPlusTokenSecurity | null> {
    try {
      const chainId = GOPLUS_CHAIN_IDS[network]
      const lowerAddress = address.toLowerCase()

      let url: string
      if (network === 'solana') {
        url = `${this.BASE_URL}/solana/token_security/v1?contract_addresses=${address}`
      } else {
        url = `${this.BASE_URL}/token_security/${chainId}?contract_addresses=${lowerAddress}`
      }

      const response = await fetch(url)
      if (!response.ok) {
        console.error(`[GoPlus] Token security API error: ${response.statusText}`)
        return null
      }

      const data = await response.json()

      if (data.code !== 1 || !data.result) {
        console.error('[GoPlus] Unexpected response format:', data.message || 'unknown error')
        return null
      }

      const lookupKey = network === 'solana' ? address : lowerAddress
      const tokenData = data.result[lookupKey]

      if (!tokenData) {
        console.warn('[GoPlus] No data found for address:', address)
        return null
      }

      return this.parseTokenSecurity(tokenData)
    } catch (error) {
      console.error('[GoPlus] Error fetching token security:', error)
      return null
    }
  }

  async checkMaliciousAddress(
    address: string,
    network: ResearchNetwork,
  ): Promise<GoPlusMaliciousAddress | null> {
    try {
      const chainId = GOPLUS_CHAIN_IDS[network]
      const url = `${this.BASE_URL}/address_security/${address}?chain_id=${chainId}`

      const response = await fetch(url)
      if (!response.ok) {
        console.error(`[GoPlus] Address security API error: ${response.statusText}`)
        return null
      }

      const data = await response.json()

      if (data.code !== 1 || !data.result) {
        console.error('[GoPlus] Unexpected response format:', data.message || 'unknown error')
        return null
      }

      return {
        isMalicious: data.result.is_malicious_address === '1' || data.result.is_malicious_address === 1,
        maliciousType: data.result.malicious_type || null,
        tag: data.result.tag || null,
      }
    } catch (error) {
      console.error('[GoPlus] Error checking malicious address:', error)
      return null
    }
  }

  async getFullSecurityReport(
    contractAddress: string,
    deployerAddress: string | null,
    network: ResearchNetwork,
  ): Promise<GoPlusSecurityReport> {
    const [tokenSecurity, deployerRisk] = await Promise.all([
      this.getTokenSecurity(contractAddress, network),
      deployerAddress ? this.checkMaliciousAddress(deployerAddress, network) : Promise.resolve(null),
    ])

    let overallRiskScore = tokenSecurity?.riskScore ?? 0

    if (deployerRisk?.isMalicious) {
      overallRiskScore = Math.min(100, overallRiskScore + 30)
    }

    const riskSummary = this.generateRiskSummary(overallRiskScore, tokenSecurity, deployerRisk)

    return {
      tokenSecurity,
      deployerRisk,
      overallRiskScore,
      riskSummary,
    }
  }

  private parseTokenSecurity(raw: Record<string, any>): GoPlusTokenSecurity {
    const toBool = (val: any): boolean => val === '1' || val === 1 || val === true

    const security: GoPlusTokenSecurity = {
      isHoneypot: toBool(raw.is_honeypot),
      isOpenSource: toBool(raw.is_open_source),
      isProxy: toBool(raw.is_proxy),
      ownerAddress: raw.owner_address || null,
      canTakeBackOwnership: toBool(raw.can_take_back_ownership),
      cannotSellAll: toBool(raw.cannot_sell_all),
      slippageModifiable: toBool(raw.slippage_modifiable),
      isAntiWhale: toBool(raw.is_anti_whale),
      tradingCooldown: toBool(raw.trading_cooldown),
      transferPausable: toBool(raw.transfer_pausable),
      hiddenOwner: toBool(raw.hidden_owner),
      selfDestruct: toBool(raw.selfdestruct),
      externalCall: toBool(raw.external_call),
      isMintable: toBool(raw.is_mintable),
      isBlacklisted: toBool(raw.is_blacklisted),
      isTrueToken: toBool(raw.is_true_token),
      trustList: toBool(raw.trust_list),
      holderCount: parseInt(raw.holder_count) || 0,
      lpHolderCount: raw.lp_holders ? raw.lp_holders.length : 0,
      totalSupply: raw.total_supply || '0',
      riskScore: 0,
      riskFlags: [],
    }

    const { score, flags } = this.computeRiskScore(security)
    security.riskScore = score
    security.riskFlags = flags

    return security
  }

  private computeRiskScore(security: GoPlusTokenSecurity): {
    score: number
    flags: string[]
  } {
    let score = 0
    const flags: string[] = []

    for (const def of RISK_FLAG_DEFINITIONS) {
      const value = security[def.key]
      const triggered =
        def.condition === 'truthy' ? Boolean(value) : !value

      if (triggered) {
        score += def.points
        flags.push(def.flag)
      }
    }

    return {
      score: Math.min(100, score),
      flags,
    }
  }

  private generateRiskSummary(
    overallScore: number,
    tokenSecurity: GoPlusTokenSecurity | null,
    deployerRisk: GoPlusMaliciousAddress | null,
  ): string {
    const parts: string[] = []

    if (overallScore === 0 && tokenSecurity) {
      return 'No risk flags detected — contract appears safe based on GoPlus analysis.'
    }

    if (!tokenSecurity) {
      return 'Unable to retrieve token security data from GoPlus.'
    }

    if (tokenSecurity.isHoneypot) {
      parts.push('HONEYPOT DETECTED')
    }

    if (deployerRisk?.isMalicious) {
      const typeInfo = deployerRisk.maliciousType ? ` (${deployerRisk.maliciousType})` : ''
      parts.push(`Deployer flagged as malicious${typeInfo}`)
    }

    const flagCount = tokenSecurity.riskFlags.length
    if (flagCount > 0 && !tokenSecurity.isHoneypot) {
      parts.push(`${flagCount} risk flag${flagCount > 1 ? 's' : ''} detected`)
    }

    if (overallScore >= 70) {
      parts.push('HIGH RISK — consider avoiding')
    } else if (overallScore >= 40) {
      parts.push('MODERATE RISK — proceed with caution')
    } else {
      parts.push('LOW RISK — minor concerns only')
    }

    return parts.join('. ') + '.'
  }
}

export const goPlusService = new GoPlusService()
