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
  |-- LLM Provider APIs ........... Anthropic / OpenAI / xAI (direct HTTPS, OAuth or API key)
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
| AI               | In-client LLM harness (Anthropic / OpenAI / xAI) | -           |
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
    useSettingsState.ts            Settings state hook (including API keys)
    useTheme.ts                    Theme application hook
    useTransactionHistory.ts       Transaction history data hook
    useWalletBalance.ts            Single wallet balance hook

  services/
    agentActions.ts                AI action registry (tool definitions + handlers, risk levels)
    database.ts                    Dexie schema (16 tables, single version)
    networkService.ts              Network CRUD, custom networks, visibility
    notificationService.ts         Alert polling and browser push notifications
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
    llm/
      llmService.ts                Public AI service (event emitter consumed by researchStore)
      agent.ts                     In-client agentic tool-calling loop (max 8 turns)
      tools.ts                     Bridges agentActions registry into LLM tool format
      systemPrompt.ts              Kybera system prompt
      types.ts                     Provider-agnostic types (messages, tools, stream events)
      providers/
        anthropic.ts               Anthropic Messages API adapter
        openai-compatible.ts       OpenAI-compatible adapter (OpenAI + xAI/Grok)
        index.ts                   Provider registry
      oauth/
        pkce.ts                    PKCE verifier/challenge generation
        flow.ts                    Authorization-code flow orchestration
        configs.ts                 Per-provider OAuth endpoint configuration
        manager.ts                 Credential storage, retrieval, and token refresh
        types.ts                   OAuth type definitions
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
    researchStore.ts               LLM harness connection, active researches, results
    settingsStore.ts               AI provider/model, API keys, auto-lock timeout
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

**settingsStore** - Stores the selected AI provider and model, API keys (CoinGecko, Alchemy, Helius),
auto-lock timeout, and default network. AI provider/model, API keys, and AI credentials persist to IndexedDB, other
settings to localStorage.

**uiStore** - Controls theme selection, drawer open/width state, chat sidebar visibility, profile picture, wallpapers (
chat + lockscreen with opacity), particle effect settings, wallet detail panel size, and UI defaults with a `resetUI()`
action. Persists to localStorage.

**researchStore** - Manages LLM harness connection state, active research requests, streaming chat messages, and
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

### LLM Harness

The AI backend is a **direct, in-client multi-provider LLM harness** in `src/services/llm/`. There is no external
gateway — the browser talks straight to the provider APIs (Anthropic, OpenAI, xAI/Grok) using OAuth tokens or raw API
keys. `llmService.ts` is the public service the app talks to; it emits the same event surface (`connection_change`,
`chat_message`, `action_requested`, `action_result`, etc.) that `researchStore` consumes, so the UI layer is unchanged.

**Modules**:

- **types.ts** - Provider-agnostic types: normalized messages, tool definitions, stream events, and credentials
- **providers/** - Provider adapters behind a common `ProviderAdapter` interface: `anthropic.ts` (Anthropic Messages
  API) and `openai-compatible.ts` (OpenAI + xAI/Grok), with `index.ts` as the registry
- **oauth/** - PKCE authorization-code flow: `pkce.ts` (verifier/challenge), `flow.ts` (flow orchestration),
  `configs.ts` (per-provider endpoints), `manager.ts` (credential storage + token refresh), `types.ts`
- **agent.ts** - The in-client agentic tool-calling loop (max 8 turns): streams model output, executes requested tools
  locally, feeds results back until the model stops requesting tools
- **tools.ts** - Bridges the existing action registry (`src/services/agentActions.ts`) into the provider-agnostic LLM
  tool format; handlers, risk levels, and confirmation requirements are reused unchanged
- **systemPrompt.ts** - The Kybera system prompt
- **llmService.ts** - The public service (singleton event emitter)

**Authentication**: Two credential kinds per provider, stored per-provider in the IndexedDB `settings` table:

- **OAuth** (Anthropic Claude Pro/Max, OpenAI, xAI) - Authorization-code + PKCE flow. Since the SPA has no backend, the
  redirect lands on a hosted callback page (`public/callback.html`, served at `app.kybera.xyz/callback`) that relays
  the authorization code back to the app. `oauth/manager.ts` persists tokens and refreshes them when expired.
- **API key** - A raw provider key entered in Settings, used directly.

Providers and models are configured in **Settings > AI**.

**Connection flow**:
```
1. User selects a provider and model in Settings
2. researchStore.connect() configures LLMService with { provider, model }
3. LLMService.connect() verifies a usable credential exists (OAuth token or API key)
4. Connection state set to 'connected'; requests go directly to the provider API
```

**Research flow**:
```
1. User enters a contract address in ResearchView
2. researchStore.requestResearch() is called
3. LLMService constructs a research prompt (contract address + network)
   and runs the agent loop with the Kybera system prompt
4. The model streams text deltas and requests tools (DexScreener data,
   token security checks, etc.), which execute locally in the browser
5. Chunks are concatenated and displayed in real-time
6. Final response is parsed to extract:
   - Token name, symbol, market cap, price
   - Risk rating (SAFE / POTENTIAL / HIGH RISK / AVOID)
   - Pros and cons
   - Developer info
7. Structured data displayed as a ResearchCard
```

### Agent Loop

`agent.ts` implements native function calling against the configured provider:

```
1. Send conversation + tool definitions to the provider (streaming)
2. Accumulate text deltas (streamed to the UI) and tool_call events
3. If the model stopped to use tools:
   - Look up each tool in the action registry
   - If it requiresConfirmation: await user approval via ActionConfirmationDialog
   - Execute the handler locally and append the result as a 'tool' message
4. Repeat (max 8 turns) until the model finishes without tool calls
```

Tool calls run entirely in the client. Risky actions (based on their registry risk level) still gate through the
`ActionConfirmationDialog` component, which shows the user exactly what will happen and requires explicit approval.

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
| LLM Providers      | llm/llmService.ts               | HTTP (SSE)     | AI agent (Anthropic / OpenAI / xAI) for research and chat  |

---

## Agent Action System

The AI assistant can execute wallet operations through natural language. This is powered by native LLM tool calling:
the action registry is exposed to the model as function-calling tools, and the agent loop executes them locally.

### Action Registry

`src/services/agentActions.ts` defines the `TOOL_DEFINITIONS` registry: each action has a JSON-schema parameter
definition, a handler function, a risk level (low/medium/high/critical), and a `requiresConfirmation` flag.
`src/services/llm/tools.ts` converts the registry into the provider-agnostic tool format sent to the model.

32 executable actions (including 3 DeFi yield actions from `src/services/defi/yieldActions.ts`), grouped by category:

| Category           | Actions                                                                                                             | Risk           | Confirmation          |
|--------------------|---------------------------------------------------------------------------------------------------------------------|----------------|-----------------------|
| Wallet Management  | create_wallet_group, add_wallets_to_group, rename_wallet, rename_wallet_group, delete_wallet, delete_wallet_group, list_wallets, switch_wallet, get_balance | low - critical | create/delete actions |
| Network            | list_networks, switch_network                                                                                       | low            | no                    |
| Trading            | get_swap_quote                                                                                                      | low            | no                    |
| Token Security     | get_token_security, check_malicious_address                                                                         | low            | no                    |
| Alerts             | create_alert, list_alerts, delete_alert                                                                             | low            | no                    |
| Prediction Markets | search_prediction_markets, get_prediction_market, get_crypto_sentiment                                              | low            | no                    |
| Portfolio          | get_portfolio_pnl, get_trade_history                                                                                | low            | no                    |
| Watchlist          | add_watched_wallet, remove_watched_wallet, list_watched_wallets, get_wallet_activity                                | low            | no                    |
| x402 Payments      | get_x402_status, list_x402_payments                                                                                 | low            | no                    |
| DeFi Yield         | search_yield_opportunities, get_top_yields, get_yield_for_token                                                     | low            | no                    |
| Settings           | get_settings                                                                                                        | low            | no                    |

### Action Execution Flow

```
User: "Create a wallet group called Test with 5 EVM wallets"
  |
  v
LLMService.sendChatMessage()
  |-- Runs the agent loop against the configured provider
  |   (system prompt + conversation + tool definitions)
  |
  v
Model responds with a native tool call:
  |   create_wallet_group({"name": "Test", "evmCount": 5})
  |
  v
agent.ts looks up the tool in TOOL_DEFINITIONS
  |
  v
requiresConfirmation?
  |-- YES: emit 'action_requested' -> show ActionConfirmationDialog
  |        (agent loop awaits the user's approve/reject)
  |-- NO: execute immediately via executeAction(name, params)
  |
  v
Result emitted as 'action_result' -> displayed in chat
  |-- Result also fed back to the model as a 'tool' message
  |   so it can summarize or chain further tools (max 8 turns)
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
