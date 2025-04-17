'use client'

import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'

export function useSendMessage() {
  const supabase = createClient()
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [lastSentMessage, setLastSentMessage] = useState<any>(null)

  async function sendMessage({
    content,
    chatRoomId,
    senderId,
    receiverId = null
  }: {
    content: string
    chatRoomId: number
    senderId: string
    receiverId?: string | null
  }) {
    if (!content.trim()) return

    setSending(true)
    setError(null)
    
    console.log('Sending message:', { 
      content, 
      chatRoomId, 
      senderId, 
      receiverId 
    })

    try {
      // Check if this is a global chat room
      const { data: chatRoom, error: roomError } = await supabase
        .from('chat_rooms')
        .select('is_global')
        .eq('id', chatRoomId)
        .single();
        
      if (roomError) {
        console.error('Error checking chat room type:', roomError);
        throw roomError;
      }
      
      // For global chats, make sure receiverId is null
      const isGlobal = chatRoom?.is_global || false;
      const finalReceiverId = isGlobal ? null : receiverId;
      
      console.log(`Chat room ${chatRoomId} is ${isGlobal ? 'global' : 'private'}, using receiverId:`, finalReceiverId);

      const { data, error } = await supabase
        .from('messages')
        .insert({
          content,
          chat_room_id: chatRoomId,
          sender_id: senderId,
          receiver_id: finalReceiverId
        })
        .select()

      if (error) {
        console.error('Supabase error sending message:', error)
        throw error
      }
      
      console.log('Message sent successfully:', data)
      setLastSentMessage(data?.[0] || null)
      return data
    } catch (err) {
      setError(err as Error)
      console.error('Error sending message:', err)
      return null
    } finally {
      setSending(false)
    }
  }

  return { sendMessage, sending, error, lastSentMessage }
} 