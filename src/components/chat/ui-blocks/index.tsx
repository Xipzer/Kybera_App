/**
 * Code by Xipzer
 *
 * UI Block Router — Parses ```kybera-ui fenced blocks from agent responses
 * and routes them to dedicated React components for structured rendering.
 */

import type {
  KyberaUiBlock,
  KyberaUiBlockType,
  TokenSummaryBlock,
  WalletOverviewBlock,
  SwapPreviewBlock,
  SecurityReportBlock,
  RiskWarningBlock,
  YieldSummaryBlock,
} from '../../../types/research'
import { TokenSummaryCard } from './TokenSummaryCard'
import { WalletOverviewCard } from './WalletOverviewCard'
import { SwapPreviewCard } from './SwapPreviewCard'
import { SecurityReportCard } from './SecurityReportCard'
import { RiskWarningCard } from './RiskWarningCard'
import { YieldSummaryCard } from './YieldSummaryCard'

// ─── Parser ─────────────────────────────────────────────────────────────────

const UI_BLOCK_REGEX = /```kybera-ui\s*([\s\S]*?)```/g

const VALID_TYPES = new Set<KyberaUiBlockType>([
  'token_summary',
  'wallet_overview',
  'swap_preview',
  'security_report',
  'risk_warning',
  'yield_summary',
])

/**
 * Extract all ```kybera-ui blocks from the agent's response text.
 * Returns parsed KyberaUiBlock objects; silently skips malformed blocks.
 */
export function parseUiBlocks(text: string): KyberaUiBlock[] {
  const blocks: KyberaUiBlock[] = []

  // Reset regex state for each call
  UI_BLOCK_REGEX.lastIndex = 0
  let match

  while ((match = UI_BLOCK_REGEX.exec(text)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim())
      if (parsed.type && VALID_TYPES.has(parsed.type as KyberaUiBlockType) && parsed.data) {
        blocks.push(parsed as KyberaUiBlock)
      }
    } catch {
      // Malformed JSON — skip silently.
      continue
    }
  }

  return blocks
}

/**
 * Strip ```kybera-ui blocks from text for prose display.
 */
export function stripUiBlocks(text: string): string {
  return text
    .replace(/```kybera-ui\s*[\s\S]*?```/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * Strip ```json action blocks from text for prose display.
 */
export function stripJsonActionBlocks(text: string): string {
  return text
    .replace(/```json\s*\{[\s\S]*?\}\s*```/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// ─── Renderer ───────────────────────────────────────────────────────────────

export function UiBlockCard({ block }: { block: KyberaUiBlock }) {
  switch (block.type) {
    case 'token_summary':
      return <TokenSummaryCard block={block as TokenSummaryBlock} />
    case 'wallet_overview':
      return <WalletOverviewCard block={block as WalletOverviewBlock} />
    case 'swap_preview':
      return <SwapPreviewCard block={block as SwapPreviewBlock} />
    case 'security_report':
      return <SecurityReportCard block={block as SecurityReportBlock} />
    case 'risk_warning':
      return <RiskWarningCard block={block as RiskWarningBlock} />
    case 'yield_summary':
      return <YieldSummaryCard block={block as YieldSummaryBlock} />
    default:
      return null
  }
}
