# Architecture - Kybera

This document explains how the application is built, how data flows through it, and how the major systems work together.
It's written for developers who want to understand or contribute to the codebase.

---

## High-Level Overview

Kybera is a **client-side only** React single-page application. There is no backend server. Everything runs in the
browser:

```
Browser (React SPA)
  |
  |-- IndexedDB (Dexie) ........... Local database for all persistent data
  |-- Zustand Stores .............. In-memory state management
  |
  |-- Blockchain RPCs ............. Direct calls to EVM and Solana nodes
  |-- Alchemy API ................. Enhanced blockchain data
  |-- CoinGecko API ............... Token prices
  |-- DexScreener API ............. DEX pair data and token logos
  |-- Basescan/Etherscan APIs ..... Contract and holder data
  |-- Jupiter API ................. Solana swaps
  |-- KyberSwap API ............... EVM swaps
  |-- relay.link API .............. Cross-chain bridging
  |-- OpenClaw Gateway ............ AI agent (WebSocket)
```

All sensitive data (private keys, seed phrases) is encrypted with AES-256 and never leaves the browser unencrypted.

---

## Tech Stack

| Layer            | Technology                          | Version     |
|------------------|-------------------------------------|-------------|
| UI Framework     | React + TypeScript                  | 18.3 / 5.6  |
| Build            | Vite                                | 6           |
| Routing          | React Router                        | 7           |
| State (client)   | Zustand                             | 5           |
| State (server)   | TanStack Query                      | 5           |
| Styling          | Tailwind CSS + Radix UI             | 3.x         |
| Animations       | Framer Motion                       | -           |
| EVM              | ethers.js                           | 6           |
| Solana           | @solana/web3.js + @solana/spl-token | 1.98 / 0.4  |
| AI               | OpenClaw Gateway (WebSocket)        | Protocol v3 |
| Database         | Dexie.js (IndexedDB)                | 4           |
| Encryption       | CryptoJS (AES-256)                  | -           |
| Password Hashing | PBKDF2 (SHA-256, 100K iterations)   | -           |

---

## Directory Structure

```
src/
  App.tsx                          Root component (auth gate + layout)
  main.tsx                         Entry point (ReactDOM)
  index.css                        Global styles
  themes.ts                        Theme definitions (5 themes)

  components/
    ModernDialog.tsx               Reusable dialog component
    NetworkIcons.tsx               SVG icons for each blockchain network
    UnlockScreen.tsx               Password lock screen with particle animation
    chat/
      ChatInterface.tsx            Main AI chat view
      ChatMessage.tsx              Individual message rendering (markdown)
      ChatSidebar.tsx              Conversation history sidebar
      ActionConfirmationDialog.tsx Approval dialog for AI actions
    common/
      AnimatedPanel.tsx            Animated panel wrapper
      EmptyState.tsx               Placeholder for empty views
      ImageUpload.tsx              Profile picture / wallpaper upload
      OpenClawDeepLinkBanner.tsx   Banner for OpenClaw deep links
    defi/
      YieldView.tsx                DeFi yield opportunities (DeFiLlama data)
    layout/
      AnimatedMainLayout.tsx       Desktop layout with NavRail + PanelGroup
      NavRail.tsx                  Fixed left navigation with hover-expand
      MobileNav.tsx                Bottom navigation bar for mobile
      ResponsiveLayout.tsx         Desktop vs mobile layout switcher
    markets/
      PredictionMarketsView.tsx    Polymarket prediction markets view
    research/
      ResearchView.tsx             Token research interface
      ResearchCard.tsx             Structured research result display
      ApeInterface.tsx             Quick-buy interface after research
    settings/
      SettingsDialog.tsx           Main settings modal (Interface tab with Restore Defaults)
      SettingsPanel.tsx            Settings content panel (mobile, icon-only tabs)
      X402Settings.tsx             x402 payment configuration
      NetworkManagementDialog.tsx  Add/hide/manage networks
    wallet/
      WalletDrawer.tsx             Right sidebar with wallet groups and wallets
      WalletDetailView.tsx         Selected wallet: balances, tokens, actions
      WalletNameEditor.tsx         Batch wallet name editor with address preview
      TokenList.tsx                Token balance list for a wallet
      TransactionHistory.tsx       Transaction history view
      SendDialog.tsx               Send tokens dialog
      ReceiveDialog.tsx            Receive tokens (QR code) dialog
      AddTokenDialog.tsx           Manually add a token
      CreateGroupDialog.tsx        Create new HD wallet group
      ImportWalletDialog.tsx       Import wallet via private key
      ImportGroupDialog.tsx        Import wallet group via seed phrase
      ExportWalletDialog.tsx       Export private key
      ExportGroupDialog.tsx        Export seed phrase
      AddWalletToGroupDialog.tsx   Derive new wallet in a group
      RenameWalletDialog.tsx       Rename a wallet
      MultiNetworkSelector.tsx     Select which networks to view
      ExecutionNetworkSelector.tsx Select network for operations
      NetworkSummary.tsx           Network balance summary

  hooks/
    useCopyToClipboard.ts          Clipboard helper
    useExportSecret.ts             Export secret key/seed with password verification
    useMediaQuery.ts               Responsive breakpoint detection
    useMultiNetworkBalance.ts      Multi-chain balance aggregation hook
    useOpenClawDeepLink.ts         Handle OpenClaw deep links
    useSettingsState.ts            Settings state hook (including API keys)
    useTheme.ts                    Theme application hook
    useTransactionHistory.ts       Transaction history data hook
    useWalletBalance.ts            Single wallet balance hook

  services/
    database.ts                    Dexie schema (16 tables, single version)
    networkService.ts              Network CRUD, custom networks, visibility
    notificationService.ts         Alert polling and browser push notifications
    openClawService.ts             OpenClaw Gateway WebSocket client
    tokenImageService.ts           Token logo fetching (CoinGecko, queued)
    walletTrackingService.ts       Watched wallet polling, activity classification, copy trade evaluation
    api/
      coinGeckoService.ts          Token price fetching (proxied via /api/coingecko)
      rateLimiter.ts               Priority-based API rate limiting
      relayLinkService.ts          Cross-chain bridge (relay.link)
      swapService.ts               Token swaps (Jupiter + KyberSwap)
    blockchain/
      blockchainService.ts         Main orchestrator for all blockchain operations
      balanceAggregator.ts         Balance + price aggregation per network
      onChainDataService.ts        On-chain data fetching (native + token balances)
      priceService.ts              Price data coordination with 5-min cache
      provider.ts                  RPC provider factory with runtime API key resolution
      tokenDiscovery.ts            Automatic token detection via Alchemy
      alchemyService.ts            Alchemy SDK wrapper (runtime API key)
      evmWallet.ts                 EVM wallet creation, derivation, transactions
      svmWallet.ts                 Solana wallet creation, derivation, transactions
      evmRpcService.ts             Raw EVM RPC calls
      svmService.ts                Solana RPC service
      eventBus.ts                  Internal event system
    defi/
      yieldService.ts              DeFi yield data from DeFiLlama
    research/
      basescanService.ts           Basescan/Etherscan contract data
      dexScreenerService.ts        DexScreener token/pair data
      polymarketService.ts         Polymarket Gamma API (prediction markets)
    security/
      memoryProtection.ts          Sensitive data protection (XOR obfuscation, auto-wipe)
      securityService.ts           XSS/extension detection, prototype freezing

  store/
    authStore.ts                   Password hash/salt, init, verify, change password
    chatStore.ts                   Conversations, messages, CRUD
    permissionStore.ts             AI action permissions, transfer limits
    researchStore.ts               OpenClaw connection, active researches, results
    settingsStore.ts               Gateway URL, API keys, auto-lock timeout
    uiStore.ts                     Theme, drawer state, wallpapers, panel sizes, resetUI()
    walletStore.ts                 Wallets, groups, active wallet/network, lock state
    watchlistStore.ts              Watched wallets, activities, copy trade configs

  types/
    aiActions.ts                   AI action system type definitions
    chat.ts                        Chat/message types
    defi.ts                        DeFi yield types
    notifications.ts               Alert and notification types
    portfolio.ts                   Trade records, P&L, portfolio snapshots
    predictions.ts                 Prediction market types
    research.ts                    Token research types
    wallet.ts                      Wallet, network, token types
    watchlist.ts                   Watched wallet and copy trade types
    x402.ts                        x402 payment protocol types
    index.ts                       Re-exports

  utils/
    auth.ts                        PBKDF2 password hashing
    crypto.ts                      AES-256 encrypt/decrypt helpers
    dbUtils.ts                     Database utility functions
    formatters.ts                  Number and address formatting
    networks.ts                    Network definitions (8 networks with RPC URLs)
    themeClasses.ts                Theme-specific CSS class helpers
```

---

## State Management

The app uses **6 Zustand stores**, each responsible for a specific domain. Some stores persist specific fields to
localStorage or IndexedDB.

### Store Responsibilities

**walletStore** - The largest store (~560 lines). Manages wallets, wallet groups, active wallet selection, active
network, lock/unlock state, and the in-memory password. Persists `activeWalletId`, `activeNetwork`, and `viewNetworks`
to localStorage.

**chatStore** - Manages chat conversations and messages. Supports creating, deleting, pinning conversations and adding
messages. Persists `activeConversationId` to localStorage.

**authStore** - Handles password initialization, verification, and changes. Stores the password hash, salt, and
encryption salt. Persists all three to localStorage.

**settingsStore** - Stores OpenClaw gateway URL, OpenClaw auth token, API keys (CoinGecko, Alchemy, Helius),
auto-lock timeout, and default network. API keys persist to IndexedDB, other settings to localStorage.

**uiStore** - Controls theme selection, drawer open/width state, chat sidebar visibility, profile picture, wallpapers (
chat + lockscreen with opacity), particle effect settings, wallet detail panel size, and UI defaults with a `resetUI()`
action. Persists to localStorage.

**researchStore** - Manages OpenClaw WebSocket connection state, active research requests, streaming chat messages, and
completed research results. Persists completed researches to localStorage.

**permissionStore** - Manages AI action permissions (trusted/blocked actions), daily transfer limits (default $10K), and
action approval state. Persists to localStorage.

### Data Flow Pattern

```
User Action
  -> React Component (event handler)
    -> Zustand Store (state update)
      -> Service Layer (API/blockchain call)
        -> External Service (RPC, API, WebSocket)
          -> Response
        -> Store Update (new state)
      -> React re-render
    -> UI Update
```

---

## Database Schema

The app uses **Dexie.js** (IndexedDB wrapper) with a database called `SmartWalletDB`. It has 16 tables in a single
schema version.

### Tables

| Table               | Primary Key | Indexes                                            | What it stores                                       |
|---------------------|-------------|----------------------------------------------------|------------------------------------------------------|
| `wallets`           | `id` (auto) | groupId, address, type, order, lastNetworkId       | Wallet records (address, encrypted key, type, group) |
| `walletGroups`      | `id` (auto) | createdAt, order                                   | HD wallet groups (name, encrypted seed phrase)       |
| `conversations`     | `id` (auto) | createdAt, pinned                                  | Chat conversation metadata                           |
| `messages`          | `id` (auto) | conversationId, timestamp                          | Individual chat messages                             |
| `settings`          | `key`       | -                                                  | Key-value app settings                               |
| `auth`              | `id`        | -                                                  | Password hash, salt, encryption salt                 |
| `transactions`      | `id` (auto) | hash, from, to, network, timestamp                 | Transaction records                                  |
| `tokenBalances`     | `id`        | walletAddress, networkId, lastUpdated              | Cached ERC-20/SPL balances                           |
| `priceData`         | `id`        | symbol, lastUpdated                                | Cached token prices                                  |
| `priceHistory`      | `id`        | symbol, timestamp                                  | Historical prices for 24h change                     |
| `walletBalances`    | `id`        | walletAddress, networkId, lastUpdated              | Cached native balances                               |
| `tokenMetadata`     | `id`        | chainId, address, lastUpdated                      | Token metadata (name, symbol, decimals, logo)        |
| `discoveredTokens`  | `id`        | walletAddress, chainId, tokenAddress, discoveredAt | Auto-detected tokens                                 |
| `customNetworks`    | `id`        | type, chainId, addedAt                             | User-added custom RPC networks                       |
| `networkVisibility` | `networkId` | updatedAt                                          | Hidden/shown network preferences                     |
| `aiActionHistory`   | `id`        | actionName, executedAt, walletId, conversationId   | Audit trail of AI-executed actions                   |

---

## Security Architecture

Security is implemented in multiple layers, all running client-side.

### Layer 1: Encryption

- Private keys and seed phrases are encrypted with **AES-256** (CryptoJS) using the user's password as the key
- Encryption/decryption happens in `src/utils/crypto.ts` via `encryptData()` and `decryptData()`
- Keys are only decrypted when needed (signing a transaction) and wiped immediately after

### Layer 2: Password Hashing

- User password is hashed with **PBKDF2** using SHA-256, 100,000 iterations, and a 32-byte random salt
- Implementation in `src/utils/auth.ts`
- The hash and salt are stored; the password itself is never persisted

### Layer 3: Memory Protection

- `src/services/security/memoryProtection.ts` provides the `MemoryProtection` class
- Sensitive values (decrypted keys) are stored using `ObfuscatedValue` which splits data into two parts using XOR
- Values have a TTL (default 5 minutes) and max access count (default 5), after which they're automatically wiped
- `wipeSensitive()` zeroes out all protected values on lock

### Layer 4: Session Management

- The app locks after configurable inactivity (default timeout in settings)
- On lock: password is wiped from memory, all protected values are destroyed
- On unlock: password is verified against stored hash, then held in memory for the session

### Layer 5: Browser Protection

- `src/services/security/securityService.ts` provides runtime protection:
  - Freezes critical browser prototypes to prevent tampering
  - Monitors the DOM for injected `<script>` tags (MutationObserver)
  - Detects suspicious browser extensions
- `index.html` includes a strict Content Security Policy whitelisting only known blockchain RPC domains

### Data Flow for a Transaction

```
1. User initiates "Send 1 ETH to 0x..."
2. App calls memoryProtection.retrieve("password")
3. Password is used to decrypt the private key (AES-256)
4. ethers.js signs the transaction with the decrypted key
5. Private key is immediately wiped from memory
6. Signed transaction is broadcast to the RPC node
7. Transaction monitor watches for confirmation
```

---

## Blockchain Service Layer

The blockchain layer is the most complex part of the codebase. It handles wallet operations, balance fetching, and
transaction execution across 8 networks.

### Core Services

**blockchainService.ts** - The main orchestrator. Routes operations to the correct chain-specific service (EVM or SVM)
based on the selected network.

**evmWallet.ts** - EVM wallet operations using ethers.js v6:

- Wallet creation (random or from seed via BIP-44 path `m/44'/60'/0'/0/{index}`)
- Private key import
- Native token transfers
- ERC-20 token transfers
- Gas estimation

**svmWallet.ts** - Solana wallet operations using @solana/web3.js:

- Wallet creation (random or from seed via BIP-44 path `m/44'/501'/{index}'/0'`)
- SOL transfers
- SPL token transfers
- Fee estimation

**balanceAggregator.ts** - Combines native balances, token balances, and USD prices into a single view. Uses separate
refresh cycles:

- Blockchain data: fast cycle (30s - 1m)
- Price data: slow cycle (5 - 10m)

### Infrastructure Services

**rateLimiter.ts** - Priority-based rate limiting for CoinGecko API calls. Price fetches get `high` priority, image
fetches get `low` priority. Enforces 30 requests/minute and 500ms minimum interval.

**eventBus.ts** - Internal pub/sub system for components to react to blockchain events (token discovery, balance
changes).

**priceService.ts** - Coordinates native and token price fetching with a 5-minute cache. Falls back to cached data if
CoinGecko is unavailable.

**provider.ts** - RPC provider factory with runtime API key resolution. Reads Alchemy/Helius keys from the settings
store (with `.env` fallback) and injects them into RPC URLs at call time.

### Token Discovery

**tokenDiscovery.ts** detects tokens held by a wallet using the Alchemy API. Resolves the Alchemy service dynamically
on each call so that runtime API key changes take effect without reloading. Includes spam detection patterns and a
5-minute discovery cooldown per wallet/chain pair.

Discovered tokens are stored in the `discoveredTokens` IndexedDB table.

---

## AI Integration

### OpenClaw Gateway

The primary AI integration is **OpenClaw**, a locally-hosted AI agent that connects via WebSocket. The client
implementation is in `src/services/openclaw/openClawService.ts` (~1200 lines).

**Protocol**: Custom WebSocket protocol (version 3) with:

- Challenge/response authentication
- `req/res/event` message format
- Methods: `connect`, `agent`, `chat.send`
- Streaming responses via `event.agent` messages

**Connection flow**:
```
1. Client connects to WebSocket URL (configured in settings)
2. Server sends authentication challenge
3. Client responds with auth token
4. Connection established, ready for requests
```

**Research flow**:
```
1. User enters a contract address in ResearchView
2. researchStore.requestResearch() is called
3. OpenClawService constructs a detailed research prompt with:
   - Contract address and chain
   - Instructions for OSINT analysis
   - Required output format (structured JSON)
4. Prompt sent via WebSocket as an "agent" request
5. AI streams response chunks back as events
6. Chunks are concatenated and displayed in real-time
7. Final response is parsed (parseResearchResponse()) to extract:
   - Token name, symbol, market cap, price
   - Risk rating (SAFE / POTENTIAL / HIGH RISK / AVOID)
   - Pros and cons
   - Developer info
8. Structured data displayed as a ResearchCard
```

### AI Action System

A complete function-calling system that lets the AI perform wallet operations. This was originally built for direct LLM
integration and is compatible with OpenAI's tool format.

**Components**:

- **toolDefinitions.ts** - Defines 18 tools in OpenAI function-calling format, organized into 6 categories (wallet,
  network, transfer, swap, bridge, query)
- **actionRegistry.ts** - Maps tool names to handler functions, each with a risk level (low/medium/high/critical) and
  whether confirmation is required
- **actionExecutor.ts** - Validates action parameters, creates pending action records, executes the handler with wallet
  context, and records an audit trail in IndexedDB
- **contextBuilder.ts** - Generates system prompts with current wallet state (active wallet, balances, network,
  available actions)

**Action categories and risk levels**:

| Category          | Actions                                                                                                       | Risk          |
|-------------------|---------------------------------------------------------------------------------------------------------------|---------------|
| Wallet Management | create_evm_wallet, create_solana_wallet, list_wallets, switch_wallet, get_wallet_balance, create_wallet_group | Low           |
| Network           | switch_network, list_networks                                                                                 | Low           |
| Queries           | get_token_price, get_transaction_history, search_token                                                        | Low           |
| Gas Estimation    | estimate_gas                                                                                                  | Low           |
| Token Transfers   | send_native_token, send_token                                                                                 | High          |
| Swaps             | get_swap_quote, execute_swap                                                                                  | Medium / High |
| Bridge            | get_bridge_quote, execute_bridge                                                                              | Medium / High |

High-risk actions trigger the `ActionConfirmationDialog` component, which shows the user exactly what will happen and
requires explicit approval.

---

## UI Architecture

### Layout System

The app has two layout modes, switched by `ResponsiveLayout` based on screen width:

**Desktop** (`AnimatedMainLayout`):

```
+------+---------------------------+------------------+
|      |                           |                  |
| Nav  |    Main Content           |  WalletDrawer    |
| Rail |    (Tabbed: Research,     |  (resizable,     |
|      |     Portfolio, Watchlist, |   collapsible)   |
|      |     Markets, Yield)       |                  |
+------+---------------------------+------------------+
```

NavRail is a fixed left sidebar with hover-expand that provides navigation between tabs.
The main content and WalletDrawer form a horizontal PanelGroup with a resize handle.

**Mobile** (`ResponsiveLayout`):

```
+-------------------------+
|                         |
|    Main Content         |
|    (ResearchView)       |
|                         |
+-------------------------+
| Research | Portfolio |  |  <- MobileNav (bottom, icon-only tabs)
+-------------------------+
```

WalletDrawer and settings slide in as overlay panels on mobile.

### Theme System

Defined in `src/themes.ts` (~1200 lines) with CSS custom properties applied via `src/utils/themeClasses.ts`.

5 themes:

- **Light** - Clean light theme
- **Dark** - Standard dark theme
- **Xipz** - Dark theme with red/crimson accents
- **OG Dark** - Neon dark theme with cyan and pink
- **OG Light** - Light version of OG theme

Each theme defines colors for: backgrounds, text, borders, cards, buttons, accents, status indicators, and glassmorphism
effects.

Users can also upload custom wallpapers for the chat background and lock screen, with adjustable opacity.

### Component Patterns

- **Dialogs**: All modal dialogs use `ModernDialog` (wrapping Radix UI Dialog) with consistent styling
- **State**: Components read from Zustand stores via hooks. No prop drilling for global state.
- **Animations**: Framer Motion `AnimatePresence` and `motion` components for enter/exit animations
- **Drag and Drop**: `@dnd-kit` for wallet/group reordering in WalletDrawer
- **Responsive**: `useMediaQuery` hook for breakpoint detection; components adapt layout accordingly

---

## External API Integrations

| Service            | File                            | Protocol       | Purpose                                                    |
|--------------------|---------------------------------|----------------|------------------------------------------------------------|
| Blockchain RPCs    | evmRpcService.ts, svmService.ts | HTTP/WebSocket | Direct blockchain queries and transaction broadcasting     |
| Alchemy            | alchemyService.ts               | HTTP           | Enhanced token data, token balances, NFT data              |
| CoinGecko          | coinGeckoService.ts             | HTTP (proxied) | Token prices and 24h price change                          |
| DexScreener        | dexScreenerService.ts           | HTTP           | DEX pair data, token logos, trending tokens                |
| Basescan/Etherscan | basescanService.ts              | HTTP           | Contract source code, holder data, deployer identification |
| Polymarket         | polymarketService.ts            | HTTP (proxied) | Prediction market data from Gamma API                      |
| DeFiLlama          | yieldService.ts                 | HTTP           | DeFi yield and TVL data                                    |
| Jupiter            | swapService.ts                  | HTTP           | Solana token swap quotes and execution                     |
| KyberSwap          | swapService.ts                  | HTTP           | EVM token swap quotes and execution (no API key needed)    |
| relay.link         | relayLinkService.ts             | HTTP           | EVM-to-EVM cross-chain bridge quotes and execution         |
| OpenClaw           | openClawService.ts              | WebSocket      | AI agent for token research and chat                       |

---

## OpenClaw Action System

The AI assistant can execute wallet operations through natural language. This is powered by a skill file and action handler system.

### Skill File

`public/SKILL.md` is served at `https://app.kybera.xyz/SKILL.md`. It teaches the AI:

1. **Token Research Format** - How to structure research responses with market data, developer info, and risk ratings
2. **Wallet Actions** - JSON format for executable actions (create wallets, switch networks, check balances, etc.)
3. **Self-Update Instructions** - How to cache the skill locally and check for updates

When a user sends a message, the client includes a reference to the skill URL. The AI fetches and caches it, then follows the instructions.

### Action Handlers

`src/services/openClawActions.ts` defines 13 executable actions:

| Action               | Risk Level | Confirmation | Description                              |
|----------------------|------------|--------------|------------------------------------------|
| create_wallet_group  | medium     | yes          | Create a new wallet group with wallets   |
| add_wallets_to_group | medium     | yes          | Add wallets to an existing group         |
| rename_wallet        | low        | no           | Rename a wallet                          |
| rename_wallet_group  | low        | no           | Rename a wallet group                    |
| delete_wallet        | high       | yes          | Delete a wallet                          |
| delete_wallet_group  | critical   | yes          | Delete a group and all its wallets       |
| list_wallets         | low        | no           | List all wallets and groups              |
| list_networks        | low        | no           | List available blockchain networks       |
| get_balance          | low        | no           | Get wallet balance on a network          |
| switch_wallet        | low        | no           | Switch active wallet                     |
| switch_network       | low        | no           | Switch active network                    |
| get_swap_quote       | low        | no           | Get a swap quote from KyberSwap/Jupiter  |
| get_settings         | low        | no           | Get current app settings                 |

### Action Execution Flow

```
User: "Create a wallet group called Test with 5 EVM wallets"
  |
  v
openClawService.sendChatMessage()
  |-- Includes skill URL reference in message
  |
  v
OpenClaw AI processes, fetches skill if needed
  |-- Responds with JSON action block:
  |   ```json
  |   {"action": "create_wallet_group", "params": {"name": "Test", "evmCount": 5}}
  |   ```
  |
  v
openClawService.parseAndExecuteActions()
  |-- Extracts JSON from response
  |-- Looks up action in TOOL_DEFINITIONS
  |
  v
requiresConfirmation? 
  |-- YES: emit 'action_requested' -> show ActionConfirmationDialog
  |-- NO: execute immediately via actionHandlers[name](params)
  |
  v
Result emitted as 'action_result' -> displayed in chat
```

---

## Build and Development

### Vite Configuration

- **Dev server proxy**: `/api/coingecko` and `/api/polymarket` are proxied to their respective APIs to avoid CORS
  (production requires matching rewrite rules on the hosting platform; Polymarket needs a CORS proxy since the Gamma API
  does not send CORS headers)
- **Node polyfills**: `vite-plugin-node-polyfills` provides Buffer, global, and process polyfills needed by ethers.js
  and Solana libraries
- **Production optimizations**: Source maps disabled, console/debugger statements stripped via esbuild `drop`

### Development Workflow

```bash
npm run dev          # Start dev server (localhost:5173)
npm run typecheck    # Type checking only (fast)
npm run lint:fix     # Lint and auto-fix
npm run format       # Format with Prettier
npm run build        # Full type-check + production build
npm run preview      # Preview production build
```

### Testing

Vitest is configured in package.json scripts but no test files currently exist in the codebase. The testing
infrastructure is ready for:

- `npm run test` - Run tests
- `npm run test:ui` - Run tests with browser UI
- `npm run test:coverage` - Run with coverage report
