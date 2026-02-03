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

// Theme color configurations for chat messages
const messageThemeColors = {
  light: {
    // User message styles
    userBubbleBg: 'bg-gradient-to-br from-cyan-500 via-teal-400 to-cyan-600',
    userBubbleShadow: 'shadow-lg shadow-cyan-500/20',
    userTextColor: 'text-white',
    userTimestamp: 'text-white/70',
    userAvatarBg: 'bg-gradient-to-br from-slate-600 to-slate-700',
    userAvatarRing: 'ring-2 ring-slate-400/30',
    // Assistant message styles
    assistantBubbleBg: 'bg-white/80',
    assistantBubbleBorder: 'border border-gray-200/50',
    assistantBubbleShadow: 'shadow-lg shadow-gray-200/30',
    assistantIconBg: 'from-cyan-500 via-teal-400 to-cyan-600',
    assistantIconShadow: 'shadow-lg shadow-cyan-500/20',
    assistantTimestamp: 'text-gray-400',
    // Prose/markdown styles
    proseClass: 'prose-gray',
  },
  dark: {
    // User message styles
    userBubbleBg: 'bg-gradient-to-br from-cyan-600 via-cyan-500 to-pink-600',
    userBubbleShadow: 'shadow-lg shadow-cyan-500/20',
    userTextColor: 'text-white',
    userTimestamp: 'text-white/60',
    userAvatarBg: 'bg-gradient-to-br from-slate-600 to-slate-700',
    userAvatarRing: 'ring-2 ring-white/10',
    // Assistant message styles
    assistantBubbleBg: 'bg-white/5',
    assistantBubbleBorder: 'border border-white/10',
    assistantBubbleShadow: 'shadow-lg shadow-black/20',
    assistantIconBg: 'from-cyan-500 via-cyan-400 to-pink-500',
    assistantIconShadow: 'shadow-lg shadow-cyan-500/25',
    assistantTimestamp: 'text-white/40',
    // Prose/markdown styles
    proseClass: 'prose-invert',
  },
  xipz: {
    // User message styles
    userBubbleBg: 'bg-gradient-to-br from-red-600 via-red-500 to-red-600',
    userBubbleShadow: 'shadow-lg shadow-red-500/20',
    userTextColor: 'text-white',
    userTimestamp: 'text-white/60',
    userAvatarBg: 'bg-gradient-to-br from-slate-600 to-slate-700',
    userAvatarRing: 'ring-2 ring-white/10',
    // Assistant message styles
    assistantBubbleBg: 'bg-primary-900/50',
    assistantBubbleBorder: 'border border-primary-800/50',
    assistantBubbleShadow: 'shadow-lg shadow-black/20',
    assistantIconBg: 'from-red-500 via-red-600 to-red-500',
    assistantIconShadow: 'shadow-lg shadow-red-500/25',
    assistantTimestamp: 'text-primary-400',
    // Prose/markdown styles
    proseClass: 'prose-invert',
  },
}

interface ChatMessageProps {
  message: Message
}

export function ChatMessage({ message }: ChatMessageProps) {
  const { profilePicture } = useUIStore()
  const { themeName } = useTheme()

  // Get theme-specific colors
  const colors = messageThemeColors[themeName] || messageThemeColors.dark
  
  const renderedContent = useMemo(() => {
    return message.role === 'assistant'
      ? md.render(message.content)
      : message.content
  }, [message.content, message.role])

  const isUser = message.role === 'user'

  return (
    <div className={`flex gap-3 mb-6 ${isUser ? 'justify-end' : ''}`}>
      {/* Assistant avatar */}
      {!isUser && (
        <div className="flex-shrink-0">
          <div
            className={`w-10 h-10 rounded-xl bg-gradient-to-r ${colors.assistantIconBg} flex items-center justify-center ${colors.assistantIconShadow}`}
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
            className={`${colors.userBubbleBg} ${colors.userBubbleShadow} rounded-2xl rounded-tr-sm px-4 py-3 backdrop-blur-sm`}
          >
            <p className={`${colors.userTextColor} whitespace-pre-wrap leading-relaxed`}>
              {message.content}
            </p>
            <p className={`text-xs ${colors.userTimestamp} mt-1.5 text-right`}>
              {new Date(message.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        ) : (
          // Assistant message bubble
          <div
            className={`${colors.assistantBubbleBg} ${colors.assistantBubbleBorder} ${colors.assistantBubbleShadow} rounded-2xl rounded-tl-sm px-4 py-3 backdrop-blur-sm`}
          >
            <div
              className={`prose prose-sm ${colors.proseClass} max-w-none 
                prose-p:leading-relaxed prose-p:my-2
                prose-headings:font-semibold prose-headings:mt-4 prose-headings:mb-2
                prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:bg-black/10 prose-code:dark:bg-white/10 prose-code:text-sm prose-code:before:content-none prose-code:after:content-none
                prose-pre:bg-black/10 prose-pre:dark:bg-white/5 prose-pre:rounded-xl prose-pre:border prose-pre:border-white/10
                prose-a:text-cyan-400 prose-a:no-underline hover:prose-a:underline
                prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5
                prose-blockquote:border-l-2 prose-blockquote:border-cyan-400 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-text-secondary`}
              dangerouslySetInnerHTML={{ __html: renderedContent }}
            />
            <p className={`text-xs ${colors.assistantTimestamp} mt-2`}>
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
            <div className={`w-10 h-10 rounded-xl overflow-hidden ${colors.userAvatarRing}`}>
              <img src={profilePicture} alt="User" className="w-full h-full object-cover" />
            </div>
          ) : (
            <div
              className={`w-10 h-10 rounded-xl ${colors.userAvatarBg} ${colors.userAvatarRing} flex items-center justify-center`}
            >
              <User className="w-5 h-5 text-white" />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
