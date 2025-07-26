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
  
  // For very small numbers, use exponential notation
  if (numBalance > 0 && numBalance < 0.00001) {
    return numBalance.toExponential(2)
  }
  
  // For zero, just return 0
  if (numBalance === 0) return '0'
  
  // Find decimal point
  const decimalIndex = balanceStr.indexOf('.')
  
  if (decimalIndex === -1) {
    // No decimal point, return as is
    return balanceStr
  } else {
    // Has decimal point
    const integerPart = balanceStr.substring(0, decimalIndex)
    const decimalPart = balanceStr.substring(decimalIndex + 1)
    
    if (decimalPart.length > maxDecimals) {
      // Truncate to maxDecimals, then remove trailing zeros
      const truncated = integerPart + '.' + decimalPart.substring(0, maxDecimals)
      return truncated.replace(/\.?0+$/, '')
    } else {
      // Already within limit, just remove trailing zeros
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