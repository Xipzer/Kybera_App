import { ChevronDown } from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useSettingsStore } from '../../store/settingsStore'

const AVAILABLE_MODELS = [
  { id: 'openai/gpt-4-turbo-preview', name: 'GPT-4 Turbo', provider: 'OpenAI' },
  { id: 'openai/gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'OpenAI' },
  { id: 'anthropic/claude-3-opus', name: 'Claude 3 Opus', provider: 'Anthropic' },
  { id: 'anthropic/claude-3-sonnet', name: 'Claude 3 Sonnet', provider: 'Anthropic' },
  { id: 'google/gemini-pro', name: 'Gemini Pro', provider: 'Google' },
  { id: 'meta-llama/llama-2-70b-chat', name: 'Llama 2 70B', provider: 'Meta' },
]

export function ModelSelector() {
  const { selectedModel, setSelectedModel } = useSettingsStore()
  const currentModel = AVAILABLE_MODELS.find((m) => m.id === selectedModel) || AVAILABLE_MODELS[0]

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="flex items-center gap-2 px-3 py-1.5 text-sm bg-surface-elevated rounded-lg hover:bg-surface-hover transition-colors">
          <span className="text-text-primary">{currentModel.name}</span>
          <ChevronDown className="w-4 h-4 text-text-secondary" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="min-w-[200px] bg-surface-base rounded-lg shadow-lg border border-border-subtle p-1"
          sideOffset={5}
        >
          {AVAILABLE_MODELS.map((model) => (
            <DropdownMenu.Item
              key={model.id}
              onClick={() => setSelectedModel(model.id)}
              className={`flex items-center justify-between px-3 py-2 text-sm rounded cursor-pointer transition-colors ${
                model.id === selectedModel
                  ? 'bg-accent-500/10 text-accent-500'
                  : 'text-text-primary hover:bg-surface-hover'
              }`}
            >
              <span>{model.name}</span>
              <span className="text-xs text-text-tertiary">{model.provider}</span>
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}