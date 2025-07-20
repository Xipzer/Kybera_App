import { Plus, MessageSquare, Trash2 } from 'lucide-react'
import { useChatStore } from '../../store/chatStore'
import * as ScrollArea from '@radix-ui/react-scroll-area'
import { EmptyState } from '../common/EmptyState'

export function ChatSidebar() {
  const { conversations, activeConversationId, createConversation, deleteConversation, setActiveConversation } = useChatStore()

  const handleNewChat = async () => {
    await createConversation()
  }

  const handleDeleteChat = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await deleteConversation(id)
  }

  return (
    <div className="h-full bg-surface-base border-r border-border-subtle flex flex-col">
      <div className="p-4 border-b border-border-subtle">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Chats</h2>
        
        <button
          onClick={handleNewChat}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gradient-primary text-white rounded-lg hover:shadow-lg hover:primary-glow transition-all duration-300 font-medium"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </button>
      </div>

      <ScrollArea.Root className="flex-1">
        <ScrollArea.Viewport className="h-full w-full p-2">
          {conversations.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title="No conversations"
              description="Start a new chat to begin"
              action={{
                label: "New Chat",
                onClick: handleNewChat
              }}
              className="h-full"
            />
          ) : (
            <div className="space-y-1">
              {conversations.map((conversation) => (
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
                  <MessageSquare className="w-4 h-4 text-text-secondary flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {conversation.title}
                    </p>
                    <p className="text-xs text-text-tertiary">
                      {conversation.messages.length} messages
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={(e) => handleDeleteChat(conversation.id, e)}
                  className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-surface-hover transition-all"
                >
                  <Trash2 className="w-4 h-4 text-text-secondary" />
                </button>
              </div>
            ))}
            </div>
          )}
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar
          className="flex select-none touch-none p-0.5 bg-surface-elevated transition-colors duration-[160ms] ease-out hover:bg-surface-hover data-[orientation=vertical]:w-2.5 data-[orientation=horizontal]:flex-col data-[orientation=horizontal]:h-2.5"
          orientation="vertical"
        >
          <ScrollArea.Thumb className="flex-1 bg-border-default rounded-[10px] relative before:content-[''] before:absolute before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:w-full before:h-full before:min-w-[44px] before:min-h-[44px]" />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>
    </div>
  )
}