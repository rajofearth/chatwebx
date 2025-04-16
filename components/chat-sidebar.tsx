'use client'

import { useState } from 'react'
import { ChatRoom, useChatRooms } from '@/hooks/use-chat-rooms'
import { Button } from '@/components/ui/button'
import { Plus, Globe, User2, MessageSquare } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

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

  const filteredChats = chatRooms.filter(chat => {
    if (filter === 'all') return true
    if (filter === 'global') return chat.is_global
    if (filter === 'p2p') return !chat.is_global
    return true
  })

  function getChatName(chat: ChatRoom): string {
    if (chat.is_global) return chat.name

    // For P2P chats, show the other user's name
    const otherUser = chat.participants?.find(p => p.user_id !== userId)
    return otherUser?.name || otherUser?.email || chat.name
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
    <div className="h-full flex flex-col border-r bg-background">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">Chat</h2>
        <div className="flex mt-2 space-x-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
            className="flex-1"
          >
            <MessageSquare className="w-4 h-4 mr-1" />
            All
          </Button>
          <Button
            variant={filter === 'global' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('global')}
            className="flex-1"
          >
            <Globe className="w-4 h-4 mr-1" />
            Global
          </Button>
          <Button
            variant={filter === 'p2p' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('p2p')}
            className="flex-1"
          >
            <User2 className="w-4 h-4 mr-1" />
            Private
          </Button>
        </div>
        <Button 
          onClick={onCreateNewChat}
          className="w-full mt-2"
          variant="outline"
        >
          <Plus className="w-4 h-4 mr-1" />
          New Chat
        </Button>
      </div>
      
      <ScrollArea className="flex-1">
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
          <div className="p-8 text-center text-sm text-muted-foreground">
            No chats found
          </div>
        ) : (
          <div className="p-2">
            {filteredChats.map(chat => (
              <Button
                key={chat.id}
                variant="ghost"
                className={cn(
                  'w-full justify-start mb-1 p-3',
                  selectedChatId === chat.id && 'bg-accent'
                )}
                onClick={() => onSelectChat(chat)}
              >
                <div className="mr-2">
                  {chat.is_global ? (
                    <Globe className="w-5 h-5 text-primary" />
                  ) : (
                    <User2 className="w-5 h-5 text-primary" />
                  )}
                </div>
                <div className="flex flex-col items-start flex-1 min-w-0">
                  <div className="flex justify-between w-full items-center">
                    <span className="font-medium truncate">
                      {getChatName(chat)}
                    </span>
                    {chat.latest_message && (
                      <span className="text-xs text-muted-foreground ml-2 whitespace-nowrap">
                        {getTimeAgo(chat.latest_message.created_at)}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground truncate w-full text-left">
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