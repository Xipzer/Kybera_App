/**
 * Code by Xipzer
 *
 * Provider registry. Instantiates the adapters and exposes lookup by id.
 */

import type { ProviderAdapter, ProviderId } from '../types'
import { AnthropicAdapter } from './anthropic'
import { OpenAIAdapter } from './openai-codex'
import { OpenAICompatibleAdapter } from './openai-compatible'

// xAI (Grok) has no public OAuth client — API key only.
const xaiAdapter = new OpenAICompatibleAdapter({
  id: 'xai',
  label: 'xAI (Grok)',
  apiUrl: 'https://api.x.ai/v1/chat/completions',
  defaultModel: 'grok-4.3',
  supportsOAuth: false,
  models: [
    { id: 'grok-4.3', label: 'Grok 4.3', contextWindow: 256000 },
    { id: 'grok-4.20-0309-reasoning', label: 'Grok 4.20 (reasoning)', contextWindow: 256000 },
    { id: 'grok-composer-2.5-fast', label: 'Grok Composer 2.5 Fast', contextWindow: 256000 },
  ],
})

const ADAPTERS: Record<ProviderId, ProviderAdapter> = {
  anthropic: new AnthropicAdapter(),
  openai: new OpenAIAdapter(),
  xai: xaiAdapter,
}

export function getAdapter(provider: ProviderId): ProviderAdapter {
  return ADAPTERS[provider]
}

export function listProviders(): ProviderAdapter[] {
  return Object.values(ADAPTERS)
}
