# Kybera

A multi-chain cryptocurrency wallet that runs entirely in your browser. Manage wallets across Ethereum, Solana, and
other chains, swap and bridge tokens, and use an AI-powered research agent to investigate new token launches before you
buy.

No backend server. No accounts. No data leaves your browser unless you're talking to a blockchain or the AI agent.

---

## What It Does

**Wallet management** across 8 blockchain networks (Ethereum, Base, BSC, Polygon, Arbitrum, Optimism, Solana Mainnet,
Solana Devnet). Create wallets from seed phrases, import existing ones, organize them into groups, and view balances
across all chains at once.

**Token operations** including sending native tokens and ERC-20/SPL tokens, swapping via Jupiter (Solana) and
KyberSwap (
EVM), and cross-chain bridging via relay.link.

**AI-powered token research** through OpenClaw, a locally-hosted AI agent. Paste a contract address and get deep OSINT
analysis: developer identity, holder distribution, liquidity analysis, and a risk rating (SAFE / POTENTIAL / HIGH RISK /
AVOID). Then decide to ape in or fade.

**Security-first design** with AES-256 encrypted keys, PBKDF2 password hashing, automatic memory wiping, auto-lock on
inactivity, and browser extension/XSS detection.

---

## Supported Networks

| Network         | Type | Chain ID |
|-----------------|------|----------|
| Ethereum        | EVM  | 1        |
| Base            | EVM  | 8453     |
| BNB Smart Chain | EVM  | 56       |
| Polygon         | EVM  | 137      |
| Arbitrum        | EVM  | 42161    |
| Optimism        | EVM  | 10       |
| Solana Mainnet  | SVM  | -        |
| Solana Devnet   | SVM  | -        |

You can also add custom networks through the settings.

---

## Getting Started

### Prerequisites

- **Node.js 18+**
- **npm** (comes with Node.js)

### Installation

```bash
# Clone the repo
git clone <repo-url>
cd SmartWallet_AI

# Install dependencies
npm install

# Copy environment variables (optional - the app works without them)
cp .env.example .env

# Start the dev server
npm run dev
```

The app will be available at `http://localhost:5173`.

### First Launch

1. You'll be asked to create a password. This password encrypts all your wallet data locally.
2. Create a new wallet group (generates a BIP-39 seed phrase) or import an existing wallet.
3. Start using the wallet - send tokens, check balances, or research new tokens.

---

## API Keys

All keys are **optional**. Each can be set via `.env` or at runtime in **Settings > Config > API Keys** (runtime takes
precedence).

| Variable                 | Purpose                                      | Required For                        |
|--------------------------|----------------------------------------------|-------------------------------------|
| `VITE_ALCHEMY_API_KEY`   | Token discovery and enhanced blockchain data | EVM token auto-discovery            |
| `VITE_HELIUS_API_KEY`    | Solana RPC (Helius)                          | Solana token discovery and balances |
| `VITE_COINGECKO_API_KEY` | Token prices (CoinGecko Demo key)            | Optional, free tier works without   |

OpenClaw keys are configured only through the in-app settings panel (not `.env`).

### Getting Free Keys

**Alchemy** (EVM token discovery)

1. Sign up at [alchemy.com](https://www.alchemy.com/)
2. Create a new app for any EVM network
3. Copy the API key from the app dashboard

**Helius** (Solana RPC)

1. Sign up at [helius.dev](https://www.helius.dev/)
2. Create a new project
3. Copy the API key from your project settings

**CoinGecko** (token prices — optional, free tier works without a key)

1. Go to [coingecko.com/en/api/pricing](https://www.coingecko.com/en/api/pricing)
2. Sign up for the free Demo plan
3. Copy your API key from the developer dashboard

---

## Available Scripts

| Command                | What it does                         |
|------------------------|--------------------------------------|
| `npm run dev`          | Start the development server         |
| `npm run build`        | Type-check and build for production  |
| `npm run preview`      | Preview the production build locally |
| `npm run lint`         | Run ESLint                           |
| `npm run lint:fix`     | Run ESLint and auto-fix issues       |
| `npm run format`       | Format code with Prettier            |
| `npm run format:check` | Check if code is formatted correctly |
| `npm run typecheck`    | Run TypeScript type checking only    |
| `npm run test`         | Run tests with Vitest                |

---

## Tech Stack

| Category          | Technology                           |
|-------------------|--------------------------------------|
| Framework         | React 18 + TypeScript 5.6            |
| Build Tool        | Vite 6                               |
| State Management  | Zustand 5 (with persist middleware)  |
| Server State      | TanStack Query 5                     |
| Styling           | Tailwind CSS 3 + Radix UI primitives |
| Animations        | Framer Motion                        |
| EVM Blockchain    | ethers.js v6                         |
| Solana Blockchain | @solana/web3.js + @solana/spl-token  |
| AI Integration    | OpenClaw Gateway (WebSocket)         |
| Database          | Dexie.js (IndexedDB)                 |
| Encryption        | CryptoJS (AES-256) + PBKDF2          |
| Routing           | React Router v7                      |

---

## Key Features in Detail

### Wallet Groups and HD Derivation

Wallets are organized into **groups**. Each group is backed by a BIP-39 seed phrase, and individual wallets are derived
using BIP-44 paths:

- EVM wallets: `m/44'/60'/0'/0/{index}`
- Solana wallets: `m/44'/501'/{index}'/0'`

You can also import standalone wallets via private key. Groups and wallets support drag-and-drop reordering.

### Token Swaps and Bridging

- **Solana swaps** go through the Jupiter aggregator API
- **EVM swaps** go through the KyberSwap Aggregator API (no API key required)
- **Cross-chain bridges** use relay.link (EVM-to-EVM only)

All swap/bridge operations show you a quote before execution and require confirmation.

### AI Token Research (OpenClaw)

OpenClaw is a separate AI agent that connects to Kybera via WebSocket. When you submit a contract address:

1. The app sends a research prompt to OpenClaw with context about the token
2. OpenClaw performs deep research using data from DexScreener, Basescan/Etherscan, and other sources
3. Results stream back in real-time and are parsed into a structured research card
4. The card shows: token info, market data, developer identity, pros/cons, and a risk rating
5. You can "Ape" (buy through the quick-trade interface) or "Fade" (dismiss)

OpenClaw runs locally and must be set up separately. Configure its gateway URL and auth token in the app settings.

### AI Action System

The AI assistant can execute 18 different actions on your behalf, organized by category:

- **Wallet**: Create wallets, list wallets, switch active wallet, check balances, create groups
- **Network**: Switch networks, list available networks
- **Transfers**: Send native tokens, send ERC-20/SPL tokens, estimate gas
- **Swaps**: Get swap quotes, execute swaps
- **Bridge**: Get bridge quotes, execute cross-chain bridges
- **Queries**: Get token prices, view transaction history, search for tokens

High-risk actions (transfers, swaps, bridges) require your explicit confirmation before executing. You can configure
trusted/blocked actions and set daily transfer limits in the permissions settings.

### Security

- **Encryption**: Private keys and seed phrases are encrypted with AES-256 using your password
- **Password hashing**: PBKDF2 with SHA-256, 100,000 iterations
- **Memory protection**: Decrypted keys are held in memory with automatic wiping (5-minute TTL or 5 accesses, whichever
  comes first). Sensitive values are split with XOR obfuscation.
- **Auto-lock**: The app locks after configurable inactivity, requiring your password to unlock
- **Browser protection**: Content Security Policy headers, DOM monitoring for injected scripts, detection of suspicious
  browser extensions
- **No plaintext secrets**: Private keys are never stored unencrypted. They're decrypted on-demand for signing and wiped
  immediately after.

### Themes

Five built-in themes: **Light**, **Dark**, **Xipz** (dark with red accents), **OG Dark** (cyan/pink neon), and **OG
Light**. You can also set custom wallpapers for the chat and lock screen.

---

## Project Structure

```
src/
  components/        UI components
    chat/            AI chat interface and message rendering
    common/          Shared components (empty states, image upload, etc.)
    layout/          Responsive layout, navigation
    research/        Token research view, research cards, ape interface
    settings/        Settings dialogs and panels
    wallet/          Wallet list, detail view, send/receive dialogs
  hooks/             Custom React hooks
  services/          Core business logic
    api/             External API integrations (CoinGecko, swaps, bridge, rate limiter)
    blockchain/      Blockchain services (EVM, Solana, balance aggregation, providers)
    research/        Token research data sources (DexScreener, Basescan)
    security/        Memory protection and XSS defense
  store/             Zustand state stores
  types/             TypeScript type definitions
  utils/             Encryption, formatting, network definitions
```

---

## Deployment

Deployed to [Render](https://render.com). The production app is available at [app.kybera.xyz](https://app.kybera.xyz).

Kybera is a static single-page application. The production build outputs to `dist/` and can be hosted on any static file
server (Render, Vercel, Netlify, Cloudflare Pages, etc.).

```bash
npm run build
# Deploy the contents of dist/
```

The production build automatically:

- Removes `console.log` and `debugger` statements
- Disables source maps
- Polyfills Node.js globals (Buffer, process) needed by crypto libraries

**Required rewrite rules**: Some external APIs don't support CORS, so requests are proxied through your domain. Your
hosting platform must rewrite these paths:

| Source               | Destination                              | Action  |
|----------------------|------------------------------------------|---------|
| `/api/coingecko/*`   | `https://api.coingecko.com/*`            | Rewrite |
| `/api/polymarket/*`  | `https://gamma-api.polymarket.com/*`     | Rewrite |

On Render Static Sites, add these in **Redirects/Rewrites** settings. On Vercel, add them to `vercel.json` rewrites.

---

## Architecture

For a deep dive into the system design, data flows, database schema, and service layer,
see [Architecture.md](./Architecture.md).

---

## License

MIT License - see [LICENSE](LICENSE) for details.

## Author

Built by [Xipz](https://x.com/Xipzer)
