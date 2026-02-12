/**
 * Code by Xipzer
 */

import { useWalletStore } from '../store/walletStore'
import { useSettingsStore } from '../store/settingsStore'
import { useNotificationStore } from '../store/notificationStore'
import { useWatchlistStore } from '../store/watchlistStore'
import { useX402Store } from '../store/x402Store'
import { blockchainService } from './blockchain/blockchainService'
import { swapService } from './api/swapService'
import { goPlusService } from './research/goPlusService'
import { polymarketService } from './research/polymarketService'
import { portfolioService } from './portfolioService'
import { x402Service } from './x402Service'
import { YIELD_TOOL_DEFINITIONS, yieldActionHandlers } from './defi/yieldActions'
import { EVM_NETWORKS, SVM_NETWORKS, getNetworksByType } from '../utils/networks'
import { PendingAction, RiskLevel, ActionCategory } from '../types/aiActions'
import { ChainType } from '../types'
import type { ResearchNetwork } from '../types/research'
import type { AlertConfig } from '../types/notifications'

export interface ToolDefinition {
  name: string
  description: string
  parameters: {
    type: 'object'
    properties: Record<string, { type: string; description: string; enum?: string[] }>
    required: string[]
  }
  category: ActionCategory
  riskLevel: RiskLevel
  requiresConfirmation: boolean
}

export interface ActionResult {
  success: boolean
  message: string
  data?: Record<string, unknown>
  error?: string
}

type ActionHandler = (params: Record<string, unknown>) => Promise<ActionResult>

const actionHandlers: Record<string, ActionHandler> = {
  create_wallet_group: async (params) => {
    const { name, evmCount = 0, svmCount = 0, walletNames } = params as {
      name: string
      evmCount?: number
      svmCount?: number
      walletNames?: string[]
    }

    const { password, createWalletGroup, addWalletsToGroup } = useWalletStore.getState()
    if (!password) return { success: false, message: 'Wallet is locked', error: 'LOCKED' }

    try {
      const group = await createWalletGroup(name, password)

      const specs: { name: string; type: ChainType }[] = []
      let walletIndex = 0

      for (let i = 0; i < evmCount; i++) {
        specs.push({
          name: walletNames?.[walletIndex++] || `${name} - EVM #${i + 1}`,
          type: 'EVM',
        })
      }
      for (let i = 0; i < svmCount; i++) {
        specs.push({
          name: walletNames?.[walletIndex++] || `${name} - SVM #${i + 1}`,
          type: 'SVM',
        })
      }

      if (specs.length > 0) await addWalletsToGroup(group.id, specs)

      return {
        success: true,
        message: `Created wallet group "${name}" with ${evmCount} EVM and ${svmCount} SVM wallets`,
        data: { groupId: group.id, groupName: group.name, walletsCreated: specs.length },
      }
    } catch (error) {
      return { success: false, message: 'Failed to create wallet group', error: String(error) }
    }
  },

  add_wallets_to_group: async (params) => {
    const { groupId, wallets } = params as {
      groupId: string
      wallets: { name: string; type: 'EVM' | 'SVM' }[]
    }

    const { password, addWalletsToGroup, walletGroups } = useWalletStore.getState()
    if (!password) return { success: false, message: 'Wallet is locked', error: 'LOCKED' }

    const group = walletGroups.find((g) => g.id === groupId || g.name.toLowerCase() === groupId.toLowerCase())
    if (!group) return { success: false, message: `Group "${groupId}" not found`, error: 'NOT_FOUND' }

    try {
      const newWallets = await addWalletsToGroup(group.id, wallets)
      return {
        success: true,
        message: `Added ${newWallets.length} wallets to "${group.name}"`,
        data: { wallets: newWallets.map((w) => ({ id: w.id, name: w.name, address: w.address, type: w.type })) },
      }
    } catch (error) {
      return { success: false, message: 'Failed to add wallets', error: String(error) }
    }
  },

  rename_wallet: async (params) => {
    const { walletId, newName } = params as { walletId: string; newName: string }
    const { wallets, updateWallet } = useWalletStore.getState()

    const wallet = wallets.find(
      (w) => w.id === walletId || w.name.toLowerCase() === walletId.toLowerCase() || w.address.toLowerCase() === walletId.toLowerCase()
    )
    if (!wallet) return { success: false, message: `Wallet "${walletId}" not found`, error: 'NOT_FOUND' }

    try {
      await updateWallet(wallet.id, { name: newName })
      return { success: true, message: `Renamed wallet to "${newName}"`, data: { walletId: wallet.id, oldName: wallet.name, newName } }
    } catch (error) {
      return { success: false, message: 'Failed to rename wallet', error: String(error) }
    }
  },

  rename_wallet_group: async (params) => {
    const { groupId, newName } = params as { groupId: string; newName: string }
    const { walletGroups, updateWalletGroup } = useWalletStore.getState()

    const group = walletGroups.find((g) => g.id === groupId || g.name.toLowerCase() === groupId.toLowerCase())
    if (!group) return { success: false, message: `Group "${groupId}" not found`, error: 'NOT_FOUND' }

    try {
      await updateWalletGroup(group.id, { name: newName })
      return { success: true, message: `Renamed group to "${newName}"`, data: { groupId: group.id, oldName: group.name, newName } }
    } catch (error) {
      return { success: false, message: 'Failed to rename group', error: String(error) }
    }
  },

  delete_wallet: async (params) => {
    const { walletId } = params as { walletId: string }
    const { wallets, removeWallet } = useWalletStore.getState()

    const wallet = wallets.find(
      (w) => w.id === walletId || w.name.toLowerCase() === walletId.toLowerCase() || w.address.toLowerCase() === walletId.toLowerCase()
    )
    if (!wallet) return { success: false, message: `Wallet "${walletId}" not found`, error: 'NOT_FOUND' }

    try {
      await removeWallet(wallet.id)
      return { success: true, message: `Deleted wallet "${wallet.name}"`, data: { walletId: wallet.id, walletName: wallet.name } }
    } catch (error) {
      return { success: false, message: 'Failed to delete wallet', error: String(error) }
    }
  },

  delete_wallet_group: async (params) => {
    const { groupId } = params as { groupId: string }
    const { walletGroups, removeWalletGroup, wallets } = useWalletStore.getState()

    const group = walletGroups.find((g) => g.id === groupId || g.name.toLowerCase() === groupId.toLowerCase())
    if (!group) return { success: false, message: `Group "${groupId}" not found`, error: 'NOT_FOUND' }

    const walletsInGroup = wallets.filter((w) => w.groupId === group.id)

    try {
      await removeWalletGroup(group.id)
      return {
        success: true,
        message: `Deleted group "${group.name}" and ${walletsInGroup.length} wallets`,
        data: { groupId: group.id, groupName: group.name, walletsDeleted: walletsInGroup.length },
      }
    } catch (error) {
      return { success: false, message: 'Failed to delete group', error: String(error) }
    }
  },

  list_wallets: async () => {
    const { wallets, walletGroups } = useWalletStore.getState()

    const grouped = walletGroups.map((group) => ({
      groupId: group.id,
      groupName: group.name,
      wallets: wallets
        .filter((w) => w.groupId === group.id)
        .map((w) => ({ id: w.id, name: w.name, address: w.address, type: w.type })),
    }))

    return {
      success: true,
      message: `Found ${wallets.length} wallets in ${walletGroups.length} groups`,
      data: { groups: grouped, totalWallets: wallets.length, totalGroups: walletGroups.length },
    }
  },

  list_networks: async () => {
    const evmNetworks = EVM_NETWORKS.map((n) => ({ id: n.id, name: n.name, symbol: n.symbol, chainId: n.chainId }))
    const svmNetworks = SVM_NETWORKS.map((n) => ({ id: n.id, name: n.name, symbol: n.symbol }))

    return {
      success: true,
      message: `${evmNetworks.length} EVM networks and ${svmNetworks.length} SVM networks available`,
      data: { evm: evmNetworks, svm: svmNetworks },
    }
  },

  get_balance: async (params) => {
    const { walletId, networkId } = params as { walletId?: string; networkId?: string }
    const { wallets, activeWalletId } = useWalletStore.getState()

    const wallet = walletId
      ? wallets.find((w) => w.id === walletId || w.name.toLowerCase() === walletId.toLowerCase() || w.address.toLowerCase() === walletId.toLowerCase())
      : wallets.find((w) => w.id === activeWalletId)

    if (!wallet) return { success: false, message: 'Wallet not found', error: 'NOT_FOUND' }

    try {
      const compatibleNetworks = getNetworksByType(wallet.type)
      const targetNetworks = networkId
        ? compatibleNetworks.filter((n) => n.id === networkId || n.name.toLowerCase() === networkId.toLowerCase())
        : compatibleNetworks

      if (targetNetworks.length === 0) {
        return { success: false, message: `Network "${networkId}" not found or incompatible with ${wallet.type}`, error: 'NOT_FOUND' }
      }

      const balances = await blockchainService.getMultiWalletBalances([wallet], targetNetworks)
      let totalUSD = 0
      let totalNativeUSD = 0
      let totalNative = 0
      const allTokens: { symbol: string; balance: string; network: string }[] = []

      for (const bal of balances) {
        totalUSD += bal.totalUSD
        totalNativeUSD += bal.nativeUSD
        totalNative += parseFloat(bal.native) || 0
        for (const t of bal.tokens) {
          if (parseFloat(t.balance) > 0) {
            allTokens.push({ symbol: t.symbol, balance: t.balance, network: bal.networkId })
          }
        }
      }

      const primarySymbol = targetNetworks[0].symbol
      const networkLabel = targetNetworks.length === 1 ? targetNetworks[0].name : 'all networks'

      return {
        success: true,
        message: `Balance for ${wallet.name} on ${networkLabel}`,
        data: {
          wallet: wallet.name,
          network: networkLabel,
          native: totalNative.toFixed(6),
          nativeSymbol: primarySymbol,
          nativeUSD: totalNativeUSD,
          tokens: allTokens,
          totalUSD,
        },
      }
    } catch (error) {
      return { success: false, message: 'Failed to fetch balance', error: String(error) }
    }
  },

  switch_wallet: async (params) => {
    const { walletId } = params as { walletId: string }
    const { wallets, setActiveWallet } = useWalletStore.getState()

    const wallet = wallets.find(
      (w) => w.id === walletId || w.name.toLowerCase() === walletId.toLowerCase() || w.address.toLowerCase() === walletId.toLowerCase()
    )
    if (!wallet) return { success: false, message: `Wallet "${walletId}" not found`, error: 'NOT_FOUND' }

    setActiveWallet(wallet.id)
    return { success: true, message: `Switched to wallet "${wallet.name}"`, data: { walletId: wallet.id, walletName: wallet.name, address: wallet.address } }
  },

  switch_network: async (params) => {
    const { networkId } = params as { networkId: string }
    const { setActiveNetwork } = useWalletStore.getState()

    const allNetworks = [...EVM_NETWORKS, ...SVM_NETWORKS]
    const network = allNetworks.find((n) => n.id === networkId || n.name.toLowerCase() === networkId.toLowerCase())

    if (!network) return { success: false, message: `Network "${networkId}" not found`, error: 'NOT_FOUND' }

    await setActiveNetwork(network)
    return { success: true, message: `Switched to ${network.name}`, data: { networkId: network.id, networkName: network.name } }
  },

  get_swap_quote: async (params) => {
    const { fromToken, toToken, amount, networkId } = params as {
      fromToken: string
      toToken: string
      amount: string
      networkId?: string
    }

    const { wallets, activeWalletId, activeNetwork } = useWalletStore.getState()
    const wallet = wallets.find((w) => w.id === activeWalletId)
    if (!wallet) return { success: false, message: 'No active wallet', error: 'NO_WALLET' }

    const networks = getNetworksByType(wallet.type)
    const network = networkId ? networks.find((n) => n.id === networkId) : activeNetwork

    if (!network) return { success: false, message: 'Network not found', error: 'NOT_FOUND' }

    try {
      const quote = await swapService.getSwapQuote(
        wallet.type,
        network.chainId || network.id,
        fromToken,
        toToken,
        amount,
        1.0,
        wallet.address
      )

      return {
        success: true,
        message: `Quote: ${amount} ${fromToken} → ${quote.toAmount} ${toToken}`,
        data: {
          fromToken,
          toToken,
          fromAmount: amount,
          toAmount: quote.toAmount,
          toAmountMin: quote.toAmountMin,
          priceImpact: quote.priceImpact,
          provider: quote.provider,
          route: quote.route,
        },
      }
    } catch (error) {
      return { success: false, message: 'Failed to get swap quote', error: String(error) }
    }
  },

  get_settings: async () => {
    const settings = useSettingsStore.getState()
    return {
      success: true,
      message: 'Current settings',
      data: {
        hasAlchemyKey: !!settings.alchemyApiKey,
        hasHeliusKey: !!settings.heliusApiKey,
        hasCoinGeckoKey: !!settings.coinGeckoApiKey,
        hasOpenClawUrl: !!settings.openClawGatewayUrl,
        openClawAutoConnect: settings.openClawAutoConnect,
      },
    }
  },

  get_token_security: async (params) => {
    const { contractAddress, network } = params as { contractAddress: string; network: string }

    try {
      const result = await goPlusService.getTokenSecurity(contractAddress, network as ResearchNetwork)
      if (!result) return { success: false, message: `No security data found for ${contractAddress} on ${network}`, error: 'NO_DATA' }
      return {
        success: true,
        message: `GoPlus security report for ${contractAddress} on ${network} — risk score: ${result.riskScore}/100`,
        data: {
          contractAddress,
          network,
          riskScore: result.riskScore,
          isHoneypot: result.isHoneypot,
          isOpenSource: result.isOpenSource,
          isProxy: result.isProxy,
          isMintable: result.isMintable,
          holderCount: result.holderCount,
          riskFlags: result.riskFlags,
        },
      }
    } catch (error) {
      return { success: false, message: 'Failed to get token security report', error: String(error) }
    }
  },

  check_malicious_address: async (params) => {
    const { address, network } = params as { address: string; network: string }

    try {
      const result = await goPlusService.checkMaliciousAddress(address, network as ResearchNetwork)
      if (!result) return { success: false, message: `Could not check address ${address} on ${network}`, error: 'NO_DATA' }
      return {
        success: true,
        message: result.isMalicious
          ? `Address ${address} is flagged as malicious (${result.maliciousType || 'unknown type'})`
          : `Address ${address} is not flagged as malicious`,
        data: {
          address,
          network,
          isMalicious: result.isMalicious,
          maliciousType: result.maliciousType,
          tag: result.tag,
        },
      }
    } catch (error) {
      return { success: false, message: 'Failed to check malicious address', error: String(error) }
    }
  },

  create_alert: async (params) => {
    const { alertType, config } = params as { alertType: string; config: Record<string, unknown> }

    try {
      const alertConfig = { ...config, type: alertType } as unknown as AlertConfig
      const alertId = useNotificationStore.getState().addAlert(alertConfig)
      return {
        success: true,
        message: `Created ${alertType} alert`,
        data: { alertId, alertType },
      }
    } catch (error) {
      return { success: false, message: 'Failed to create alert', error: String(error) }
    }
  },

  list_alerts: async () => {
    const { alerts } = useNotificationStore.getState()
    return {
      success: true,
      message: `Found ${alerts.length} configured alerts`,
      data: {
        alerts: alerts.map((a) => ({
          id: a.id,
          type: a.config.type,
          enabled: a.enabled,
          triggerCount: a.triggerCount,
          lastTriggeredAt: a.lastTriggeredAt,
          createdAt: a.createdAt,
        })),
        total: alerts.length,
      },
    }
  },

  delete_alert: async (params) => {
    const { alertId } = params as { alertId: string }
    const { alerts, removeAlert } = useNotificationStore.getState()

    if (!alerts.find((a) => a.id === alertId)) {
      return { success: false, message: `Alert "${alertId}" not found`, error: 'NOT_FOUND' }
    }

    try {
      removeAlert(alertId)
      return { success: true, message: `Deleted alert ${alertId}`, data: { alertId } }
    } catch (error) {
      return { success: false, message: 'Failed to delete alert', error: String(error) }
    }
  },

  search_prediction_markets: async (params) => {
    const { query, limit = 10 } = params as { query: string; limit?: number }

    try {
      const markets = await polymarketService.searchMarkets(query, limit)
      return {
        success: true,
        message: `Found ${markets.length} prediction markets for "${query}"`,
        data: {
          markets: markets.map((m) => ({
            id: m.id,
            question: m.question,
            outcomes: m.outcomes.map((o) => ({ label: o.label, probability: o.probability })),
            volume: m.volume,
            endDate: m.endDate,
            active: m.active,
            sourceUrl: m.sourceUrl,
          })),
          count: markets.length,
        },
      }
    } catch (error) {
      return { success: false, message: 'Failed to search prediction markets', error: String(error) }
    }
  },

  get_prediction_market: async (params) => {
    const { marketId } = params as { marketId: string }

    try {
      const market = await polymarketService.getMarket(marketId)
      if (!market) return { success: false, message: `Market "${marketId}" not found`, error: 'NOT_FOUND' }
      return {
        success: true,
        message: `Market: ${market.question}`,
        data: {
          id: market.id,
          question: market.question,
          description: market.description,
          outcomes: market.outcomes.map((o) => ({ label: o.label, price: o.price, probability: o.probability })),
          volume: market.volume,
          liquidity: market.liquidity,
          endDate: market.endDate,
          active: market.active,
          closed: market.closed,
          resolved: market.resolved,
          tags: market.tags,
          sourceUrl: market.sourceUrl,
        },
      }
    } catch (error) {
      return { success: false, message: 'Failed to get prediction market', error: String(error) }
    }
  },

  get_crypto_sentiment: async () => {
    try {
      const sentiment = await polymarketService.getSentimentForTopic('crypto')
      return {
        success: true,
        message: sentiment.sentimentSummary,
        data: {
          overallSentiment: sentiment.overallSentiment,
          summary: sentiment.sentimentSummary,
          relevantMarkets: sentiment.relevantMarkets.map((m) => ({
            id: m.id,
            question: m.question,
            outcomes: m.outcomes.map((o) => ({ label: o.label, probability: o.probability })),
            volume: m.volume,
          })),
          marketCount: sentiment.relevantMarkets.length,
          dataTimestamp: sentiment.dataTimestamp,
        },
      }
    } catch (error) {
      return { success: false, message: 'Failed to get crypto sentiment', error: String(error) }
    }
  },

  get_portfolio_pnl: async (params) => {
    const { walletAddress, timeRange = '24h' } = params as { walletAddress?: string; timeRange?: string }

    const address = walletAddress || useWalletStore.getState().wallets.find((w) => w.id === useWalletStore.getState().activeWalletId)?.address
    if (!address) return { success: false, message: 'No wallet address provided or active', error: 'NO_WALLET' }

    try {
      const summary = await portfolioService.getPortfolioSummary(address)
      return {
        success: true,
        message: `Portfolio P/L for ${address.slice(0, 8)}...${address.slice(-6)}: $${summary.totalPnl.toFixed(2)} (${summary.totalPnlPercent.toFixed(2)}%)`,
        data: {
          walletAddress: address,
          timeRange,
          totalValueUsd: summary.totalValueUsd,
          totalPnl: summary.totalPnl,
          totalPnlPercent: summary.totalPnlPercent,
          change1h: summary.change1h,
          change24h: summary.change24h,
          change7d: summary.change7d,
          change30d: summary.change30d,
          bestPerformer: summary.bestPerformer,
          worstPerformer: summary.worstPerformer,
          topHoldings: summary.topHoldings,
        },
      }
    } catch (error) {
      return { success: false, message: 'Failed to get portfolio P/L', error: String(error) }
    }
  },

  get_trade_history: async (params) => {
    const { walletAddress, limit = 20 } = params as { walletAddress?: string; limit?: number }

    const address = walletAddress || useWalletStore.getState().wallets.find((w) => w.id === useWalletStore.getState().activeWalletId)?.address
    if (!address) return { success: false, message: 'No wallet address provided or active', error: 'NO_WALLET' }

    try {
      const trades = await portfolioService.getTradeHistory(address, { limit })
      return {
        success: true,
        message: `Found ${trades.length} trades for ${address.slice(0, 8)}...${address.slice(-6)}`,
        data: {
          walletAddress: address,
          trades: trades.map((t) => ({
            id: t.id,
            tokenInSymbol: t.tokenInSymbol,
            tokenOutSymbol: t.tokenOutSymbol,
            tokenInAmount: t.tokenInAmount,
            tokenOutAmount: t.tokenOutAmount,
            totalValueUsd: t.totalValueUsd,
            networkId: t.networkId,
            timestamp: t.timestamp,
            txHash: t.txHash,
          })),
          count: trades.length,
        },
      }
    } catch (error) {
      return { success: false, message: 'Failed to get trade history', error: String(error) }
    }
  },

  add_watched_wallet: async (params) => {
    const { address, label, networks = ['ethereum', 'base'] } = params as {
      address: string
      label?: string
      networks?: string[]
    }

    try {
      const watchId = useWatchlistStore.getState().addWallet({
        address,
        label: label || `Watched ${address.slice(0, 8)}`,
        tags: ['custom'],
        networks,
        trackSwaps: true,
        trackTransfers: true,
        trackApprovals: false,
        minValueUsd: 0,
      })
      return {
        success: true,
        message: `Added ${address.slice(0, 8)}...${address.slice(-6)} to watchlist`,
        data: { watchId, address, label: label || `Watched ${address.slice(0, 8)}`, networks },
      }
    } catch (error) {
      return { success: false, message: 'Failed to add watched wallet', error: String(error) }
    }
  },

  remove_watched_wallet: async (params) => {
    const { watchId } = params as { watchId: string }
    const { watchedWallets, removeWallet } = useWatchlistStore.getState()

    if (!watchedWallets.find((w) => w.id === watchId)) {
      return { success: false, message: `Watched wallet "${watchId}" not found`, error: 'NOT_FOUND' }
    }

    try {
      removeWallet(watchId)
      return { success: true, message: `Removed watched wallet ${watchId}`, data: { watchId } }
    } catch (error) {
      return { success: false, message: 'Failed to remove watched wallet', error: String(error) }
    }
  },

  list_watched_wallets: async () => {
    const { watchedWallets } = useWatchlistStore.getState()
    return {
      success: true,
      message: `Found ${watchedWallets.length} watched wallets`,
      data: {
        wallets: watchedWallets.map((w) => ({
          id: w.id,
          address: w.address,
          label: w.label,
          networks: w.networks,
          addedAt: w.addedAt,
          lastActivityAt: w.lastActivityAt,
          lastCheckedAt: w.lastCheckedAt,
        })),
        total: watchedWallets.length,
      },
    }
  },

  get_wallet_activity: async (params) => {
    const { watchId, limit = 20 } = params as { watchId: string; limit?: number }
    const { watchedWallets } = useWatchlistStore.getState()

    const wallet = watchedWallets.find((w) => w.id === watchId)
    if (!wallet) return { success: false, message: `Watched wallet "${watchId}" not found`, error: 'NOT_FOUND' }

    try {
      const activities = useWatchlistStore.getState().getActivitiesForWallet(watchId, limit)
      return {
        success: true,
        message: `Found ${activities.length} activities for ${wallet.label}`,
        data: {
          watchId,
          walletLabel: wallet.label,
          activities: activities.map((a) => ({
            id: a.id,
            activityType: a.activityType,
            networkId: a.networkId,
            txHash: a.txHash,
            timestamp: a.timestamp,
            tokenInSymbol: a.tokenInSymbol,
            tokenOutSymbol: a.tokenOutSymbol,
            estimatedValueUsd: a.estimatedValueUsd,
          })),
          count: activities.length,
        },
      }
    } catch (error) {
      return { success: false, message: 'Failed to get wallet activity', error: String(error) }
    }
  },

  get_x402_status: async () => {
    try {
      const spending = x402Service.getDailySpending()
      const { config } = useX402Store.getState()
      return {
        success: true,
        message: `x402 ${config.enabled ? 'enabled' : 'disabled'} — $${spending.spent.toFixed(2)}/$${spending.budget.toFixed(2)} daily budget used`,
        data: {
          enabled: config.enabled,
          dailySpent: spending.spent,
          dailyBudget: spending.budget,
          dailyRemaining: spending.remaining,
          maxPerRequest: config.maxPerRequestUsd,
          paymentWalletId: config.paymentWalletId,
          approvedDomains: config.approvedDomains,
          blockedDomains: config.blockedDomains,
          totalLifetimeSpent: config.totalLifetimeSpentUsd,
          totalPaymentCount: config.totalPaymentCount,
        },
      }
    } catch (error) {
      return { success: false, message: 'Failed to get x402 status', error: String(error) }
    }
  },

  list_x402_payments: async () => {
    try {
      const payments = x402Service.getPaymentHistory(50)
      return {
        success: true,
        message: `Found ${payments.length} x402 payment records`,
        data: {
          payments: payments.map((p) => ({
            id: p.id,
            domain: p.domain,
            description: p.description,
            amountUsd: p.amountUsd,
            tokenSymbol: p.tokenSymbol,
            network: p.network,
            status: p.status,
            timestamp: p.timestamp,
          })),
          count: payments.length,
        },
      }
    } catch (error) {
      return { success: false, message: 'Failed to list x402 payments', error: String(error) }
    }
  },

  ...yieldActionHandlers,
}

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: 'create_wallet_group',
    description: 'Create a new wallet group with optional pre-generated wallets. A wallet group shares a single recovery phrase.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Name for the wallet group' },
        evmCount: { type: 'number', description: 'Number of EVM wallets to create (Ethereum, Base, Polygon, etc.)' },
        svmCount: { type: 'number', description: 'Number of SVM wallets to create (Solana)' },
        walletNames: { type: 'array', description: 'Custom names for each wallet (in order: EVM wallets first, then SVM)' },
      },
      required: ['name'],
    },
    category: 'wallet_management',
    riskLevel: 'medium',
    requiresConfirmation: true,
  },
  {
    name: 'add_wallets_to_group',
    description: 'Add new wallets to an existing wallet group',
    parameters: {
      type: 'object',
      properties: {
        groupId: { type: 'string', description: 'ID or name of the wallet group' },
        wallets: { type: 'array', description: 'Array of wallets to add, each with name and type (EVM or SVM)' },
      },
      required: ['groupId', 'wallets'],
    },
    category: 'wallet_management',
    riskLevel: 'medium',
    requiresConfirmation: true,
  },
  {
    name: 'rename_wallet',
    description: 'Rename a wallet',
    parameters: {
      type: 'object',
      properties: {
        walletId: { type: 'string', description: 'ID, name, or address of the wallet to rename' },
        newName: { type: 'string', description: 'New name for the wallet' },
      },
      required: ['walletId', 'newName'],
    },
    category: 'wallet_management',
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    name: 'rename_wallet_group',
    description: 'Rename a wallet group',
    parameters: {
      type: 'object',
      properties: {
        groupId: { type: 'string', description: 'ID or name of the group to rename' },
        newName: { type: 'string', description: 'New name for the group' },
      },
      required: ['groupId', 'newName'],
    },
    category: 'wallet_management',
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    name: 'delete_wallet',
    description: 'Delete a wallet permanently',
    parameters: {
      type: 'object',
      properties: {
        walletId: { type: 'string', description: 'ID, name, or address of the wallet to delete' },
      },
      required: ['walletId'],
    },
    category: 'wallet_management',
    riskLevel: 'high',
    requiresConfirmation: true,
  },
  {
    name: 'delete_wallet_group',
    description: 'Delete a wallet group and all its wallets permanently',
    parameters: {
      type: 'object',
      properties: {
        groupId: { type: 'string', description: 'ID or name of the group to delete' },
      },
      required: ['groupId'],
    },
    category: 'wallet_management',
    riskLevel: 'critical',
    requiresConfirmation: true,
  },
  {
    name: 'list_wallets',
    description: 'List all wallets and wallet groups',
    parameters: { type: 'object', properties: {}, required: [] },
    category: 'query',
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    name: 'list_networks',
    description: 'List all available blockchain networks',
    parameters: { type: 'object', properties: {}, required: [] },
    category: 'query',
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    name: 'get_balance',
    description: 'Get the balance of a wallet on a specific network',
    parameters: {
      type: 'object',
      properties: {
        walletId: { type: 'string', description: 'ID, name, or address of the wallet (uses active wallet if not specified)' },
        networkId: { type: 'string', description: 'Network ID or name (uses active network if not specified)' },
      },
      required: [],
    },
    category: 'query',
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    name: 'switch_wallet',
    description: 'Switch to a different wallet',
    parameters: {
      type: 'object',
      properties: {
        walletId: { type: 'string', description: 'ID, name, or address of the wallet to switch to' },
      },
      required: ['walletId'],
    },
    category: 'wallet_management',
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    name: 'switch_network',
    description: 'Switch to a different blockchain network',
    parameters: {
      type: 'object',
      properties: {
        networkId: { type: 'string', description: 'Network ID or name to switch to' },
      },
      required: ['networkId'],
    },
    category: 'network',
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    name: 'get_swap_quote',
    description: 'Get a quote for swapping tokens',
    parameters: {
      type: 'object',
      properties: {
        fromToken: { type: 'string', description: 'Token address or symbol to swap from (use "native" for native currency)' },
        toToken: { type: 'string', description: 'Token address or symbol to swap to' },
        amount: { type: 'string', description: 'Amount to swap' },
        networkId: { type: 'string', description: 'Network to swap on (uses active network if not specified)' },
      },
      required: ['fromToken', 'toToken', 'amount'],
    },
    category: 'token_swap',
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    name: 'get_settings',
    description: 'Get current app settings and API key status',
    parameters: { type: 'object', properties: {}, required: [] },
    category: 'query',
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    name: 'get_token_security',
    description: 'Get a GoPlus security report for a token contract address, including honeypot detection, risk flags, and risk score',
    parameters: {
      type: 'object',
      properties: {
        contractAddress: { type: 'string', description: 'Token contract address to analyze' },
        network: { type: 'string', description: 'Network the token is on', enum: ['ethereum', 'base', 'arbitrum', 'optimism', 'solana'] },
      },
      required: ['contractAddress', 'network'],
    },
    category: 'query',
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    name: 'check_malicious_address',
    description: 'Check if a wallet or contract address is flagged as malicious by GoPlus security',
    parameters: {
      type: 'object',
      properties: {
        address: { type: 'string', description: 'Address to check' },
        network: { type: 'string', description: 'Network to check on', enum: ['ethereum', 'base', 'arbitrum', 'optimism', 'solana'] },
      },
      required: ['address', 'network'],
    },
    category: 'query',
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    name: 'create_alert',
    description: 'Create a new alert for price thresholds, whale activity, security events, portfolio changes, or research follow-ups',
    parameters: {
      type: 'object',
      properties: {
        alertType: {
          type: 'string',
          description: 'Type of alert to create',
          enum: ['price_threshold', 'wallet_activity', 'research_followup', 'system'],
        },
        config: { type: 'object', description: 'Alert configuration object matching the alert type schema' },
      },
      required: ['alertType', 'config'],
    },
    category: 'wallet_management',
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    name: 'list_alerts',
    description: 'List all configured alerts and their status',
    parameters: { type: 'object', properties: {}, required: [] },
    category: 'query',
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    name: 'delete_alert',
    description: 'Delete an alert by its ID',
    parameters: {
      type: 'object',
      properties: {
        alertId: { type: 'string', description: 'ID of the alert to delete' },
      },
      required: ['alertId'],
    },
    category: 'wallet_management',
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    name: 'search_prediction_markets',
    description: 'Search Polymarket prediction markets by topic or keyword',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query (e.g., "bitcoin", "ethereum ETF", "crypto regulation")' },
        limit: { type: 'number', description: 'Maximum number of results to return (default 10)' },
      },
      required: ['query'],
    },
    category: 'query',
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    name: 'get_prediction_market',
    description: 'Get detailed information about a specific Polymarket prediction market',
    parameters: {
      type: 'object',
      properties: {
        marketId: { type: 'string', description: 'Polymarket market ID' },
      },
      required: ['marketId'],
    },
    category: 'query',
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    name: 'get_crypto_sentiment',
    description: 'Get aggregated crypto market sentiment from Polymarket prediction markets',
    parameters: { type: 'object', properties: {}, required: [] },
    category: 'query',
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    name: 'get_portfolio_pnl',
    description: 'Get profit/loss summary for a wallet including total P/L, best/worst performers, and time-based changes',
    parameters: {
      type: 'object',
      properties: {
        walletAddress: { type: 'string', description: 'Wallet address (uses active wallet if not specified)' },
        timeRange: { type: 'string', description: 'Time range for P/L calculation', enum: ['1h', '24h', '7d', '30d', '90d', 'all'] },
      },
      required: [],
    },
    category: 'query',
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    name: 'get_trade_history',
    description: 'Get trade history records for a wallet',
    parameters: {
      type: 'object',
      properties: {
        walletAddress: { type: 'string', description: 'Wallet address (uses active wallet if not specified)' },
        limit: { type: 'number', description: 'Maximum number of trades to return (default 20)' },
      },
      required: [],
    },
    category: 'query',
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    name: 'add_watched_wallet',
    description: 'Add a wallet address to the watchlist for tracking activity',
    parameters: {
      type: 'object',
      properties: {
        address: { type: 'string', description: 'Wallet address to watch' },
        label: { type: 'string', description: 'Human-readable label for the watched wallet' },
        networks: { type: 'array', description: 'Networks to monitor (default: ethereum, base)' },
      },
      required: ['address'],
    },
    category: 'wallet_management',
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    name: 'remove_watched_wallet',
    description: 'Remove a wallet from the watchlist',
    parameters: {
      type: 'object',
      properties: {
        watchId: { type: 'string', description: 'ID of the watched wallet to remove' },
      },
      required: ['watchId'],
    },
    category: 'wallet_management',
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    name: 'list_watched_wallets',
    description: 'List all wallets currently on the watchlist',
    parameters: { type: 'object', properties: {}, required: [] },
    category: 'query',
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    name: 'get_wallet_activity',
    description: 'Get recent activity (swaps, transfers, approvals) for a watched wallet',
    parameters: {
      type: 'object',
      properties: {
        watchId: { type: 'string', description: 'ID of the watched wallet' },
        limit: { type: 'number', description: 'Maximum number of activities to return (default 20)' },
      },
      required: ['watchId'],
    },
    category: 'query',
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    name: 'get_x402_status',
    description: 'Get x402 micropayment status including budget, spending, and configuration',
    parameters: { type: 'object', properties: {}, required: [] },
    category: 'query',
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    name: 'list_x402_payments',
    description: 'List recent x402 micropayment records',
    parameters: { type: 'object', properties: {}, required: [] },
    category: 'query',
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  ...YIELD_TOOL_DEFINITIONS,
]

export function getToolsForOpenClaw(): object[] {
  return TOOL_DEFINITIONS.map((tool) => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }))
}

export function getToolDefinition(name: string): ToolDefinition | undefined {
  return TOOL_DEFINITIONS.find((t) => t.name === name)
}

export async function executeAction(name: string, params: Record<string, unknown>): Promise<ActionResult> {
  const handler = actionHandlers[name]
  if (!handler) {
    return { success: false, message: `Unknown action: ${name}`, error: 'UNKNOWN_ACTION' }
  }

  try {
    return await handler(params)
  } catch (error) {
    return { success: false, message: `Action failed: ${name}`, error: String(error) }
  }
}

export function createPendingAction(
  toolCallId: string,
  name: string,
  params: Record<string, unknown>
): PendingAction | null {
  const toolDef = getToolDefinition(name)
  if (!toolDef) return null

  return {
    id: `action_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    toolCallId,
    name,
    parameters: params,
    riskLevel: toolDef.riskLevel,
    status: 'pending',
    createdAt: new Date(),
    category: toolDef.category,
    description: toolDef.description,
  }
}
