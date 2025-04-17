'use client'

import { useState } from 'react'
import { ChatRoom, useChatRooms } from '@/hooks/use-chat-rooms'
import { Button } from '@/components/ui/button'
import { Plus, Globe, User2, MessageSquare } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'

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
  const [search, setSearch] = useState('')
  
  console.log('Chat rooms in sidebar:', chatRooms)

  const filteredChats = chatRooms.filter(chat => {
    if (search && !getChatName(chat).toLowerCase().includes(search.toLowerCase())) return false
    if (filter === 'all') return true
    if (filter === 'global') return chat.is_global
    if (filter === 'p2p') return !chat.is_global
    return true
  })

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
    <aside className="h-full flex flex-col bg-white dark:bg-gray-800 shadow-lg">
      {/* Header */}
      <div className="sticky top-0 z-10 p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Chats</h2>
        <Button size="icon" variant="outline" onClick={onCreateNewChat}>
          <Plus className="w-5 h-5" />
        </Button>
      </div>
      {/* Search */}
      <div className="p-2 border-b border-gray-200 dark:border-gray-700">
        <Input
          placeholder="Search chats..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full"
        />
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
          <div className="p-2 space-y-1">
            {filteredChats.map(chat => (
              <button
                key={chat.id}
                onClick={() => onSelectChat(chat)}
                className={cn(
                  'w-full flex items-center p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition',
                  selectedChatId === chat.id && 'bg-primary/10'
                )}
              >
                {chat.is_global ? (
                  <Globe className="w-5 h-5 text-primary" />
                ) : (
                  <User2 className="w-5 h-5 text-primary" />
                )}
                <div className="ml-3 flex-1 min-w-0">
                  <div className="text-sm font-medium truncate text-gray-900 dark:text-gray-100">
                    {getChatName(chat)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {getLatestMessagePreview(chat)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </aside>
  )
} 