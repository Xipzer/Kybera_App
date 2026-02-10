/**
 * Code by Xipzer
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { goPlusService } from '../services/research/goPlusService'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

beforeEach(() => {
  mockFetch.mockReset()
})

describe('goPlusService', () => {
  describe('getTokenSecurity', () => {
    it('returns parsed token security for a valid EVM token', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          code: 1,
          result: {
            '0xabc123': {
              is_honeypot: '0',
              is_open_source: '1',
              is_proxy: '0',
              owner_address: '0xOwner',
              can_take_back_ownership: '0',
              cannot_sell_all: '0',
              slippage_modifiable: '0',
              is_anti_whale: '0',
              trading_cooldown: '0',
              transfer_pausable: '0',
              hidden_owner: '0',
              selfdestruct: '0',
              external_call: '0',
              is_mintable: '0',
              is_blacklisted: '0',
              is_true_token: '1',
              trust_list: '0',
              holder_count: '1500',
              lp_holders: [{ address: '0x1' }],
              total_supply: '1000000',
            },
          },
        }),
      })

      const result = await goPlusService.getTokenSecurity('0xABC123', 'ethereum')

      expect(result).not.toBeNull()
      expect(result!.isHoneypot).toBe(false)
      expect(result!.isOpenSource).toBe(true)
      expect(result!.ownerAddress).toBe('0xOwner')
      expect(result!.holderCount).toBe(1500)
      expect(result!.riskScore).toBe(0)
      expect(result!.riskFlags).toEqual([])
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('token_security/1?contract_addresses=0xabc123'),
      )
    })

    it('uses solana-specific URL for solana network', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          code: 1,
          result: {
            SoLTokenAddr: {
              is_honeypot: '0',
              is_open_source: '1',
              is_proxy: '0',
              owner_address: null,
              can_take_back_ownership: '0',
              cannot_sell_all: '0',
              slippage_modifiable: '0',
              is_anti_whale: '0',
              trading_cooldown: '0',
              transfer_pausable: '0',
              hidden_owner: '0',
              selfdestruct: '0',
              external_call: '0',
              is_mintable: '0',
              is_blacklisted: '0',
              is_true_token: '0',
              trust_list: '0',
              holder_count: '10',
              total_supply: '999',
            },
          },
        }),
      })

      await goPlusService.getTokenSecurity('SoLTokenAddr', 'solana')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('solana/token_security/v1?contract_addresses=SoLTokenAddr'),
      )
    })

    it('returns null on API error', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, statusText: 'Service Unavailable' })

      const result = await goPlusService.getTokenSecurity('0xabc', 'ethereum')
      expect(result).toBeNull()
    })

    it('returns null when token not found in results', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ code: 1, result: {} }),
      })

      const result = await goPlusService.getTokenSecurity('0xnotfound', 'base')
      expect(result).toBeNull()
    })

    it('returns null on unexpected response format', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ code: 0, message: 'error' }),
      })

      const result = await goPlusService.getTokenSecurity('0xabc', 'ethereum')
      expect(result).toBeNull()
    })

    it('calculates risk score and flags for risky tokens', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          code: 1,
          result: {
            '0xbad': {
              is_honeypot: '1',
              is_open_source: '0',
              is_proxy: '1',
              owner_address: null,
              can_take_back_ownership: '1',
              cannot_sell_all: '1',
              slippage_modifiable: '1',
              is_anti_whale: '0',
              trading_cooldown: '0',
              transfer_pausable: '0',
              hidden_owner: '1',
              selfdestruct: '1',
              external_call: '1',
              is_mintable: '1',
              is_blacklisted: '0',
              is_true_token: '0',
              trust_list: '0',
              holder_count: '5',
              total_supply: '100',
            },
          },
        }),
      })

      const result = await goPlusService.getTokenSecurity('0xBAD', 'ethereum')

      expect(result).not.toBeNull()
      expect(result!.isHoneypot).toBe(true)
      expect(result!.riskScore).toBeGreaterThan(50)
      expect(result!.riskFlags).toContain('Honeypot detected')
      expect(result!.riskFlags).toContain('Contract is not open source')
      expect(result!.riskFlags).toContain('Hidden owner detected')
    })

    it('handles network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network timeout'))

      const result = await goPlusService.getTokenSecurity('0xabc', 'ethereum')
      expect(result).toBeNull()
    })
  })

  describe('checkMaliciousAddress', () => {
    it('detects malicious address', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          code: 1,
          result: {
            is_malicious_address: '1',
            malicious_type: 'phishing',
            tag: 'scammer',
          },
        }),
      })

      const result = await goPlusService.checkMaliciousAddress('0xscam', 'ethereum')

      expect(result).not.toBeNull()
      expect(result!.isMalicious).toBe(true)
      expect(result!.maliciousType).toBe('phishing')
      expect(result!.tag).toBe('scammer')
    })

    it('returns safe result for clean address', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          code: 1,
          result: {
            is_malicious_address: '0',
            malicious_type: null,
            tag: null,
          },
        }),
      })

      const result = await goPlusService.checkMaliciousAddress('0xsafe', 'base')

      expect(result).not.toBeNull()
      expect(result!.isMalicious).toBe(false)
    })

    it('returns null on API failure', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, statusText: 'Error' })

      const result = await goPlusService.checkMaliciousAddress('0x123', 'ethereum')
      expect(result).toBeNull()
    })
  })

  describe('getFullSecurityReport', () => {
    it('combines token security and deployer risk', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          code: 1,
          result: {
            '0xtoken': {
              is_honeypot: '0',
              is_open_source: '1',
              is_proxy: '0',
              owner_address: null,
              can_take_back_ownership: '0',
              cannot_sell_all: '0',
              slippage_modifiable: '0',
              is_anti_whale: '0',
              trading_cooldown: '0',
              transfer_pausable: '0',
              hidden_owner: '0',
              selfdestruct: '0',
              external_call: '0',
              is_mintable: '0',
              is_blacklisted: '0',
              is_true_token: '1',
              trust_list: '1',
              holder_count: '5000',
              total_supply: '1000000',
            },
          },
        }),
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          code: 1,
          result: { is_malicious_address: '0' },
        }),
      })

      const report = await goPlusService.getFullSecurityReport('0xtoken', '0xdeployer', 'ethereum')

      expect(report.tokenSecurity).not.toBeNull()
      expect(report.deployerRisk).not.toBeNull()
      expect(report.overallRiskScore).toBe(0)
      expect(report.riskSummary).toContain('No risk flags detected')
    })

    it('increases risk score when deployer is malicious', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          code: 1,
          result: {
            '0xtoken': {
              is_honeypot: '0',
              is_open_source: '1',
              is_proxy: '0',
              owner_address: null,
              can_take_back_ownership: '0',
              cannot_sell_all: '0',
              slippage_modifiable: '0',
              is_anti_whale: '0',
              trading_cooldown: '0',
              transfer_pausable: '0',
              hidden_owner: '0',
              selfdestruct: '0',
              external_call: '0',
              is_mintable: '0',
              is_blacklisted: '0',
              is_true_token: '1',
              trust_list: '0',
              holder_count: '100',
              total_supply: '100000',
            },
          },
        }),
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          code: 1,
          result: { is_malicious_address: '1', malicious_type: 'rug_pull' },
        }),
      })

      const report = await goPlusService.getFullSecurityReport('0xtoken', '0xbaddeployer', 'ethereum')

      expect(report.overallRiskScore).toBe(30)
      expect(report.riskSummary).toContain('malicious')
    })

    it('handles null deployer address', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          code: 1,
          result: {
            '0xtoken': {
              is_honeypot: '0',
              is_open_source: '1',
              is_proxy: '0',
              owner_address: null,
              can_take_back_ownership: '0',
              cannot_sell_all: '0',
              slippage_modifiable: '0',
              is_anti_whale: '0',
              trading_cooldown: '0',
              transfer_pausable: '0',
              hidden_owner: '0',
              selfdestruct: '0',
              external_call: '0',
              is_mintable: '0',
              is_blacklisted: '0',
              is_true_token: '1',
              trust_list: '0',
              holder_count: '100',
              total_supply: '100000',
            },
          },
        }),
      })

      const report = await goPlusService.getFullSecurityReport('0xtoken', null, 'ethereum')

      expect(report.deployerRisk).toBeNull()
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
  })
})
