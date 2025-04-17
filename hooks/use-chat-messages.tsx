'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { Profile } from '@/hooks/use-chat-rooms'

export interface Message {
  id: number
  sender_id: string
  receiver_id: string | null
  chat_room_id: number
  content: string
  created_at: string,
  sender_profile?: Profile & { profile_picture?: string }
}

export function useChatMessages(chatRoomId: number | null) {
  const supabase = createClient()
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMessages = async () => {
    if (!chatRoomId) {
      setMessages([])
      setLoading(false)
      return
    }

    console.log(`Manually fetching messages for chat ${chatRoomId}`)
    setLoading(true)
    setError(null)
    
    try {
      // First fetch messages for the chat room
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_room_id', chatRoomId)
        .order('created_at', { ascending: true })
      
      if (messagesError) {
        console.error('Error fetching messages:', messagesError)
        setError(`Error loading messages: ${messagesError.message}`)
        setLoading(false)
        return
      }
      
      console.log(`Found ${messagesData?.length || 0} messages for chat ${chatRoomId}`)
      
      // Then enhance each message with sender profile information
      const messagesWithProfiles = await Promise.all(
        (messagesData || []).map(async (message) => {
          if (!message.sender_id) return message;
          
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('email, name, profile_picture')
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
    } catch (error: any) {
      console.error('Unexpected error fetching messages:', error);
      setError(`Unexpected error: ${error.message || 'Unknown error'}`)
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Reset state when chat room changes
    setMessages([])
    setError(null)
    
    if (!chatRoomId) {
      setLoading(false)
      return
    }

    console.log(`Setting up message fetch and subscription for chat ${chatRoomId}`)
    
    // Fetch messages immediately
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
        console.log(`New message received for chat ${chatRoomId}:`, payload)
        try {
          // Fetch the sender profile for the new message
          const { data: senderData, error: senderError } = await supabase
            .from('profiles')
            .select('email, name, profile_picture')
            .eq('user_id', payload.new.sender_id)
            .single()
          
          if (senderError && senderError.code !== 'PGRST116') {
            console.error('Error fetching sender profile:', senderError)
          }
          
          const newMessage = {
            ...senderData && {sender_profile: senderData}
            ,...payload.new
          } as Message
          
          setMessages(prev => [...prev, newMessage])
        } catch (error) {
          console.error('Error processing new message:', error)
        }
      })
      .subscribe((status) => {
        console.log(`Subscription status for chat ${chatRoomId}:`, status)
      })

    return () => {
      console.log(`Cleaning up subscription for chat ${chatRoomId}`)
      supabase.removeChannel(channel)
    }
  }, [chatRoomId, supabase])

  return { messages, loading, error, refetch: fetchMessages }
} 