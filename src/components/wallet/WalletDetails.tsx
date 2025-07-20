import { useState, useEffect } from 'react'
import { RefreshCw, Send, Copy, ExternalLink } from 'lucide-react'
import { useWalletStore } from '../../store/walletStore'
import { EVMWalletService } from '../../services/blockchain/evmWallet'
import { SVMWalletService } from '../../services/blockchain/svmWallet'
import { getNetworkById } from '../../utils/networks'
import { WalletBalance } from '../../types'
import { SendTokenDialog } from './SendTokenDialog'
import { TokenList } from './TokenList'
import { Skeleton } from '../common/Skeleton'

export function WalletDetails() {
  const { wallets, activeWalletId, activeNetwork } = useWalletStore()
  const [balance, setBalance] = useState<WalletBalance | null>(null)
  const [isLoadingBalance, setIsLoadingBalance] = useState(false)
  const [showSendDialog, setShowSendDialog] = useState(false)
  const [selectedToken, setSelectedToken] = useState<string | null>(null)
  const [selectedTokenInfo, setSelectedTokenInfo] = useState<{ decimals: number; symbol: string } | null>(null)

  const activeWallet = wallets.find(w => w.id === activeWalletId)
  const network = getNetworkById(activeNetwork.id)

  const fetchBalance = async () => {
    if (!activeWallet || !network) return

    setIsLoadingBalance(true)
    try {
      let nativeBalance = '0'
      
      if (activeWallet.type === 'EVM') {
        nativeBalance = await EVMWalletService.getBalance(activeWallet.address, network.rpcUrl)
      } else {
        nativeBalance = await SVMWalletService.getBalance(activeWallet.address, network.rpcUrl)
      }

      setBalance({
        native: nativeBalance,
        tokens: [] // TODO: Implement token balance fetching
      })
    } catch (error) {
      console.error('Failed to fetch balance:', error)
    } finally {
      setIsLoadingBalance(false)
    }
  }

  useEffect(() => {
    if (activeWallet && network) {
      fetchBalance()
    }
  }, [activeWallet, network])

  const copyAddress = () => {
    if (activeWallet) {
      navigator.clipboard.writeText(activeWallet.address)
    }
  }

  const openExplorer = () => {
    if (activeWallet && network) {
      const url = `${network.explorer}/address/${activeWallet.address}`
      window.open(url, '_blank')
    }
  }

  if (!activeWallet) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500 dark:text-gray-400">Select a wallet to view details</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Wallet Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {activeWallet.name}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                {activeWallet.address.slice(0, 6)}...{activeWallet.address.slice(-4)}
              </p>
              <button
                onClick={copyAddress}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                title="Copy address"
              >
                <Copy className="w-3 h-3 text-gray-500 dark:text-gray-400" />
              </button>
              <button
                onClick={openExplorer}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                title="View in explorer"
              >
                <ExternalLink className="w-3 h-3 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
          </div>

          <button
            onClick={fetchBalance}
            disabled={isLoadingBalance}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
            title="Refresh balance"
          >
            <RefreshCw className={`w-5 h-5 text-gray-600 dark:text-gray-400 ${isLoadingBalance ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Native Balance */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Balance</p>
              {isLoadingBalance ? (
                <Skeleton variant="text" width="120px" className="mt-1" />
              ) : (
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {balance?.native || '0'} {network?.symbol}
                </p>
              )}
            </div>
            <button
              onClick={() => {
                setSelectedToken(null)
                setShowSendDialog(true)
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Send className="w-4 h-4" />
              Send
            </button>
          </div>
        </div>
      </div>

      {/* Token List */}
      <div className="flex-1 overflow-y-auto">
        <TokenList 
          walletAddress={activeWallet.address}
          walletType={activeWallet.type}
          network={network!}
          onSendToken={(tokenAddress, tokenInfo) => {
            setSelectedToken(tokenAddress)
            setSelectedTokenInfo(tokenInfo)
            setShowSendDialog(true)
          }}
        />
      </div>

      {/* Send Dialog */}
      <SendTokenDialog
        open={showSendDialog}
        onOpenChange={(open) => {
          setShowSendDialog(open)
          if (!open) {
            setSelectedToken(null)
            setSelectedTokenInfo(null)
          }
        }}
        wallet={activeWallet}
        network={network!}
        tokenAddress={selectedToken}
        tokenDecimals={selectedTokenInfo?.decimals}
        tokenSymbol={selectedTokenInfo?.symbol}
      />
    </div>
  )
}