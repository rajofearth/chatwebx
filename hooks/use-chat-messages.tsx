'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

export interface Message {
  id: number
  sender_id: string
  receiver_id: string | null
  chat_room_id: number
  content: string
  created_at: string
  sender_profile?: {
    email: string | null
    name: string | null
  }
}

export function useChatMessages(chatRoomId: number | null) {
  const supabase = createClient()
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!chatRoomId) {
      setMessages([])
      setLoading(false)
      return
    }

    async function fetchMessages() {
      setLoading(true)
      
      try {
        // First fetch messages for the chat room
        const { data: messagesData, error: messagesError } = await supabase
          .from('messages')
          .select('*')
          .eq('chat_room_id', chatRoomId)
          .order('created_at', { ascending: true })
        
        if (messagesError) {
          console.error('Error fetching messages:', messagesError)
          setLoading(false)
          return
        }
        
        // Then enhance each message with sender profile information
        const messagesWithProfiles = await Promise.all(
          (messagesData || []).map(async (message) => {
            if (!message.sender_id) return message;
            
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('email, name')
              .eq('user_id', message.sender_id)
              .single();
            
            if (profileError && profileError.code !== 'PGRST116') {
              console.error('Error fetching profile for message:', profileError);
            }
            
            return {
              ...message,
              sender_profile: profileData || null
            };
          })
        );
        
        setMessages(messagesWithProfiles);
      } catch (error) {
        console.error('Unexpected error fetching messages:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchMessages()

    // Set up real-time subscription for new messages
    const channel = supabase
      .channel(`room-${chatRoomId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: `chat_room_id=eq.${chatRoomId}`
      }, async (payload) => {
        try {
          // Fetch the sender profile for the new message
          const { data: senderData, error: senderError } = await supabase
            .from('profiles')
            .select('email, name')
            .eq('user_id', payload.new.sender_id)
            .single()
          
          if (senderError && senderError.code !== 'PGRST116') {
            console.error('Error fetching sender profile:', senderError)
          }
          
          const newMessage: Message = {
            ...payload.new,
            sender_profile: senderData || null
          }
          
          setMessages(prev => [...prev, newMessage])
        } catch (error) {
          console.error('Error processing new message:', error)
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [chatRoomId, supabase])

  return { messages, loading }
} 