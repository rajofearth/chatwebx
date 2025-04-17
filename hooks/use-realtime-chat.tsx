'use client'

import { createClient } from '@/lib/supabase/client'
import { useCallback, useEffect, useState } from 'react'

interface UseRealtimeChatProps {
  roomName: string
  username: string
  tableId?: number // Optional table ID for database subscription
}

export interface ChatMessage {
  id: string
  content: string
  user: {
    name: string
  }
  createdAt: string
}

const EVENT_MESSAGE_TYPE = 'message'

export function useRealtimeChat({ roomName, username, tableId }: UseRealtimeChatProps) {
  const supabase = createClient()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [channel, setChannel] = useState<ReturnType<typeof supabase.channel> | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    const channelName = `room-${roomName}`
    const newChannel = supabase.channel(channelName, {
      config: {
        broadcast: {
          self: true,
        },
      },
    })

    // Handle broadcast messages (in-memory)
    newChannel
      .on('broadcast', { event: EVENT_MESSAGE_TYPE }, (payload) => {
        setMessages((current) => [...current, payload.payload as ChatMessage])
      })
      
    // Handle database changes if tableId is provided
    if (tableId) {
      // Listen to postgres changes (INSERT events)
      newChannel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_room_id=eq.${tableId}`
        },
        (payload) => {
          console.log('New message from database:', payload)
          const dbMessage = payload.new
          
          // Convert database message format to ChatMessage format
          const chatMessage: ChatMessage = {
            id: dbMessage.id.toString(),
            content: dbMessage.content,
            user: {
              name: dbMessage.sender_profile?.name || 'Unknown user',
            },
            createdAt: dbMessage.created_at,
          }
          
          // Check if message is already in state to avoid duplicates
          setMessages((current) => {
            if (current.some(msg => msg.id === chatMessage.id)) {
              return current
            }
            return [...current, chatMessage]
          })
        }
      )
      
      // Listen to broadcast changes from the database trigger
      newChannel.on(
        'broadcast',
        { event: 'INSERT' },
        (payload) => {
          if (payload.new && payload.new.chat_room_id === tableId) {
            console.log('New message from database broadcast:', payload)
            const dbMessage = payload.new
            
            // Convert database message format to ChatMessage format
            const chatMessage: ChatMessage = {
              id: dbMessage.id.toString(),
              content: dbMessage.content,
              user: {
                name: dbMessage.sender_id || 'Unknown user',
              },
              createdAt: dbMessage.created_at,
            }
            
            // Check if message is already in state to avoid duplicates
            setMessages((current) => {
              if (current.some(msg => msg.id === chatMessage.id)) {
                return current
              }
              return [...current, chatMessage]
            })
          }
        }
      )
    }
    
    // Subscribe to the channel
    newChannel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        setIsConnected(true)
        
        // If we have a tableId, also subscribe to the broadcast channel for database changes
        if (tableId) {
          try {
            await supabase.realtime.setAuth() // Needed for Realtime Authorization
            
            const broadcastChannel = supabase
              .channel(`chat:${tableId}`, { config: { private: true } })
              .subscribe()
              
            console.log(`Subscribed to broadcast channel chat:${tableId}`)
          } catch (error) {
            console.error('Error subscribing to broadcast channel:', error)
          }
        }
      }
    })

    setChannel(newChannel)

    return () => {
      supabase.removeChannel(newChannel)
    }
  }, [roomName, username, tableId, supabase])

  const sendMessage = useCallback(
    async (content: string) => {
      if (!channel || !isConnected) return

      const message: ChatMessage = {
        id: crypto.randomUUID(),
        content,
        user: {
          name: username,
        },
        createdAt: new Date().toISOString(),
      }

      // Update local state immediately for the sender
      setMessages((current) => [...current, message])

      await channel.send({
        type: 'broadcast',
        event: EVENT_MESSAGE_TYPE,
        payload: message,
      })
      
      // If we're using database persistence and have a tableId, save to database too
      if (tableId) {
        try {
          await supabase.from('messages').insert({
            chat_room_id: tableId,
            content: content,
            sender_id: null, // This should be the actual user ID in a real app
            created_at: message.createdAt
          })
        } catch (error) {
          console.error('Error saving message to database:', error)
        }
      }
    },
    [channel, isConnected, username, tableId, supabase]
  )

  return { messages, sendMessage, isConnected }
}
