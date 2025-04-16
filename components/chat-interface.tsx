'use client'

import { useState, useRef, useEffect } from 'react'
import { Message, useChatMessages } from '@/hooks/use-chat-messages'
import { useSendMessage } from '@/hooks/use-send-message'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Send } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

interface ChatInterfaceProps {
  chatRoomId: number | null
  userId: string
  receiverId?: string | null
}

export function ChatInterface({ chatRoomId, userId, receiverId = null }: ChatInterfaceProps) {
  const { messages, loading } = useChatMessages(chatRoomId)
  const { sendMessage, sending } = useSendMessage()
  const [messageText, setMessageText] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom of messages when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      })
    }
  }, [messages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!messageText.trim() || !chatRoomId) return

    await sendMessage({
      content: messageText,
      chatRoomId,
      senderId: userId,
      receiverId
    })

    setMessageText('')
  }

  if (!chatRoomId) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-medium">Select a chat to start messaging</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Choose from the sidebar or create a new chat
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-16 w-3/4 ml-10" />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-muted-foreground">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => {
              const isCurrentUser = message.sender_id === userId
              const prevMessage = index > 0 ? messages[index - 1] : null
              const showSender = 
                !prevMessage || 
                prevMessage.sender_id !== message.sender_id || 
                new Date(message.created_at).getTime() - new Date(prevMessage.created_at).getTime() > 5 * 60 * 1000

              return (
                <div 
                  key={message.id}
                  className={cn(
                    "flex",
                    isCurrentUser ? "justify-end" : "justify-start"
                  )}
                >
                  <div className={cn(
                    "max-w-[75%] rounded-lg p-3",
                    isCurrentUser 
                      ? "bg-primary text-primary-foreground rounded-br-none" 
                      : "bg-muted text-foreground rounded-bl-none"
                  )}>
                    {showSender && !isCurrentUser && (
                      <div className="mb-1 text-xs font-medium">
                        {message.sender_profile?.name || message.sender_profile?.email || 'Unknown user'}
                      </div>
                    )}
                    <div className="text-sm">{message.content}</div>
                    <div className="mt-1 text-xs opacity-70 text-right">
                      {new Date(message.created_at).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </ScrollArea>

      <form 
        onSubmit={handleSendMessage}
        className="p-4 border-t flex gap-2"
      >
        <Input
          placeholder="Type a message..."
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          disabled={sending || !chatRoomId}
          className="flex-1"
        />
        <Button 
          type="submit"
          size="icon"
          disabled={sending || !messageText.trim() || !chatRoomId}
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  )
} 