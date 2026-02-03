/**
 * Context Builder Service
 * Builds rich context about the user's wallet state to inject into LLM prompts
 */

import { useWalletStore } from '../../store/walletStore'
import { blockchainService } from '../blockchain/blockchainService'

class ContextBuilder {
  /**
   * Builds system prompt with current wallet context
   */
  async buildSystemPrompt(): Promise<string> {
    const {
      wallets,
      walletGroups,
      activeWalletId,
      activeNetwork,
      activeEVMNetwork,
      activeSVMNetwork,
    } = useWalletStore.getState()

    const activeWallet = wallets.find((w) => w.id === activeWalletId)

    let contextParts: string[] = []

    // Base system prompt
    contextParts.push(
      'You are SmartWallet AI, an intelligent assistant for managing cryptocurrency wallets.',
    )
    contextParts.push(
      'You can help users manage their wallets, check balances, send tokens, swap tokens, and bridge tokens across chains.',
    )
    contextParts.push('Always be helpful, clear, and prioritize security.')
    contextParts.push(
      'When performing transactions, explain what you\'re doing and warn about any risks.',
    )

    contextParts.push('') // Empty line

    // Add wallet context
    if (activeWallet) {
      contextParts.push('## Current Wallet Context')
      contextParts.push(`Active Wallet: ${activeWallet.name}`)
      contextParts.push(`Address: ${activeWallet.address}`)
      contextParts.push(`Type: ${activeWallet.type} (${activeWallet.type === 'EVM' ? 'Ethereum-compatible' : 'Solana'})`)
      contextParts.push(`Network: ${activeNetwork.name} (Chain ID: ${activeNetwork.chainId})`)

      // Try to get balance
      try {
        const balance = await blockchainService.loadCachedBalance(activeWallet, activeNetwork)
        if (balance) {
          contextParts.push('')
          contextParts.push('### Current Balances')
          contextParts.push(
            `Native Token: ${balance.native} ${activeNetwork.symbol} ($${balance.nativeUSD.toFixed(2)})`,
          )

          if (balance.tokens.length > 0) {
            contextParts.push('Tokens:')
            balance.tokens.slice(0, 10).forEach((token) => {
              contextParts.push(
                `  - ${token.symbol}: ${token.balance} ${token.usdValue ? `($${token.usdValue.toFixed(2)})` : ''}`,
              )
            })
            if (balance.tokens.length > 10) {
              contextParts.push(`  ... and ${balance.tokens.length - 10} more tokens`)
            }
          }

          contextParts.push(`Total Portfolio Value: $${balance.totalUSD.toFixed(2)}`)
          if (balance.total24hChange !== 0) {
            contextParts.push(
              `24h Change: ${balance.total24hChange > 0 ? '+' : ''}${balance.total24hChange.toFixed(2)}%`,
            )
          }
        }
      } catch (error) {
        // Silently fail - balance not critical for context
      }
    } else {
      contextParts.push('## Current Wallet Context')
      contextParts.push('No wallet currently selected. User should select or create a wallet first.')
    }

    contextParts.push('') // Empty line

    // Add available wallets
    if (wallets.length > 0) {
      contextParts.push('## Available Wallets')
      wallets.slice(0, 5).forEach((wallet) => {
        const group = walletGroups.find((g) => g.id === wallet.groupId)
        contextParts.push(
          `- ${wallet.name} (${wallet.type}): ${wallet.address.slice(0, 10)}...${wallet.address.slice(-8)} [Group: ${group?.name || 'Unknown'}]`,
        )
      })
      if (wallets.length > 5) {
        contextParts.push(`... and ${wallets.length - 5} more wallets`)
      }
    }

    contextParts.push('') // Empty line

    // Add wallet groups
    if (walletGroups.length > 0) {
      contextParts.push('## Wallet Groups')
      walletGroups.forEach((group) => {
        contextParts.push(
          `- ${group.name}: ${group.evmWalletCount} EVM wallet(s), ${group.svmWalletCount} Solana wallet(s)`,
        )
      })
    }

    contextParts.push('') // Empty line

    // Add network information
    contextParts.push('## Available Networks')
    contextParts.push(`Active EVM Network: ${activeEVMNetwork.name}`)
    contextParts.push(`Active Solana Network: ${activeSVMNetwork.name}`)
    contextParts.push('Other available networks: Ethereum, Polygon, BSC, Arbitrum, Optimism, Base, Solana')

    contextParts.push('') // Empty line

    // Add capabilities
    contextParts.push('## Your Capabilities')
    contextParts.push('You can perform the following actions using function calling:')
    contextParts.push('')
    contextParts.push('### Wallet Management')
    contextParts.push('- Create new EVM or Solana wallets')
    contextParts.push('- List all wallets and wallet groups')
    contextParts.push('- Switch between wallets')
    contextParts.push('- Check wallet balances')
    contextParts.push('')
    contextParts.push('### Transactions')
    contextParts.push('- Send native tokens (ETH, SOL, BNB, MATIC, etc.)')
    contextParts.push('- Send ERC20/SPL tokens')
    contextParts.push('- Estimate gas fees')
    contextParts.push('- View transaction history')
    contextParts.push('')
    contextParts.push('### Token Operations')
    contextParts.push('- Swap tokens (Jupiter for Solana, 1inch for EVM chains)')
    contextParts.push('- Bridge tokens across EVM chains (using relay.link)')
    contextParts.push('- Get token prices')
    contextParts.push('- Search for tokens')
    contextParts.push('')
    contextParts.push('### Network Management')
    contextParts.push('- Switch between networks')
    contextParts.push('- List available networks')

    contextParts.push('') // Empty line

    // Add safety guidelines
    contextParts.push('## Safety Guidelines')
    contextParts.push('- Always verify addresses before sending tokens')
    contextParts.push('- Warn users about high-risk operations')
    contextParts.push('- Explain gas fees and transaction costs')
    contextParts.push('- For large transfers, suggest testing with a small amount first')
    contextParts.push('- Never share private keys or seed phrases')
    contextParts.push('- Recommend users to double-check swap/bridge quotes')

    contextParts.push('') // Empty line

    // Add response formatting
    contextParts.push('## Response Format')
    contextParts.push('- Be concise but informative')
    contextParts.push('- Use markdown formatting for clarity')
    contextParts.push('- Include transaction links when available')
    contextParts.push('- Show amounts with appropriate precision')
    contextParts.push('- Always include USD values when available')

    return contextParts.join('\n')
  }

  /**
   * Builds a concise context string for limited token scenarios
   */
  async buildConciseContext(): Promise<string> {
    const { wallets, activeWalletId, activeNetwork } = useWalletStore.getState()
    const activeWallet = wallets.find((w) => w.id === activeWalletId)

    if (!activeWallet) {
      return 'No active wallet. Available wallets: ' + wallets.map((w) => w.name).join(', ')
    }

    return `Active: ${activeWallet.name} (${activeWallet.address.slice(0, 8)}...) on ${activeNetwork.name}. ${wallets.length} total wallet(s).`
  }

  /**
   * Gets current wallet summary
   */
  async getWalletSummary(): Promise<string> {
    const { wallets, activeWalletId, activeNetwork } = useWalletStore.getState()
    const activeWallet = wallets.find((w) => w.id === activeWalletId)

    if (!activeWallet) {
      return 'No wallet selected'
    }

    try {
      const balance = await blockchainService.loadCachedBalance(activeWallet, activeNetwork)
      if (balance) {
        return `${activeWallet.name}: ${balance.native} ${activeNetwork.symbol} + ${balance.tokens.length} token(s). Total: $${balance.totalUSD.toFixed(2)}`
      }
    } catch (error) {
      // Ignore
    }

    return `${activeWallet.name} on ${activeNetwork.name}`
  }
}

export const contextBuilder = new ContextBuilder()
