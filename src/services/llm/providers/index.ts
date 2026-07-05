/**
 * Code by Xipzer
 *
 * Provider registry. Instantiates the adapters and exposes lookup by id.
 */

import type { ProviderAdapter, ProviderId } from '../types'
import { AnthropicAdapter } from './anthropic'
import { OpenAICompatibleAdapter } from './openai-compatible'

const openaiAdapter = new OpenAICompatibleAdapter({
  id: 'openai',
  label: 'OpenAI (GPT)',
  apiUrl: 'https://api.openai.com/v1/chat/completions',
  defaultModel: 'gpt-5',
  supportsOAuth: true,
  models: [
    { id: 'gpt-5', label: 'GPT-5', contextWindow: 256000 },
    { id: 'gpt-5-mini', label: 'GPT-5 mini', contextWindow: 256000 },
    { id: 'gpt-4.1', label: 'GPT-4.1', contextWindow: 128000 },
  ],
})

const xaiAdapter = new OpenAICompatibleAdapter({
  id: 'xai',
  label: 'xAI (Grok)',
  apiUrl: 'https://api.x.ai/v1/chat/completions',
  defaultModel: 'grok-4',
  supportsOAuth: true,
  models: [
    { id: 'grok-4', label: 'Grok 4', contextWindow: 256000 },
    { id: 'grok-4-fast', label: 'Grok 4 Fast', contextWindow: 256000 },
    { id: 'grok-3', label: 'Grok 3', contextWindow: 131072 },
  ],
})

const ADAPTERS: Record<ProviderId, ProviderAdapter> = {
  anthropic: new AnthropicAdapter(),
  openai: openaiAdapter,
  xai: xaiAdapter,
}

export function getAdapter(provider: ProviderId): ProviderAdapter {
  return ADAPTERS[provider]
}

export function listProviders(): ProviderAdapter[] {
  return Object.values(ADAPTERS)
}
