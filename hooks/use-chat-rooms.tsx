'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

export interface ChatRoom {
  id: number
  name: string
  is_global: boolean
  created_at: string
  participants?: Profile[]
  latest_message?: {
    content: string
    created_at: string
  }
}

export interface Profile {
  id: number
  user_id: string
  email: string | null
  name: string | null
}

export function useChatRooms(userId: string) {
  const supabase = createClient()
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true;
    
    async function fetchChatRooms() {
      if (!userId) return;
      
      setLoading(true)
      
      try {
        // Fetch global chat rooms
        const { data: globalChats, error: globalError } = await supabase
          .from('chat_rooms')
          .select('*')
          .eq('is_global', true)
        
        if (globalError) {
          console.error('Error fetching global chats:', globalError)
        }

        // Fetch P2P chat rooms for the current user
        const { data: p2pChats, error: p2pError } = await supabase
          .from('chat_rooms')
          .select(`
            *,
            p2p_chat_users!inner(user_id)
          `)
          .eq('p2p_chat_users.user_id', userId)
          .eq('is_global', false)
        
        if (p2pError) {
          console.error('Error fetching p2p chats:', p2pError)
        }

        // For each P2P chat, fetch the other user's profile
        const p2pChatsWithProfiles = await Promise.all((p2pChats || []).map(async (room) => {
          const { data: participants, error: participantsError } = await supabase
            .from('p2p_chat_users')
            .select(`
              user_id,
              profiles!inner(id, user_id, email, name)
            `)
            .eq('chat_room_id', room.id)
          
          if (participantsError) {
            console.error('Error fetching participants:', participantsError)
            return room
          }

          // Convert the nested structure to a flat array of profiles
          const profiles = participants.map(p => p.profiles) as unknown as Profile[]
          
          return {
            ...room,
            participants: profiles
          }
        }))

        // Combine global and P2P chats
        const allChats = [...(globalChats || []), ...p2pChatsWithProfiles]
        
        // Fetch latest message for each chat
        const enhancedChats = await Promise.all(allChats.map(async (chat) => {
          try {
            const { data: latestMessage, error: messageError } = await supabase
              .from('messages')
              .select('content, created_at')
              .eq('chat_room_id', chat.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .single()
              
            if (messageError && messageError.code !== 'PGRST116') {
              console.error(`Error fetching latest message for chat ${chat.id}:`, messageError)
            }
            
            return {
              ...chat,
              latest_message: latestMessage || undefined
            }
          } catch (error) {
            console.error(`Error processing chat ${chat.id}:`, error)
            return chat
          }
        }))
        
        // Sort chats by latest message timestamp or created_at
        enhancedChats.sort((a, b) => {
          const aTimestamp = a.latest_message?.created_at || a.created_at;
          const bTimestamp = b.latest_message?.created_at || b.created_at;
          return new Date(bTimestamp).getTime() - new Date(aTimestamp).getTime();
        })
        
        if (isMounted) {
          setChatRooms(enhancedChats)
          setLoading(false)
        }
      } catch (error) {
        console.error('Error fetching chat rooms:', error)
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchChatRooms()

    // Set up real-time subscriptions for messages, chat_rooms, and p2p_chat_users
    const channel = supabase
      .channel('chat_updates')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages'
      }, (payload) => {
        const newMessage = payload.new;
        
        setChatRooms(prevChats => {
          // Find the chat the message belongs to
          const updatedChats = prevChats.map(chat => {
            if (chat.id === newMessage.chat_room_id) {
              return {
                ...chat,
                latest_message: {
                  content: newMessage.content,
                  created_at: newMessage.created_at
                }
              };
            }
            return chat;
          });
          
          // Re-sort chats by latest message timestamp
          return [...updatedChats].sort((a, b) => {
            const aTimestamp = a.latest_message?.created_at || a.created_at;
            const bTimestamp = b.latest_message?.created_at || b.created_at;
            return new Date(bTimestamp).getTime() - new Date(aTimestamp).getTime();
          });
        });
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_rooms'
      }, () => {
        fetchChatRooms();
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'p2p_chat_users'
      }, (payload) => {
        if (payload.new.user_id === userId) {
          fetchChatRooms();
        }
      })
      .subscribe();
    
    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [userId, supabase])

  return { chatRooms, loading }
} 