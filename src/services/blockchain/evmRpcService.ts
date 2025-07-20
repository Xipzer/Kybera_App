/**
 * Code by Xipzer
 */

export class EVMRpcService {
  private rpcUrl: string

  constructor(rpcUrl: string) {
    this.rpcUrl = rpcUrl
  }

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

  async getTokenBalance(tokenAddress: string, walletAddress: string): Promise<string> {
    try {
      return BigInt(
        await this.callContract(
          tokenAddress,
          '0x70a08231' + walletAddress.substring(2).padStart(64, '0'),
        ),
      ).toString()
    } catch (error) {
      console.error(`Failed to get balance for token ${tokenAddress}:`, error)
      throw error
    }
  }

  async getTokenDecimals(tokenAddress: string): Promise<number> {
    try {
      return parseInt(await this.callContract(tokenAddress, '0x313ce567'), 16)
    } catch (error) {
      return 18
    }
  }

  async getTokenSymbol(tokenAddress: string): Promise<string> {
    try {
      const result = await this.callContract(tokenAddress, '0x95d89b41')
      if (result === '0x' || result === '0x0') {
        return 'UNKNOWN'
      }

      const withoutPrefix = result.substring(2)
      if (withoutPrefix.length < 128) {
        return 'UNKNOWN'
      }

      const length = parseInt(withoutPrefix.substring(64, 128), 16)

      if (length === 0 || length > 32) {
        return 'UNKNOWN'
      }

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

  async getTokenName(tokenAddress: string): Promise<string> {
    try {
      const result = await this.callContract(tokenAddress, '0x06fdde03')
      if (result === '0x' || result === '0x0') {
        return 'Unknown Token'
      }

      const withoutPrefix = result.substring(2)
      if (withoutPrefix.length < 128) {
        return 'Unknown Token'
      }

      const length = parseInt(withoutPrefix.substring(64, 128), 16)

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