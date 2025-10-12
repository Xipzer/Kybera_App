/**
 * Direct RPC service for EVM token operations
 * This avoids the ethers Contract class which has conflicts with alchemy-sdk
 */
export class EVMRpcService {
  private rpcUrl: string

  constructor(rpcUrl: string) {
    this.rpcUrl = rpcUrl
  }

  /**
   * Call an ERC20 method using direct JSON-RPC
   */
  private async callContract(contractAddress: string, data: string): Promise<string> {
    const response = await fetch(this.rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [
          {
            to: contractAddress,
            data: data,
          },
          'latest',
        ],
        id: 1,
      }),
    })

    const result = await response.json()
    if (result.error) {
      throw new Error(result.error.message)
    }

    return result.result
  }

  /**
   * Get ERC20 token balance for an address
   */
  async getTokenBalance(tokenAddress: string, walletAddress: string): Promise<string> {
    // balanceOf(address) function signature: 0x70a08231
    // Remove 0x prefix from wallet address and pad to 32 bytes
    const data = '0x70a08231' + walletAddress.substring(2).padStart(64, '0')

    try {
      const result = await this.callContract(tokenAddress, data)
      // Convert hex to decimal string
      return BigInt(result).toString()
    } catch (error) {
      console.error(`Failed to get balance for token ${tokenAddress}:`, error)
      throw error
    }
  }

  /**
   * Get ERC20 token decimals
   */
  async getTokenDecimals(tokenAddress: string): Promise<number> {
    // decimals() function signature: 0x313ce567
    const data = '0x313ce567'

    try {
      const result = await this.callContract(tokenAddress, data)
      return parseInt(result, 16)
    } catch (error) {
      // Default to 18 decimals if the call fails
      return 18
    }
  }

  /**
   * Get ERC20 token symbol
   */
  async getTokenSymbol(tokenAddress: string): Promise<string> {
    // symbol() function signature: 0x95d89b41
    const data = '0x95d89b41'

    try {
      const result = await this.callContract(tokenAddress, data)
      // Decode the string from hex
      if (result === '0x' || result === '0x0') {
        return 'UNKNOWN'
      }

      // Skip the first 64 characters (32 bytes) which contain the offset
      // Then the next 64 characters contain the length
      const withoutPrefix = result.substring(2)
      if (withoutPrefix.length < 128) {
        return 'UNKNOWN'
      }

      const lengthHex = withoutPrefix.substring(64, 128)
      const length = parseInt(lengthHex, 16)

      if (length === 0 || length > 32) {
        return 'UNKNOWN'
      }

      // Get the actual string data
      const stringHex = withoutPrefix.substring(128, 128 + length * 2)
      let symbol = ''
      for (let i = 0; i < stringHex.length; i += 2) {
        const charCode = parseInt(stringHex.substr(i, 2), 16)
        if (charCode === 0) break
        symbol += String.fromCharCode(charCode)
      }

      return symbol || 'UNKNOWN'
    } catch (error) {
      return 'UNKNOWN'
    }
  }

  /**
   * Get ERC20 token name
   */
  async getTokenName(tokenAddress: string): Promise<string> {
    // name() function signature: 0x06fdde03
    const data = '0x06fdde03'

    try {
      const result = await this.callContract(tokenAddress, data)
      // Decode the string from hex (same as symbol)
      if (result === '0x' || result === '0x0') {
        return 'Unknown Token'
      }

      const withoutPrefix = result.substring(2)
      if (withoutPrefix.length < 128) {
        return 'Unknown Token'
      }

      const lengthHex = withoutPrefix.substring(64, 128)
      const length = parseInt(lengthHex, 16)

      if (length === 0 || length > 64) {
        return 'Unknown Token'
      }

      const stringHex = withoutPrefix.substring(128, 128 + length * 2)
      let name = ''
      for (let i = 0; i < stringHex.length; i += 2) {
        const charCode = parseInt(stringHex.substr(i, 2), 16)
        if (charCode === 0) break
        name += String.fromCharCode(charCode)
      }

      return name || 'Unknown Token'
    } catch (error) {
      return 'Unknown Token'
    }
  }

  /**
   * Check if address is a contract
   */
  async isContract(address: string): Promise<boolean> {
    const response = await fetch(this.rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getCode',
        params: [address, 'latest'],
        id: 1,
      }),
    })

    const result = await response.json()
    return result.result && result.result !== '0x' && result.result !== '0x0'
  }
}
