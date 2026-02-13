/**
 * Code by Xipzer
 *
 * Action Result Card Router — maps action names to specialised card components.
 * Individual card implementations live in ./result-cards/.
 */

import {
  Plus,
  Trash2,
  Bell,
  TrendingUp,
  CheckCircle2,
} from 'lucide-react'
import type { ActionResultData } from '../../types/research'

import {
  WalletListCard,
  BalanceCard,
  WalletGroupCard,
  RenameCard,
  NetworkListCard,
  SwitchCard,
  SecurityCard,
  MaliciousCheckCard,
  SwapQuoteCard,
  AlertsCard,
  PredictionMarketsCard,
  SentimentCard,
  PortfolioCard,
  TradeHistoryCard,
  WatchlistCard,
  X402Card,
  YieldCard,
  SettingsCard,
  SimpleConfirmCard,
  FailureCard,
} from './result-cards'

interface ActionResultCardProps {
  result: ActionResultData
}

export function ActionResultCard({ result }: ActionResultCardProps) {
  if (!result.success) return <FailureCard result={result} />

  const d = result.data as any

  switch (result.actionName) {
    case 'list_wallets':
      return <WalletListCard data={d} />
    case 'list_networks':
      return <NetworkListCard data={d} />
    case 'get_balance':
      return <BalanceCard data={d} />
    case 'get_swap_quote':
      return <SwapQuoteCard data={d} />
    case 'switch_wallet':
      return <SwitchCard data={d} type="wallet" />
    case 'switch_network':
      return <SwitchCard data={d} type="network" />
    case 'create_wallet_group':
      return <WalletGroupCard data={d} action="created" />
    case 'delete_wallet_group':
      return <WalletGroupCard data={d} action="deleted" />
    case 'add_wallets_to_group':
      return <SimpleConfirmCard icon={Plus} title="Wallets Added" message={result.message} />
    case 'rename_wallet':
      return <RenameCard data={d} type="wallet" />
    case 'rename_wallet_group':
      return <RenameCard data={d} type="group" />
    case 'delete_wallet':
      return <SimpleConfirmCard icon={Trash2} title="Wallet Deleted" message={result.message} />
    case 'get_token_security':
      return <SecurityCard data={d} />
    case 'check_malicious_address':
      return <MaliciousCheckCard data={d} />
    case 'get_settings':
      return <SettingsCard data={d} />
    case 'create_alert':
      return <SimpleConfirmCard icon={Bell} title="Alert Created" message={result.message} />
    case 'delete_alert':
      return <SimpleConfirmCard icon={Trash2} title="Alert Deleted" message={result.message} />
    case 'list_alerts':
      return <AlertsCard data={d} />
    case 'search_prediction_markets':
      return <PredictionMarketsCard data={d} />
    case 'get_prediction_market':
      return d?.outcomes ? <PredictionMarketsCard data={{ markets: [d], count: 1 }} /> : <SimpleConfirmCard icon={TrendingUp} title="Market" message={result.message} />
    case 'get_crypto_sentiment':
      return <SentimentCard data={d} />
    case 'get_portfolio_pnl':
      return <PortfolioCard data={d} />
    case 'get_trade_history':
      return <TradeHistoryCard data={d} />
    case 'add_watched_wallet':
      return <WatchlistCard data={d} action="added" />
    case 'remove_watched_wallet':
      return <SimpleConfirmCard icon={Trash2} title="Wallet Removed" message={result.message} />
    case 'list_watched_wallets':
      return <WatchlistCard data={d} action="list" />
    case 'get_wallet_activity':
      return <WatchlistCard data={d} action="activity" />
    case 'get_x402_status':
      return <X402Card data={d} action="status" />
    case 'list_x402_payments':
      return <X402Card data={d} action="payments" />
    case 'search_yield_opportunities':
    case 'get_top_yields':
    case 'get_yield_for_token':
      return <YieldCard data={d} />
    default:
      return <SimpleConfirmCard icon={CheckCircle2} title="Action Complete" message={result.message} />
  }
}
