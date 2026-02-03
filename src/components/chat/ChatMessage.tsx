import { User, Bot } from 'lucide-react'
import { Message } from '../../types'
import MarkdownIt from 'markdown-it'
import { useMemo } from 'react'
import { useUIStore } from '../../store/uiStore'
import { useTheme } from '../../hooks/useTheme'

const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
})



interface ChatMessageProps {
  message: Message
}

export function ChatMessage({ message }: ChatMessageProps) {
  const { profilePicture } = useUIStore()
  const { theme } = useTheme()

  // Get chat message theme styles
  const styles = theme.styles.chatMessage

  const renderedContent = useMemo(() => {
    return message.role === 'assistant' ? md.render(message.content) : message.content
  }, [message.content, message.role])

  const isUser = message.role === 'user'

  return (
    <div className={`flex gap-3 mb-6 ${isUser ? 'justify-end' : ''}`}>
      {/* Assistant avatar */}
      {!isUser && (
        <div className="flex-shrink-0">
          <div
            className={`w-10 h-10 rounded-xl bg-gradient-to-r ${styles.assistantIconBg} flex items-center justify-center ${styles.assistantIconShadow}`}
          >
            <Bot className="w-5 h-5 text-white" />
          </div>
        </div>
      )}

      {/* Message bubble */}
      <div className={`relative max-w-[75%] group`}>
        {isUser ? (
          // User message bubble
          <div
            className={`${styles.userBubbleBg} ${styles.userBubbleShadow} rounded-2xl rounded-tr-sm px-4 py-3 backdrop-blur-sm`}
          >
            <p className={`${styles.userTextColor} whitespace-pre-wrap leading-relaxed`}>
              {message.content}
            </p>
            <p className={`text-xs ${styles.userTimestamp} mt-1.5 text-right`}>
              {new Date(message.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        ) : (
          // Assistant message bubble
          <div
            className={`${styles.assistantBubbleBg} ${styles.assistantBubbleBorder} ${styles.assistantBubbleShadow} rounded-2xl rounded-tl-sm px-4 py-3 backdrop-blur-sm`}
          >
            <div
              className={`prose prose-sm ${styles.proseClass} max-w-none 
                prose-p:leading-relaxed prose-p:my-2
                prose-headings:font-semibold prose-headings:mt-4 prose-headings:mb-2
                prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:bg-black/10 prose-code:dark:bg-white/10 prose-code:text-sm prose-code:before:content-none prose-code:after:content-none
                prose-pre:bg-black/10 prose-pre:dark:bg-white/5 prose-pre:rounded-xl prose-pre:border prose-pre:border-white/10
                prose-a:text-cyan-400 prose-a:no-underline hover:prose-a:underline
                prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5
                prose-blockquote:border-l-2 prose-blockquote:border-cyan-400 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-text-secondary`}
              dangerouslySetInnerHTML={{ __html: renderedContent }}
            />
            <p className={`text-xs ${styles.assistantTimestamp} mt-2`}>
              {new Date(message.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        )}
      </div>

      {/* User avatar */}
      {isUser && (
        <div className="flex-shrink-0">
          {profilePicture ? (
            <div className={`w-10 h-10 rounded-xl overflow-hidden ${styles.userAvatarRing}`}>
              <img src={profilePicture} alt="User" className="w-full h-full object-cover" />
            </div>
          ) : (
            <div
              className={`w-10 h-10 rounded-xl ${styles.userAvatarBg} ${styles.userAvatarRing} flex items-center justify-center`}
            >
              <User className="w-5 h-5 text-white" />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
