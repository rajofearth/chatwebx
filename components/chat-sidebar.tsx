'use client'

import { useState, useEffect, useRef } from 'react'
import { ChatRoom, useChatRooms } from '@/hooks/use-chat-rooms'
import { Button } from '@/components/ui/button'
import { Plus, Globe, User2, MessageSquare } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import Image from 'next/image'

interface ChatSidebarProps {
  userId: string
  selectedChatId: number | null
  onSelectChat: (chatRoom: ChatRoom) => void
  onCreateNewChat: () => void
}

export function ChatSidebar({
  userId,
  selectedChatId,
  onSelectChat,
  onCreateNewChat
}: ChatSidebarProps) {
  const { chatRooms, loading } = useChatRooms(userId)
  const [filter, setFilter] = useState<'all' | 'global' | 'p2p'>('all')
  const prevChatRoomsRef = useRef<ChatRoom[]>([]);
  const [updateKey, setUpdateKey] = useState(0);
  
  console.log('Chat rooms in sidebar:', chatRooms)
  
  // Force re-render when chatRooms changes, especially for latest_message updates
  useEffect(() => {
    // Check if the latest messages have changed
    const hasLatestMessageChanged = chatRooms.some((chatRoom, i) => {
      const prevChatRoom = prevChatRoomsRef.current[i];
      if (!prevChatRoom) return true;
      
      const prevContent = prevChatRoom.latest_message?.content;
      const currContent = chatRoom.latest_message?.content;
      
      if (prevContent !== currContent) {
        console.log(`🔄 Message preview changed for room ${chatRoom.id}: Old: ${prevContent?.substring(0, 15) || 'none'} New: ${currContent?.substring(0, 15) || 'none'}`);
        return true;
      }
      return false;
    });
    
    if (hasLatestMessageChanged) {
      console.log('🔁 Chat rooms changed, forcing sidebar update');
    }
    
    // Update ref for next comparison
    prevChatRoomsRef.current = chatRooms;
  }, [chatRooms]);

  // Listen for new messages from other components to force UI update
  useEffect(() => {
    // Handler function for new message event
    const handleNewMessage = (event: Event) => {
      // Force re-render by causing a state change
      const customEvent = event as CustomEvent;
      console.log('📣 Sidebar received new-chat-message event:', customEvent.detail);
      
      // Force component re-render by incrementing update key
      setUpdateKey(prev => prev + 1);
      
      // If needed, you can add additional handling here
      // e.g., play a sound notification for new messages 
      // or temporarily highlight the affected chat room
    };
    
    // Add event listener
    window.addEventListener('new-chat-message', handleNewMessage);
    
    // Clean up
    return () => {
      window.removeEventListener('new-chat-message', handleNewMessage);
    };
  }, []);

  const filteredChats = chatRooms.filter(chat => {
    if (filter === 'all') return true
    if (filter === 'global') return chat.is_global
    if (filter === 'p2p') return !chat.is_global
    return true
  })

  // Helper to get avatar URL for P2P chats
  function getChatAvatar(chat: ChatRoom): string | null {
    if (chat.is_global) return null
    if (!chat.participants || chat.participants.length === 0) return null
    const other = chat.participants.find(p => p && p.user_id !== userId)
    return other?.profile_picture || null
  }

  function getChatName(chat: ChatRoom): string {
    console.log('Getting name for chat:', chat)
    if (chat.is_global) return chat.name

    // For P2P chats, show the other user's name
    if (!chat.participants || chat.participants.length === 0) {
      return chat.name || 'Private Chat'
    }
    
    const otherUser = chat.participants.find(p => p && p.user_id !== userId)
    return otherUser?.name || otherUser?.email || chat.name || 'Chat'
  }
  
  function getLatestMessagePreview(chat: ChatRoom): string {
    if (!chat.latest_message) return 'No messages yet'
    
    // Truncate long messages
    const content = chat.latest_message.content
    return content.length > 30 ? `${content.substring(0, 30)}...` : content
  }
  
  function getTimeAgo(timestamp: string): string {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    
    // Convert to seconds, minutes, hours, days
    const diffSecs = Math.floor(diffMs / 1000)
    const diffMins = Math.floor(diffSecs / 60)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)
    
    if (diffDays > 0) {
      return `${diffDays}d ago`
    } else if (diffHours > 0) {
      return `${diffHours}h ago`
    } else if (diffMins > 0) {
      return `${diffMins}m ago`
    } else {
      return 'Just now'
    }
  }

  return (
    <div className="h-full flex flex-col border-r bg-background shadow-md md:shadow-none relative">
      <div className="p-4 border-b">
        <h2 className="text-xl font-semibold mb-2 text-center md:text-left md:text-lg">Chats</h2>
        <div className="flex mt-2 space-x-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
            className="flex-1 px-2 md:px-3 py-4 md:py-2"
          >
            <MessageSquare className="w-4 h-4 md:mr-1" />
            <span className="hidden md:inline">All</span>
          </Button>
          <Button
            variant={filter === 'global' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('global')}
            className="flex-1 px-2 md:px-3 py-4 md:py-2"
          >
            <Globe className="w-4 h-4 md:mr-1" />
            <span className="hidden md:inline">Global</span>
          </Button>
          <Button
            variant={filter === 'p2p' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('p2p')}
            className="flex-1 px-2 md:px-3 py-4 md:py-2"
          >
            <User2 className="w-4 h-4 md:mr-1" />
            <span className="hidden md:inline">Private</span>
          </Button>
        </div>
        <Button 
          onClick={onCreateNewChat}
          className="w-full mt-3 py-5 md:py-2"
          variant="outline"
        >
          <Plus className="w-4 h-4 mr-1" />
          <span>New Chat</span>
        </Button>
      </div>
      
      <ScrollArea className="flex-1 overflow-y-auto p-1">
        {loading ? (
          <div className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-40" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="p-8 text-center text-base md:text-sm text-muted-foreground">
            No chats found
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {filteredChats.map(chat => (
              <Button
                key={`chat-${chat.id}-${chat.latest_message?.created_at || chat.created_at}-${updateKey}`}
                variant="ghost"
                className={cn(
                  'w-full justify-start p-2 md:p-3',
                  selectedChatId === chat.id && 'bg-accent'
                )}
                onClick={() => onSelectChat(chat)}
              >
                <div className="mr-2 relative w-10 h-10 flex-shrink-0 rounded-full overflow-hidden">
                  {getChatAvatar(chat) ? (
                    <Image
                      src={getChatAvatar(chat)!}
                      alt="avatar"
                      fill
                      className="object-cover"
                    />
                  ) : chat.is_global ? (
                    <div className="flex items-center justify-center w-full h-full bg-gray-100 dark:bg-gray-700">
                      <Globe className="w-5 h-5 text-primary" />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center w-full h-full bg-gray-100 dark:bg-gray-700">
                      <User2 className="w-5 h-5 text-primary" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-start flex-1 min-w-0 overflow-hidden">
                  <div className="flex justify-between w-full items-center">
                    <span className="font-medium truncate max-w-[150px] md:max-w-none">
                      {getChatName(chat)}
                    </span>
                    {chat.latest_message && (
                      <span className="text-xs text-muted-foreground ml-2 whitespace-nowrap hidden sm:inline">
                        {getTimeAgo(chat.latest_message.created_at)}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground truncate w-full text-left max-h-9 overflow-hidden">
                    {getLatestMessagePreview(chat)}
                  </span>
                </div>
              </Button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
} 