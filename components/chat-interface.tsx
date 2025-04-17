'use client'

import { useState, useRef, useEffect, useMemo, use } from 'react'
import { Message, useChatMessages, } from '@/hooks/use-chat-messages'
import { useChatRooms, ChatRoom } from '@/hooks/use-chat-rooms'
import { useSendMessage } from '@/hooks/use-send-message'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Send, RefreshCcw } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { Profile } from '@/hooks/use-chat-rooms'
import { Skeleton } from '@/components/ui/skeleton'

interface ChatInterfaceProps {
  chatRoomId: number | null
  userId: string
  receiverId?: string | null
}

export function ChatInterface({ chatRoomId, userId, receiverId = null }: ChatInterfaceProps) {
  const { chatRooms: allChatRooms, loading: allChatRoomsLoading } = useChatRooms(userId)
  const chatRoom = useMemo(() => allChatRooms.find(c => c.id === chatRoomId), [allChatRooms, chatRoomId]);

  // Determine the chat title
  const chatTitle = useMemo(() => {
    if (allChatRoomsLoading) {
      return `Loading...`;
    }

    if (!chatRoom) {
        return `Loading...`
    }

   if (!chatRoom.is_global) {
      // P2P chat: Find the other user's name if there are any rooms
      const otherUser = chatRoom.participants?.find(user => user.user_id !== userId);
      if (otherUser) {
        return otherUser.name || otherUser.email || 'P2P Chat';
      } else {
        return 'Unknown P2P Chat'; // Fallback if no other user is found (shouldn't normally happen)
      }
    } else {
      // Global chat: use the group name
      return chatRoom?.name || `Global Chat ${chatRoomId}`;
    }
  }, [allChatRoomsLoading, chatRoom, userId, chatRoomId]);
  const { messages, loading: messagesLoading, error: messagesError, refetch } = useChatMessages(chatRoomId)
  const { sendMessage, sending, error: sendError, lastSentMessage } = useSendMessage()
  const [messageText, setMessageText] = useState('')
  const [statusMessage, setStatusMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  console.log('ChatInterface mounted with:', { chatRoomId, userId, receiverId })
  console.log('Current messages:', messages, 'Error:', messagesError)
  console.log('Send message error:', sendError)

  // Reset status message when chat room changes
  useEffect(() => {
    setStatusMessage(null)
  }, [chatRoomId])

  // Auto-clear status messages after 5 seconds
  useEffect(() => {
    if (statusMessage) {
      const timer = setTimeout(() => {
        setStatusMessage(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [statusMessage])

  // Function to scroll to the bottom
  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  // Scroll to bottom of messages when messages change
  useEffect(() => {
    if (messages.length > 0 && !messagesLoading) {
      console.log("scrolling to bottom");
      scrollToBottom();
    }
  }, [messages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatusMessage(null)
    console.log('Attempting to send message:', { messageText, chatRoomId, userId, receiverId })
    if (!messageText.trim() || !chatRoomId) return

    try {
      const result = await sendMessage({
        content: messageText,
        chatRoomId, 
        senderId: userId, 
        receiverId,
      })

      console.log('Message sent result:', result)
      if (result) {
        setMessageText(''); setStatusMessage({type: 'success', text: 'Message sent successfully'})
        // Force refresh the messages
        setTimeout(() => refetch(), 500)
      } else if (sendError) {
        setStatusMessage({type: 'error', text: `Error: ${sendError.message}`})
      }
    } catch (err) {
      console.error('Error in send handler:', err)
      setStatusMessage({type: 'error', text: 'Failed to send message'})
    }
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
    <div className="h-full flex flex-col overflow-hidden">
      <div className="p-2 bg-muted/30 flex justify-between items-center border-b">
        <div className="font-medium px-2">{chatTitle}</div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={refetch}
          disabled={messagesLoading}
        >
          <RefreshCcw className="h-4 w-4 mr-1" />
          Refresh
        </Button>
        
      </div>
      
      <ScrollArea ref={scrollRef} className="flex-1 p-4 overflow-y-auto">
        {messagesError && (
          <div className="p-3 mb-4 bg-red-50 border border-red-200 text-red-600 rounded text-sm">
            Error loading messages: {messagesError}
            <Button onClick={refetch} size="sm" variant="outline" className="ml-2">
              Retry
            </Button>
          </div>
        )}

        {messagesLoading ? (
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
        ) : messages.length > 0 ? (
          <div className="space-y-4">
            {messages.map((message, index) => {
              const isCurrentUser = message.sender_id === userId;
              const prevMessage = index > 0 ? messages[index - 1] : null;
              const showSender =
                !prevMessage ||
                prevMessage.sender_id !== message.sender_id ||
                new Date(message.created_at).getTime() - new Date(prevMessage.created_at).getTime() > 5 * 60 * 1000;

              return (
                <div
                  key={message.id}
                  className={cn(
                    "flex",
                    isCurrentUser ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[75%] rounded-lg p-3",
                      isCurrentUser
                        ? "bg-primary text-primary-foreground rounded-br-none"
                        : "bg-muted text-foreground rounded-bl-none"
                    )}
                  >
                    {showSender && !isCurrentUser && (
                      <div className="mb-1 text-xs font-medium">
                        {message.sender_profile?.name ||
                          message.sender_profile?.email ||
                          "Unknown user"}
                      </div>
                    )}
                    <div className="text-sm">{message.content}</div>
                    <div className="mt-1 text-xs opacity-70 text-right">
                      {new Date(message.created_at).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-muted-foreground">No messages yet. Start the conversation!</p>
          </div>
        )}        
      </ScrollArea>

      <form 
        onSubmit={handleSendMessage}
        className="p-4 border-t flex flex-col gap-2 sticky bottom-0 bg-background"
      >
        {statusMessage && (
          <div className={cn(
            "p-3 mb-2 rounded text-sm border",
            statusMessage.type === 'success'
              ? "bg-green-50 border-green-200 text-green-600"
              : "bg-red-50 border-red-200 text-red-600"
          )}>
            {statusMessage.text}
          </div>
        )}
        
        <div className="flex gap-2">
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
        </div>
      </form>
    </div>
  )
}