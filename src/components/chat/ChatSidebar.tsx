import { Edit2, MessageSquare, MoreVertical, Pin, SquarePen, Trash2 } from 'lucide-react'
import { useChatStore } from '../../store/chatStore'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { EmptyState } from '../common/EmptyState'
import { useState } from 'react'
import { useTheme } from '../../hooks/useTheme'

interface ChatSidebarProps {
  collapsed?: boolean
}

export function ChatSidebar({ collapsed }: ChatSidebarProps) {
  const {
    conversations,
    activeConversationId,
    createConversation,
    deleteConversation,
    setActiveConversation,
    updateConversation,
  } = useChatStore()
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const { theme } = useTheme()

  const handleNewChat = async () => {
    await createConversation()
  }

  const handleDeleteChat = async (id: string) => {
    await deleteConversation(id)
  }

  const handleRename = async (id: string) => {
    if (renameValue.trim()) {
      await updateConversation(id, { title: renameValue.trim() })
      setRenamingId(null)
      setRenameValue('')
    }
  }

  const handlePin = async (id: string, currentPinned: boolean) => {
    await updateConversation(id, { pinned: !currentPinned })
  }

  const startRename = (id: string, currentTitle: string) => {
    setRenamingId(id)
    setRenameValue(currentTitle)
  }

  // Sort conversations: pinned first, then by date
  const sortedConversations = [...conversations].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1
    if (!a.pinned && b.pinned) return 1
    return b.updatedAt.getTime() - a.updatedAt.getTime()
  })

  if (collapsed) {
    return (
      <div className="h-full w-full border-r border-border-subtle flex flex-col items-center justify-start py-4 gap-4 panel-content-fade">
        <button
          onClick={handleNewChat}
          className="p-1 rounded hover:bg-surface-hover transition-all"
          title="New Chat"
        >
          <SquarePen className="w-5 h-5 text-accent hover:text-accent-400 transition-colors" />
        </button>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col panel-content-fade">
      <div className="p-4 border-b border-border-subtle">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text-primary">Chats</h2>
        </div>

        <button
          onClick={handleNewChat}
          className={`w-full flex items-center justify-center gap-2 px-3 py-2 ${theme.styles.buttonPrimary}`}
          style={theme.dynamicStyles.buttonPrimary}
        >
          <SquarePen className="w-4 h-4" />
          New Chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {conversations.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="No conversations"
            description="Start a new chat to begin"
            action={{
              label: 'New Chat',
              onClick: handleNewChat,
            }}
            className="h-full"
          />
        ) : (
          <div className="space-y-1">
            {sortedConversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => setActiveConversation(conversation.id)}
                className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                  conversation.id === activeConversationId
                    ? 'bg-accent/10 border border-accent/30'
                    : 'hover:bg-surface-hover'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {conversation.pinned ? (
                    <Pin className="w-4 h-4 text-accent flex-shrink-0" />
                  ) : (
                    <MessageSquare className="w-4 h-4 text-text-secondary flex-shrink-0" />
                  )}
                  <div className="min-w-0">
                    {renamingId === conversation.id ? (
                      <input
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={() => handleRename(conversation.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleRename(conversation.id)
                          } else if (e.key === 'Escape') {
                            setRenamingId(null)
                            setRenameValue('')
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full px-1 py-0.5 text-sm bg-surface-elevated border border-border-default rounded focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
                        autoFocus
                      />
                    ) : (
                      <p className="text-sm font-medium text-text-primary truncate">
                        {conversation.title}
                      </p>
                    )}
                    <p className="text-xs text-text-tertiary">
                      {conversation.messages.length} messages
                    </p>
                  </div>
                </div>

                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <button
                      onClick={(e) => e.stopPropagation()}
                      className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-surface-hover transition-all"
                    >
                      <MoreVertical className="w-4 h-4 text-text-secondary" />
                    </button>
                  </DropdownMenu.Trigger>

                  <DropdownMenu.Portal>
                    <DropdownMenu.Content
                      className="min-w-[160px] bg-surface-base rounded-lg shadow-lg border border-border-subtle p-1 z-50"
                      sideOffset={5}
                    >
                      <DropdownMenu.Item
                        onClick={(e) => {
                          e.stopPropagation()
                          startRename(conversation.id, conversation.title)
                        }}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-surface-hover rounded cursor-pointer"
                      >
                        <Edit2 className="w-4 h-4" />
                        Rename
                      </DropdownMenu.Item>

                      <DropdownMenu.Item
                        onClick={(e) => {
                          e.stopPropagation()
                          handlePin(conversation.id, conversation.pinned || false)
                        }}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-surface-hover rounded cursor-pointer"
                      >
                        <Pin className="w-4 h-4" />
                        {conversation.pinned ? 'Unpin' : 'Pin'}
                      </DropdownMenu.Item>

                      <DropdownMenu.Separator className="h-px bg-border-subtle my-1" />

                      <DropdownMenu.Item
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteChat(conversation.id)
                        }}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-accent hover:bg-accent/10 rounded cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}