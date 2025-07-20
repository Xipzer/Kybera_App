import { User, Bot } from 'lucide-react'
import { Message } from '../../types'
import MarkdownIt from 'markdown-it'
import { useMemo } from 'react'

const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
})

interface ChatMessageProps {
  message: Message
}

export function ChatMessage({ message }: ChatMessageProps) {
  const renderedContent = useMemo(() => {
    return message.role === 'assistant'
      ? md.render(message.content)
      : message.content
  }, [message.content, message.role])

  return (
    <div className={`flex gap-4 mb-6 ${message.role === 'user' ? 'justify-end' : ''}`}>
      {message.role === 'assistant' && (
        <div className="flex-shrink-0 w-8 h-8 bg-gradient-candy-red rounded-lg flex items-center justify-center candy-red-glow">
          <Bot className="w-5 h-5 text-white" />
        </div>
      )}
      
      <div
        className={`max-w-[70%] ${
          message.role === 'user'
            ? 'bg-surface-hover rounded-lg px-4 py-2'
            : ''
        }`}
      >
        {message.role === 'assistant' ? (
          <div
            className="prose prose-sm dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: renderedContent }}
          />
        ) : (
          <p className="text-text-primary whitespace-pre-wrap">{message.content}</p>
        )}
        <p className="text-xs text-text-tertiary mt-1">
          {new Date(message.timestamp).toLocaleTimeString()}
        </p>
      </div>

      {message.role === 'user' && (
        <div className="flex-shrink-0 w-8 h-8 bg-primary-800 rounded-lg flex items-center justify-center">
          <User className="w-5 h-5 text-white" />
        </div>
      )}
    </div>
  )
}