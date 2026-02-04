# Token Research Skill

This skill teaches you how to perform comprehensive OSINT research on new token launches, particularly for the
Moltbook/Clanker meta on Base.

## Overview

When a user provides a contract address, perform deep research to evaluate the token's legitimacy and risk level. Your
goal is to help users make informed decisions about whether to "ape" (buy) or "fade" (pass) on a token.

## Research Methodology

### 1. Token Identification

First, identify basic token information:

- Token name and symbol
- Contract address and network
- Launch date/time
- Current price and market cap
- 24h volume and price change

**Data Sources:**

- DexScreener: `https://dexscreener.com/base/{contract_address}`
- Basescan: `https://basescan.org/token/{contract_address}`

### 2. Developer Identification (Critical)

Trace the deployer wallet to identify the developer:

1. **Find Deployer Address**
    - Check the contract creation transaction on Basescan
    - Note the "From" address - this is the deployer

2. **Check ENS/Basename**
    - Look for any ENS name associated with the deployer
    - Search Basescan for the wallet's basename

3. **Link to Social Identity**
    - Search the deployer address on Arkham Intel: `https://platform.arkhamintelligence.com/explorer/address/{address}`
    - Look for Twitter/X links
    - Search the address on Twitter directly

4. **Evaluate Developer Credibility**
    - Check Twitter followers count
    - Look up Moni score (KOL metric): Search their handle on Moni
    - Check if they're followed by notable CT accounts
    - Are they doxxed? (real name, LinkedIn, etc.)
    - Previous projects they've built

### 3. Holder Distribution Analysis

Analyze the token distribution:

1. **Top Holders**
    - Check Basescan holders tab
    - Calculate top 10 holder percentage
    - Calculate top 20 holder percentage
    - Identify if any wallets are exchanges or known entities

2. **Deployer Holdings**
    - What percentage does deployer still hold?
    - Is it locked? Check liquidity lock platforms:
        - Uncx: `https://uncx.network/`
        - Team Finance: `https://team.finance/`
    - Lock duration if applicable

3. **Bot/Sniper Detection**
    - Look for suspicious buying patterns in early blocks
    - Check if top holders bought in the same block
    - Identify bundled transactions

### 4. Liquidity Analysis

1. **Liquidity Depth**
    - Total liquidity in USD
    - Main trading pairs
    - DEX where liquidity is concentrated

2. **Liquidity Lock Status**
    - Is LP locked?
    - Lock platform and duration
    - Unlock date

### 5. Risk Assessment

Rate the token using this color system:

- 🟩 **Green (Low Risk)**: Doxxed dev with good track record, healthy distribution, locked liquidity, strong community
- 🟧 **Orange (Caution)**: Some concerns but tradeable - anonymous dev with some credibility, moderate concentration,
  partial locks
- 🟨 **Yellow (Risky)**: Multiple red flags - new anonymous dev, high concentration, unlocked liquidity, bot activity
- 🟥 **Red (High Risk)**: Avoid - honeypot indicators, rug history, extreme concentration, no liquidity lock

## Output Format

Structure your research response as JSON:

```json
{
  "type": "research_complete",
  "payload": {
    "researchId": "research_xxx",
    "research": {
      "id": "research_xxx",
      "contractAddress": "0x...",
      "network": "base",
      "tokenName": "Token Name",
      "tokenSymbol": "TKN",
      "marketCap": 1500000,
      "price": 0.0015,
      "priceChange24h": 25.5,
      "volume24h": 500000,
      "developer": {
        "deployerAddress": "0x...",
        "ensName": "dev.eth",
        "twitterHandle": "devhandle",
        "twitterFollowers": 15000,
        "moniScore": 850,
        "isDoxxed": true,
        "previousProjects": [
          "Project A",
          "Project B"
        ],
        "notableFollowers": [
          "@crypto_whale",
          "@degen_trader"
        ]
      },
      "holderDistribution": {
        "totalHolders": 1500,
        "top10Percentage": 35,
        "top20Percentage": 45,
        "top50Percentage": 60,
        "hasBotWarnings": false,
        "hasSnipersDetected": true,
        "deployerHoldingsPercentage": 5,
        "isDeployerHoldingsLocked": true,
        "lockDuration": "6 months"
      },
      "liquidity": {
        "totalLiquidityUsd": 250000,
        "isLiquidityLocked": true,
        "lockPlatform": "Uncx",
        "lockExpiry": "2025-06-01T00:00:00Z",
        "liquidityPairs": [
          {
            "token": "WETH",
            "dex": "Uniswap V3",
            "liquidityUsd": 250000
          }
        ]
      },
      "pros": [
        "Doxxed developer with strong track record",
        "Liquidity locked for 6 months",
        "Healthy holder distribution",
        "Active community on Twitter"
      ],
      "cons": [
        "Some sniper activity detected at launch",
        "Relatively new project"
      ],
      "rating": "green",
      "timestamp": "2025-02-04T00:00:00Z",
      "sources": [
        {
          "name": "basescan",
          "url": "https://basescan.org/token/0x...",
          "label": "Basescan",
          "timestamp": "2025-02-04T00:00:00Z"
        },
        {
          "name": "dexscreener",
          "url": "https://dexscreener.com/base/0x...",
          "label": "DexScreener",
          "timestamp": "2025-02-04T00:00:00Z"
        },
        {
          "name": "arkham",
          "url": "https://platform.arkhamintelligence.com/...",
          "label": "Arkham Intel",
          "timestamp": "2025-02-04T00:00:00Z"
        },
        {
          "name": "twitter",
          "url": "https://twitter.com/devhandle",
          "label": "Twitter",
          "timestamp": "2025-02-04T00:00:00Z"
        }
      ],
      "status": "completed"
    }
  }
}
```

## Progress Updates

While researching, send progress updates:

```json
{
  "type": "research_update",
  "payload": {
    "researchId": "research_xxx",
    "status": "researching",
    "progress": 25,
    "currentStep": "Analyzing holder distribution..."
  }
}
```

Progress steps:

- 0-10%: Fetching token info
- 10-30%: Identifying developer
- 30-50%: Analyzing holder distribution
- 50-70%: Checking liquidity
- 70-90%: Evaluating risk factors
- 90-100%: Compiling final report

## Key Principles

1. **Be Thorough**: Check multiple sources, don't rely on single data point
2. **Be Objective**: Present facts without bias, let user decide
3. **Cite Sources**: Always include URLs for verification
4. **Highlight Red Flags**: Make risks clearly visible
5. **Be Timely**: New token launches move fast, research quickly but accurately

## Example Prompts

User might ask:

- "Research 0x1234..." - Full research on contract
- "What do you think about $TOKEN?" - Research by symbol (search for contract first)
- "Is this safe?" - Risk assessment
- "Tell me about the dev" - Developer deep dive
- "Check the holders" - Distribution analysis

## Browser Tools

When using browser control for OSINT:

- Navigate to block explorers for on-chain data
- Check Twitter profiles and follower lists
- Search Arkham Intel for wallet labels
- Verify liquidity locks on Uncx/Team Finance
- Screenshot relevant findings for evidence

Remember: Your research directly impacts trading decisions. Be accurate and comprehensive.
