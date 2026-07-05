/**
 * Code by Xipzer
 *
 * Bridges the existing Kybera action registry (TOOL_DEFINITIONS + executeAction)
 * into the provider-agnostic LLMTool format used by the agent loop. Handlers,
 * risk levels, and confirmation requirements are reused unchanged.
 */

import { TOOL_DEFINITIONS, getToolDefinition } from '../agentActions'
import type { LLMTool } from './types'

export function getLLMTools(): LLMTool[] {
  return TOOL_DEFINITIONS.map((t) => ({
    name: t.name,
    description: t.description,
    parameters: {
      type: 'object',
      properties: t.parameters.properties,
      required: t.parameters.required,
    },
  }))
}

export function toolRequiresConfirmation(name: string): boolean {
  return getToolDefinition(name)?.requiresConfirmation ?? false
}

export { getToolDefinition }
