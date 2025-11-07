# LLM-Powered Action System for SmartWallet AI

## Overview

This document describes the comprehensive LLM-powered action system that enables SmartWallet AI to perform wallet operations, token transfers, swaps, and cross-chain bridges via natural language through OpenRouter integration.

## Architecture

### Core Components

```
User Input (Natural Language)
         ↓
AI Chat Orchestrator
         ↓
Enhanced OpenRouter Service (Function Calling)
         ↓
Action Executor ←→ Permission Store
         ↓
Action Handlers (Wallet, Transfer, Swap, Bridge)
         ↓
Blockchain Services (EVM/SVM)
         ↓
On-Chain Execution
```

### Key Files Created

#### Types & Interfaces
- **`src/types/aiActions.ts`** - Complete type definitions for tools, actions, contexts, and results

#### AI Services
- **`src/services/ai/openrouterEnhanced.ts`** - Enhanced OpenRouter service with function calling support
- **`src/services/ai/aiChatOrchestrator.ts`** - Coordinates LLM calls, tool execution, and confirmations
- **`src/services/ai/contextBuilder.ts`** - Builds rich wallet context for LLM system prompts
- **`src/services/ai/actionExecutor.ts`** - Validates and executes actions with security checks

#### Tool Definitions & Actions
- **`src/services/ai/tools/toolDefinitions.ts`** - OpenAI-compatible tool definitions (30+ tools)
- **`src/services/ai/actions/actionRegistry.ts`** - Maps tool names to handler functions
- **`src/services/ai/actions/walletActions.ts`** - Wallet management action handlers
- **`src/services/ai/actions/transactionActions.ts`** - Transaction action handlers
- **`src/services/ai/actions/bridgeSwapActions.ts`** - Bridge and swap action handlers

#### External Services
- **`src/services/api/relayLinkService.ts`** - Relay.link integration for cross-chain bridges
- **`src/services/api/swapService.ts`** - Jupiter (Solana) and 1inch (EVM) swap integration

#### State Management
- **`src/store/permissionStore.ts`** - Manages action permissions, trusted actions, and limits

#### UI Components
- **`src/components/chat/ActionConfirmationDialog.tsx`** - User approval dialog for high-risk actions

#### Database
- **Updated `src/services/storage/database.ts`** - Added `aiActionHistory` table for audit trail

## Available Actions

### Wallet Management (8 actions)
1. **`create_evm_wallet`** - Creates EVM wallet in a group
2. **`create_solana_wallet`** - Creates Solana wallet in a group
3. **`list_wallets`** - Lists all wallets
4. **`switch_wallet`** - Switches active wallet
5. **`get_wallet_balance`** - Gets wallet balance with USD values
6. **`create_wallet_group`** - Creates new wallet group with seed phrase
7. **`switch_network`** - Switches active network
8. **`list_networks`** - Lists available networks

### Token Transfers (3 actions)
9. **`send_native_token`** - Sends ETH, SOL, BNB, MATIC, etc.
10. **`send_token`** - Sends ERC20/SPL tokens
11. **`estimate_gas`** - Estimates gas fees for EVM transactions

### Token Swaps (2 actions)
12. **`get_swap_quote`** - Gets quote for token swap
13. **`execute_swap`** - Executes token swap

### Cross-Chain Bridges (2 actions)
14. **`get_bridge_quote`** - Gets quote for bridging tokens
15. **`execute_bridge`** - Executes cross-chain bridge

### Queries (3 actions)
16. **`get_token_price`** - Gets current USD price of a token
17. **`get_transaction_history`** - Gets recent transactions
18. **`search_token`** - Searches for tokens (placeholder)

## Risk Levels & Security

### Risk Classification

- **Low Risk** - Read-only operations, no state changes
  - Examples: `list_wallets`, `get_wallet_balance`, `get_token_price`
  - No confirmation required

- **Medium Risk** - State changes with low financial impact
  - Examples: `create_evm_wallet`, `switch_wallet`
  - Confirmation required

- **High Risk** - Financial operations
  - Examples: `send_native_token`, `execute_swap`, `execute_bridge`
  - Confirmation + password required

- **Critical Risk** - Highly sensitive operations
  - Examples: Export private keys (not implemented)
  - Multiple confirmations + password required

### Security Features

1. **Action Confirmation Dialog**
   - Shows action details, parameters, risk level
   - Requires explicit user approval for high-risk actions
   - Displays transaction previews

2. **Permission Store**
   - Tracks trusted actions (user can mark low-risk actions as "always allow")
   - Daily transfer limits (default: $10,000 USD)
   - Blocked actions list
   - Automatic daily limit reset

3. **Audit Trail**
   - All actions logged to `aiActionHistory` table
   - Includes: action name, parameters, result, execution time, wallet ID, network ID
   - Queryable for security audits

4. **Memory Protection**
   - Private keys stored in secure memory with automatic wiping
   - 30-second timeout for key access
   - Keys cleared after transaction completion

5. **Password Requirements**
   - High-risk actions require password re-entry
   - No password caching for financial operations

## Context Injection

The system provides rich context to the LLM via system prompts:

### Wallet Context
- Active wallet name, address, type (EVM/SVM)
- Current network and chain ID
- Native token balance with USD value
- Top 10 token balances
- Total portfolio value and 24h change

### Available Wallets & Groups
- All wallet addresses (truncated)
- Wallet groups with counts
- Wallet types (EVM/SVM)

### Capabilities
- List of all available actions
- Network information
- Safety guidelines
- Response formatting instructions

## Usage Example

### User Message
```
"Create a new Ethereum wallet called 'Trading' and check its balance"
```

### Execution Flow

1. **User Input** → AI Chat Orchestrator
2. **Context Building** → System prompt with current wallet state
3. **LLM Processing** → OpenRouter with function calling enabled
4. **Tool Call #1** → `create_evm_wallet(name: "Trading", groupId: "default")`
5. **Confirmation** → User approves wallet creation
6. **Execution** → Wallet created, new address returned
7. **Tool Call #2** → `get_wallet_balance(walletId: "new-wallet-id")`
8. **Result** → Balance fetched (0 ETH for new wallet)
9. **LLM Response** → "I've created a new Ethereum wallet called 'Trading' with address 0x742d... The current balance is 0 ETH ($0.00)."

## Integration with ChatInterface

### Required Changes to ChatInterface Component

```typescript
import { aiChatOrchestrator, ChatResponse } from '../services/ai/aiChatOrchestrator'
import { ActionConfirmationDialog } from './ActionConfirmationDialog'
import { PendingAction } from '../types'

// In component state
const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
const [showConfirmation, setShowConfirmation] = useState(false)

// When sending message
const handleSendMessage = async (message: string) => {
  const response = await aiChatOrchestrator.sendMessage(
    conversationId,
    message,
    (chunk) => {
      // Handle streaming chunks
      setCurrentMessage(prev => prev + chunk)
    },
    (progress) => {
      // Handle progress updates
      setProgressMessage(progress)
    }
  )

  if (response.type === 'action_required') {
    // Show confirmation dialog
    setPendingAction(response.pendingAction!)
    setShowConfirmation(true)
  } else if (response.type === 'action_completed') {
    // Show result
    addMessageToUI({
      role: 'assistant',
      content: response.content || response.actionResult!.message
    })
  } else if (response.type === 'message') {
    // Regular message
    addMessageToUI({
      role: 'assistant',
      content: response.content!
    })
  } else if (response.type === 'error') {
    // Handle error
    showError(response.error!)
  }
}

// Handle action approval
const handleApproveAction = async () => {
  if (!pendingAction) return

  setShowConfirmation(false)
  const response = await aiChatOrchestrator.executePendingAction(
    conversationId,
    pendingAction.id,
    (progress) => setProgressMessage(progress),
    (chunk) => setCurrentMessage(prev => prev + chunk)
  )

  // Handle response...
}

// Handle action rejection
const handleRejectAction = async () => {
  if (!pendingAction) return

  setShowConfirmation(false)
  await aiChatOrchestrator.rejectPendingAction(conversationId, pendingAction.id)
  setPendingAction(null)
}

// In JSX
<ActionConfirmationDialog
  action={pendingAction}
  open={showConfirmation}
  onApprove={handleApproveAction}
  onReject={handleRejectAction}
/>
```

## API Configuration

### Required API Keys

1. **OpenRouter API Key**
   - Configure in settings
   - Supports any OpenRouter-compatible model

2. **1inch API Key** (for EVM swaps)
   - Add to `src/services/api/swapService.ts`
   - Replace `'Bearer YOUR_1INCH_API_KEY'`

3. **Relay.link** (no API key required)
   - Public API endpoints

4. **Jupiter** (no API key required)
   - Public API endpoints

### Network Configuration

Updated CSP in `index.html` to allow:
- `https://quote-api.jup.ag` - Jupiter swap quotes
- `https://api.1inch.dev` - 1inch swap API
- `https://*.1inch.io` - 1inch domains
- `https://api.relay.link` - Relay bridge API
- `https://*.relay.link` - Relay domains

## Testing Checklist

### Low-Risk Actions
- [ ] List wallets
- [ ] Get wallet balance
- [ ] List networks
- [ ] Get token price
- [ ] Switch wallet
- [ ] Switch network

### Medium-Risk Actions
- [ ] Create EVM wallet
- [ ] Create Solana wallet
- [ ] Create wallet group

### High-Risk Actions (requires testnet!)
- [ ] Send native token (on testnet)
- [ ] Send ERC20 token (on testnet)
- [ ] Execute swap (on testnet)
- [ ] Execute bridge (on testnet)

### Security Tests
- [ ] Verify confirmation dialog appears for high-risk actions
- [ ] Verify password requirement for financial operations
- [ ] Verify daily limits work correctly
- [ ] Verify action history is recorded
- [ ] Verify private keys are wiped from memory
- [ ] Verify rejected actions don't execute

## Future Enhancements

### Planned Features
1. **Hardware Wallet Support** - Ledger/Trezor integration
2. **Multi-Signature Wallets** - Gnosis Safe integration
3. **DeFi Operations** - Lending, staking, liquidity provision
4. **NFT Operations** - Mint, transfer, buy, sell
5. **Portfolio Analytics** - AI-powered insights and recommendations
6. **Transaction Batching** - Execute multiple operations in one transaction
7. **Price Alerts** - Set up automated alerts via AI
8. **Gas Optimization** - AI suggests optimal gas prices
9. **Smart Routing** - AI finds best routes for swaps/bridges
10. **Voice Commands** - Voice-to-text for hands-free operation

### Known Limitations

1. **Relay.link Contract Addresses** - Placeholder addresses in `relayLinkService.ts` need to be updated with real contract addresses
2. **1inch API Key** - Requires configuration for production use
3. **Token Decimals** - Some methods assume 18 decimals; should fetch dynamically
4. **Error Handling** - Some edge cases need additional error handling
5. **Solana Transaction History** - Not yet implemented
6. **Token Search** - Placeholder implementation
7. **Price Impact** - Not calculated for 1inch swaps
8. **Slippage Tolerance** - Currently hardcoded, should be configurable

## Troubleshooting

### Common Issues

**"OpenRouter API key not configured"**
- Solution: Add OpenRouter API key in Settings

**"Action requires password"**
- Solution: Ensure wallet is unlocked before executing high-risk actions

**"Failed to get bridge quote"**
- Solution: Check network connectivity and Relay.link API status

**"Gas estimation failed"**
- Solution: Ensure sufficient balance for gas fees

**"Tool call validation failed"**
- Solution: Check that all required parameters are provided

## Contributing

When adding new actions:

1. Define tool in `toolDefinitions.ts`
2. Create handler function in appropriate actions file
3. Register in `actionRegistry.ts` with correct risk level
4. Add to context builder if needed
5. Update this README with new action details
6. Add tests for the new action

## License

This feature is part of SmartWallet AI and follows the project's license.

## Support

For issues or questions:
- GitHub Issues: [Link to repository]
- Documentation: [Link to docs]
- Discord: [Link to community]
