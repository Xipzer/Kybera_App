/**
 * Code by Xipzer
 */

export function formatAddress(address: string, start = 6, end = 4): string {
  if (!address) return ''
  return `${address.slice(0, start)}...${address.slice(-end)}`
}

export function formatBalance(balance: string | number, decimals = 4): string {
  const num = typeof balance === 'string' ? parseFloat(balance) : balance
  return num.toFixed(decimals).replace(/\.?0+$/, '')
}

export function formatCryptoBalance(balance: string | number, maxDecimals: number = 5): string {
  const balanceStr = typeof balance === 'string' ? balance : balance.toString()
  const numBalance = typeof balance === 'string' ? parseFloat(balance) : balance
  
  if (isNaN(numBalance)) return '0'
  
  if (numBalance > 0 && numBalance < 0.00001) {
    return numBalance.toExponential(2)
  }
  
  if (numBalance === 0) return '0'
  
  const decimalIndex = balanceStr.indexOf('.')
  
  if (decimalIndex === -1) {
    return balanceStr
  } else {
    const decimalPart = balanceStr.substring(decimalIndex + 1)
    
    if (decimalPart.length > maxDecimals) {
      return (
        balanceStr.substring(0, decimalIndex) +
        '.' +
        decimalPart.substring(0, maxDecimals)
      ).replace(/\.?0+$/, '')
    } else {
      return balanceStr.replace(/\.?0+$/, '')
    }
  }
}

export function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  }).format(date)
}

export function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  
  if (seconds < 60) {
    return `${seconds}s ago`
  }
  
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) {
    return `${minutes}m ago`
  }
  
  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    return `${hours}h ago`
  }
  
  return `${Math.floor(hours / 24)}d ago`
}

export function formatCompactNumber(num: number | null | undefined, prefix = '$'): string {
  if (num === null || num === undefined) return `${prefix}0.00`
  if (num >= 1_000_000_000) return `${prefix}${(num / 1_000_000_000).toFixed(2)}B`
  if (num >= 1_000_000) return `${prefix}${(num / 1_000_000).toFixed(2)}M`
  if (num >= 1_000) return `${prefix}${(num / 1_000).toFixed(2)}K`
  if (num < 0.01 && num > 0) return prefix ? `${prefix}${num.toExponential(2)}` : num.toExponential(2)
  return `${prefix}${num.toFixed(prefix ? 2 : 4)}`
}

export function formatTokenPrice(price: number | null | undefined): string {
  if (price === null || price === undefined || price === 0) return '$0.00'
  if (price < 0.00000001) return `$${price.toFixed(12)}`
  if (price < 0.000001) return `$${price.toFixed(10)}`
  if (price < 0.0001) return `$${price.toFixed(8)}`
  if (price < 0.01) return `$${price.toFixed(6)}`
  if (price < 1) return `$${price.toFixed(4)}`
  return `$${price.toFixed(2)}`
}