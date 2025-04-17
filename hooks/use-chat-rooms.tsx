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
        // Fetch global chats and p2p chats separately to avoid OR syntax
        const { data: globalChats, error: globalError } = await supabase
          .from('chat_rooms')
          .select('*')
          .eq('is_global', true);
        
        if (globalError) console.error('Error fetching global chats:', globalError);
          
        // Fetch user's p2p chats
        const { data: userChats, error: userChatsError } = await supabase
          .from('p2p_chat_users')
          .select('chat_room_id')
          .eq('user_id', userId);
          
        if (userChatsError) console.error('Error fetching user chats:', userChatsError);
        
        // If user has p2p chats, fetch the full chat rooms
        let p2pChats = [];
        if (userChats && userChats.length > 0) {
          const chatIds = userChats.map(c => c.chat_room_id);
          const { data: rooms, error: roomsError } = await supabase
            .from('chat_rooms')
            .select('*')
            .in('id', chatIds)
            .eq('is_global', false);
            
          if (roomsError) console.error('Error fetching p2p rooms:', roomsError);
          p2pChats = rooms || [];
        }
        
        // Combine the results
        const allRooms = [...(globalChats || []), ...(p2pChats || [])];
        
        // Now enhance each room with participants for p2p chats
        const roomsWithParticipants = await Promise.all(allRooms.map(async (room) => {
          if (!room.is_global) {
            try {
              // First get all users in this chat
              const { data: chatUsers, error: chatUsersError } = await supabase
                .from('p2p_chat_users')
                .select('user_id')
                .eq('chat_room_id', room.id);
                
              if (chatUsersError) {
                console.error(`Error fetching users for room ${room.id}:`, chatUsersError);
                return { ...room, participants: [] };
              }
              
              if (!chatUsers || chatUsers.length === 0) {
                return { ...room, participants: [] };
              }
              
              // Then fetch profiles for those users
              const userIds = chatUsers.map(u => u.user_id);
              const { data: profiles, error: profilesError } = await supabase
                .from('profiles')
                .select('id, user_id, email, name')
                .in('user_id', userIds);
                
              if (profilesError) {
                console.error(`Error fetching profiles for room ${room.id}:`, profilesError);
                return { ...room, participants: [] };
              }
              
              return {
                ...room,
                participants: profiles || []
              };
            } catch (err) {
              console.error(`Error processing participants for room ${room.id}:`, err);
              return { ...room, participants: [] };
            }
          }
          
          return {
            ...room,
            participants: []
          };
        }));
        
        // Fetch latest message for each chat
        const enhancedChats = await Promise.all(roomsWithParticipants.map(async (chat) => {
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