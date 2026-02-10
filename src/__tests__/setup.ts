/**
 * Code by Xipzer
 */

import { vi } from 'vitest'

vi.stubGlobal('crypto', {
  randomUUID: () => `test-${Math.random().toString(36).slice(2, 11)}`,
  getRandomValues: (arr: Uint8Array) => {
    for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256)
    return arr
  },
})

vi.stubGlobal('fetch', vi.fn())

vi.stubGlobal('Notification', {
  permission: 'default',
  requestPermission: vi.fn().mockResolvedValue('denied'),
})

vi.stubGlobal('console', {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
})
