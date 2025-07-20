# Architecture.md - SmartWallet AI System Architecture

## Overview

SmartWallet AI is a multi-chain wallet management dashboard with integrated AI chat capabilities. The application follows a modular, component-based architecture using React with TypeScript.

## Technology Stack

### Frontend Core
- **React 18** with TypeScript
- **Vite** - Build tool and dev server
- **React Router v6** - Client-side routing
- **Zustand** - State management (lightweight alternative to Redux)
- **TanStack Query** - Server state management and caching

### Styling & UI
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Unstyled, accessible component primitives
- **Framer Motion** - Animation library
- **React Resizable Panels** - For resizable drawer implementation

### Blockchain Integration
- **Ethers.js v6** - EVM blockchain interaction
- **@solana/web3.js** - Solana blockchain interaction
- **@wagmi/core** - React hooks for EVM
- **WalletConnect** - Multi-chain wallet connection protocol

### AI/LLM Integration
- **OpenRouter API** - LLM gateway
- **Server-Sent Events (SSE)** - For streaming responses
- **Markdown-it** - For rendering AI responses

### Security & Storage
- **CryptoJS** - Encryption/decryption
- **IndexedDB** - Secure client-side storage via Dexie.js
- **Web Crypto API** - Native browser cryptography

### Development Tools
- **TypeScript 5.x**
- **ESLint** - Linting
- **Prettier** - Code formatting
- **Vitest** - Unit testing
- **Playwright** - E2E testing

## Architecture Patterns

### 1. Layered Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Presentation Layer                       │
│  (React Components, Hooks, UI Logic)                        │
├─────────────────────────────────────────────────────────────┤
│                     Application Layer                        │
│  (Business Logic, State Management, Services)               │
├─────────────────────────────────────────────────────────────┤
│                     Domain Layer                             │
│  (Entities, Value Objects, Domain Services)                 │
├─────────────────────────────────────────────────────────────┤
│                     Infrastructure Layer                     │
│  (External APIs, Blockchain RPCs, Storage)                  │
└─────────────────────────────────────────────────────────────┘
```

### 2. Component Architecture

```
src/
├── components/          # Reusable UI components
│   ├── common/         # Shared components
│   ├── wallet/         # Wallet-specific components
│   ├── chat/           # Chat interface components
│   └── layout/         # Layout components
├── features/           # Feature-based modules
│   ├── wallet-management/
│   ├── chat/
│   └── settings/
├── hooks/              # Custom React hooks
├── services/           # External service integrations
│   ├── blockchain/     # Blockchain interactions
│   ├── ai/            # OpenRouter integration
│   └── storage/       # Persistence layer
├── store/              # Zustand stores
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
└── lib/                # Third-party library configurations
```

### 3. State Management Architecture

```typescript
// Global State Structure
interface AppState {
  // Wallet State
  wallets: {
    items: Wallet[]
    activeWalletId: string | null
    activeNetwork: Network
  }
  
  // Chat State
  chat: {
    conversations: Conversation[]
    activeConversationId: string | null
    messages: Map<string, Message[]>
  }
  
  // UI State
  ui: {
    walletDrawerOpen: boolean
    walletDrawerWidth: number
    theme: 'light' | 'dark'
    pendingTransactions: Transaction[]
  }
  
  // Settings State
  settings: {
    openRouterApiKey: string | null
    selectedModel: string
    autoLockTimeout: number
    defaultNetwork: Network
  }
}
```

### 4. Security Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Security Layers                           │
├─────────────────────────────────────────────────────────────┤
│  1. Encryption Layer                                         │
│     - Private keys encrypted with AES-256                   │
│     - Password-derived encryption keys (PBKDF2)             │
├─────────────────────────────────────────────────────────────┤
│  2. Storage Layer                                            │
│     - IndexedDB for encrypted data                          │
│     - No sensitive data in localStorage                     │
│     - Memory-only for decrypted keys                        │
├─────────────────────────────────────────────────────────────┤
│  3. Session Layer                                            │
│     - Auto-lock on inactivity                               │
│     - Session timeout                                        │
│     - Secure session tokens                                 │
├─────────────────────────────────────────────────────────────┤
│  4. Communication Layer                                      │
│     - HTTPS only                                            │
│     - CSP headers                                           │
│     - API key encryption                                    │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Wallet Operations Flow
```
User Action → UI Component → Hook → Service → Blockchain RPC
     ↑                                              ↓
     └──────── State Update ← Store ← Response ────┘
```

### 2. Chat Flow
```
User Input → Chat Component → AI Service → OpenRouter API
     ↑                                           ↓
     └──── Message Display ← Store ← SSE Stream ┘
```

### 3. State Synchronization
```
Local State → Zustand Store → Persistence Layer → IndexedDB
     ↑                               ↓
     └──────── Rehydration ← Query ─┘
```

## Module Specifications

### 1. Wallet Management Module
- **Responsibilities**: Wallet creation, import/export, key management
- **Key Classes**: WalletManager, KeyStore, CryptoService
- **Interfaces**: IWallet, IKeyPair, ITransaction

### 2. Network Management Module
- **Responsibilities**: Network configuration, RPC management, chain switching
- **Key Classes**: NetworkManager, RPCProvider, ChainConfig
- **Interfaces**: INetwork, IProvider, IChainConfig

### 3. Chat Module
- **Responsibilities**: Message handling, context management, AI integration
- **Key Classes**: ChatManager, ConversationStore, MessageHandler
- **Interfaces**: IConversation, IMessage, IChatContext

### 4. UI Module
- **Responsibilities**: Component rendering, user interactions, responsive design
- **Key Components**: WalletDrawer, ChatInterface, MessageList
- **Hooks**: useWallet, useChat, useResizable

## Performance Considerations

1. **Code Splitting**: Lazy load features and heavy dependencies
2. **Virtual Scrolling**: For chat messages and wallet lists
3. **Memoization**: React.memo for expensive components
4. **Debouncing**: For search and filter operations
5. **Caching**: TanStack Query for API responses
6. **Web Workers**: For cryptographic operations

## Security Considerations

1. **Never store private keys in plain text**
2. **Use Web Crypto API for all cryptographic operations**
3. **Implement CSP headers in production**
4. **Sanitize all user inputs**
5. **Use secure random number generation**
6. **Implement rate limiting for API calls**
7. **Regular security audits of dependencies**

## Deployment Architecture

```
┌─────────────────────────┐
│   CDN (Static Assets)   │
├─────────────────────────┤
│   Web Application       │
│   (React SPA)          │
├─────────────────────────┤
│   External Services     │
│   - Blockchain RPCs     │
│   - OpenRouter API      │
└─────────────────────────┘
```

## Future Extensibility

1. **Plugin System**: For adding new blockchain networks
2. **Theme System**: For custom UI themes
3. **Extension API**: For browser extension integration
4. **Mobile Bridge**: For mobile app connectivity
5. **Hardware Wallet Support**: Ledger/Trezor integration

## Development Workflow

1. **Feature Development**: Feature branch → PR → Review → Merge
2. **Testing**: Unit tests → Integration tests → E2E tests
3. **Build Pipeline**: Lint → Type Check → Test → Build → Deploy
4. **Monitoring**: Error tracking, performance monitoring, analytics

---

Last Updated: 2025-07-20