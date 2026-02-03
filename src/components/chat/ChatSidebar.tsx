import { Edit2, MessageSquare, MoreVertical, Pin, SquarePen, Trash2, Sparkles } from 'lucide-react'
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

  // Get chat sidebar theme styles
  const styles = theme.styles.chatSidebar

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
          className={`p-2.5 rounded-xl bg-gradient-to-r ${styles.newChatGradient} shadow-lg ${styles.newChatShadow} hover:scale-105 active:scale-95 transition-all duration-200`}
          title="New Chat"
        >
          <SquarePen className="w-4 h-4 text-white" />
        </button>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col panel-content-fade">
      {/* Header */}
      <div className={`p-4 ${styles.headerBg} border-b ${styles.headerBorder}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg bg-gradient-to-r ${styles.newChatGradient}`}>
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-text-primary">Chats</h2>
          </div>
        </div>

        {/* New Chat button with gradient */}
        <button onClick={handleNewChat} className={`relative w-full group overflow-hidden`}>
          <div
            className={`flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r ${styles.newChatGradient} rounded-xl font-medium text-white shadow-lg ${styles.newChatShadow} transition-all duration-300 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]`}
          >
            <Sparkles className="w-4 h-4" />
            <span>New Chat</span>
          </div>
        </button>
      </div>

      {/* Conversation list */}
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
          <div className="space-y-1.5">
            {sortedConversations.map((conversation) => {
              const isActive = conversation.id === activeConversationId

              return (
                <div
                  key={conversation.id}
                  onClick={() => setActiveConversation(conversation.id)}
                  className={`group relative flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-200 border ${
                    isActive
                      ? `${styles.activeCardBg} ${styles.activeCardBorder} shadow-lg ${styles.activeCardGlow}`
                      : `${styles.hoverCardBg} ${styles.cardBorder} hover:border-white/10`
                  }`}
                >
                  {/* Active indicator line */}
                  {isActive && (
                    <div
                      className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full bg-gradient-to-b ${styles.newChatGradient}`}
                    />
                  )}

                  <div className="flex items-center gap-3 min-w-0 pl-1">
                    {/* Icon with conditional styling */}
                    <div
                      className={`flex-shrink-0 p-1.5 rounded-lg transition-colors ${
                        isActive ? `bg-gradient-to-r ${styles.newChatGradient}` : 'bg-surface-hover'
                      }`}
                    >
                      {conversation.pinned ? (
                        <Pin
                          className={`w-3.5 h-3.5 ${isActive ? 'text-white' : styles.iconActive}`}
                        />
                      ) : (
                        <MessageSquare
                          className={`w-3.5 h-3.5 ${isActive ? 'text-white' : styles.iconDefault}`}
                        />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
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
                          className={`w-full px-2 py-1 text-sm ${styles.inputBg} border ${styles.inputBorder} rounded-lg focus:outline-none focus:ring-2 ${styles.inputFocus} text-text-primary transition-all`}
                          autoFocus
                        />
                      ) : (
                        <>
                          <p className="text-sm font-medium truncate text-text-primary">
                            {conversation.title}
                          </p>
                          <p className="text-xs text-text-tertiary mt-0.5">
                            {conversation.messages.length} messages
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Dropdown menu - using theme styles */}
                  <DropdownMenu.Root>
                    <DropdownMenu.Trigger asChild>
                      <button
                        onClick={(e) => e.stopPropagation()}
                        className={`p-1.5 rounded-lg opacity-0 group-hover:opacity-100 ${theme.styles.buttonIcon} transition-all duration-200 hover:scale-105`}
                      >
                        <MoreVertical className="w-4 h-4 text-text-secondary" />
                      </button>
                    </DropdownMenu.Trigger>

                    <DropdownMenu.Portal>
                      <DropdownMenu.Content
                        className={theme.styles.dropdown.content}
                        sideOffset={5}
                      >
                        <DropdownMenu.Item
                          onClick={(e) => {
                            e.stopPropagation()
                            startRename(conversation.id, conversation.title)
                          }}
                          className={`${theme.styles.dropdown.item} ${theme.styles.dropdown.itemHover}`}
                        >
                          <Edit2 className="w-4 h-4" />
                          Rename
                        </DropdownMenu.Item>

                        <DropdownMenu.Item
                          onClick={(e) => {
                            e.stopPropagation()
                            handlePin(conversation.id, conversation.pinned || false)
                          }}
                          className={`${theme.styles.dropdown.item} ${theme.styles.dropdown.itemHover}`}
                        >
                          <Pin className="w-4 h-4" />
                          {conversation.pinned ? 'Unpin' : 'Pin'}
                        </DropdownMenu.Item>

                        <DropdownMenu.Separator className={theme.styles.dropdown.separator} />

                        <DropdownMenu.Item
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteChat(conversation.id)
                          }}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-accent hover:bg-accent/10 rounded cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </DropdownMenu.Item>
                      </DropdownMenu.Content>
                    </DropdownMenu.Portal>
                  </DropdownMenu.Root>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
