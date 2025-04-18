'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { Message, useChatMessages, } from '@/hooks/use-chat-messages'
import { useChatRooms, ChatRoom } from '@/hooks/use-chat-rooms'
import { useSendMessage } from '@/hooks/use-send-message'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Send, ChevronDown, Globe, User2, Smile } from 'lucide-react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { Profile } from '@/hooks/use-chat-rooms'
import { Skeleton } from '@/components/ui/skeleton'
import dynamic from 'next/dynamic'
import { Theme } from 'emoji-picker-react'

interface ChatInterfaceProps {
  chatRoomId: number | null
  userId: string
  receiverId?: string | null
}

// Dynamic import of emoji picker to avoid SSR issues
const Picker = dynamic(() => import('emoji-picker-react'), { ssr: false })

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
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  console.log('ChatInterface mounted with:', { chatRoomId, userId, receiverId })
  console.log('Current messages:', messages, 'Error:', messagesError)
  console.log('Send message error:', sendError)

  // Compute avatar for P2P chat header
  const chatAvatarUrl = useMemo(() => {
    if (!chatRoom || chatRoom.is_global) return null
    const other = chatRoom.participants?.find(p => p.user_id !== userId)
    return other?.profile_picture || null
  }, [chatRoom, userId])

  // Function to scroll to the bottom of the chat
  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  // Detect user scroll position to toggle button
  const handleScroll = () => {
    if (!scrollRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
    const atBottom = scrollHeight - scrollTop - clientHeight < 10
    setShowScrollButton(!atBottom)
  }

  // Auto-scroll to bottom whenever number of messages or loading state changes
  useEffect(() => {
    if (!messagesLoading) {
      scrollToBottom();
    }
  }, [messages.length, messagesLoading])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
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
        setMessageText('')
        // Messages appear via realtime subscription
      }
    } catch (err) {
      console.error('Error in send handler:', err)
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
      <div className="p-2 bg-muted/30 flex items-center border-b">
        <div className="mr-2 flex-shrink-0">
          {chatAvatarUrl ? (
            <Image
              src={chatAvatarUrl}
              alt="avatar"
              width={32}
              height={32}
              className="rounded-full"
            />
          ) : chatRoom?.is_global ? (
            <Globe className="w-6 h-6 text-primary" />
          ) : (
            <User2 className="w-6 h-6 text-primary" />
          )}
        </div>
        <div className="font-medium px-2 truncate text-sm sm:text-base">{chatTitle}</div>
      </div>
      
      {/* Messages container with auto-scroll */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="relative flex-1 p-2 sm:p-4 overflow-y-auto"
      >
        {messagesError && (
          <div className="p-2 sm:p-3 mb-4 bg-red-50 border border-red-200 text-red-600 rounded text-xs sm:text-sm">
            Error loading messages: {messagesError}
            <Button onClick={refetch} size="sm" variant="outline" className="ml-2">
              Retry
            </Button>
          </div>
        )}

        {messagesLoading ? (
          <div className="space-y-2 sm:space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex flex-col gap-1 sm:gap-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-16 w-3/4 ml-10" />
              </div>
            ))}
          </div>
        ) : messages.length > 0 ? (
          <div className="space-y-2 sm:space-y-4">
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
                      "max-w-[85%] sm:max-w-[75%] rounded-lg p-2 sm:p-3",
                      isCurrentUser
                        ? "bg-primary text-primary-foreground rounded-br-none"
                        : "bg-muted text-foreground rounded-bl-none"
                    )}
                  >
                    {showSender && !isCurrentUser && (
                      <div className="mb-1 text-xs font-medium truncate max-w-[250px]">
                        {message.sender_profile?.name ||
                          message.sender_profile?.email ||
                          "Unknown user"}
                      </div>
                    )}
                    <div className="text-xs sm:text-sm">{message.content}</div>
                    <div className="mt-1 text-[10px] sm:text-xs opacity-70 text-right">
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

        {/* Scroll-to-bottom button */}
        {showScrollButton && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-4 right-2 sm:right-4 bg-primary text-primary-foreground p-2 rounded-full shadow-lg"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        )}
      </div>

      <form 
        onSubmit={handleSendMessage}
        className="p-2 sm:p-4 border-t flex flex-col gap-2 sticky bottom-0 bg-background"
      >
        <div className="flex gap-1 sm:gap-2 items-end relative">
          {/* Emoji picker toggle button */}
          <button
            type="button"
            onClick={() => setShowEmojiPicker((prev) => !prev)}
            className="p-1 sm:p-2 rounded hover:bg-muted/20"
          >
            <Smile className="w-5 h-5 text-gray-500" />
          </button>
          {/* Emoji picker popup */}
          {showEmojiPicker && (
            <div className="absolute bottom-12 left-0 z-20 transform -translate-x-1/2 sm:translate-x-0">
              <Picker
                theme={Theme.DARK}
                width={window.innerWidth < 640 ? 280 : 350}
                onEmojiClick={(emojiData) => {
                  setMessageText((prev) => prev + emojiData.emoji)
                  setShowEmojiPicker(false)
                }}
              />
            </div>
          )}
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