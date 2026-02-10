/**
 * Code by Xipzer
 */

import { describe, it, expect } from 'vitest'
import { SmartWalletDB, db } from '../services/database'

describe('SmartWalletDB', () => {
  it('is an instance of SmartWalletDB', () => {
    expect(db).toBeInstanceOf(SmartWalletDB)
  })

  it('has all v1 tables', () => {
    const v1Tables = [
      'wallets',
      'walletGroups',
      'conversations',
      'messages',
      'settings',
      'auth',
      'transactions',
      'tokenBalances',
      'priceData',
      'priceHistory',
      'walletBalances',
      'tokenMetadata',
      'discoveredTokens',
      'customNetworks',
      'networkVisibility',
      'aiActionHistory',
    ]

    for (const table of v1Tables) {
      expect(db.table(table)).toBeDefined()
    }
  })

  it('has v2 tables (alerts, notifications)', () => {
    expect(db.table('alerts')).toBeDefined()
    expect(db.table('notifications')).toBeDefined()
  })

  it('has v3 tables (tradeRecords, portfolioSnapshots)', () => {
    expect(db.table('tradeRecords')).toBeDefined()
    expect(db.table('portfolioSnapshots')).toBeDefined()
  })

  it('has v4 tables (walletActivities)', () => {
    expect(db.table('walletActivities')).toBeDefined()
  })

  it('has correct database name', () => {
    expect(db.name).toBe('SmartWalletDB')
  })

  it('has exactly 4 versions defined', () => {
    expect(db.verno).toBe(4)
  })

  it('exposes typed table properties', () => {
    expect(db.alerts).toBeDefined()
    expect(db.notifications).toBeDefined()
    expect(db.tradeRecords).toBeDefined()
    expect(db.portfolioSnapshots).toBeDefined()
    expect(db.walletActivities).toBeDefined()
  })
})
