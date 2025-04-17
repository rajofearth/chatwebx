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

      const { data: insertData, error: insertError } = await supabase
        .from('messages')
        .insert({
          content,
          chat_room_id: chatRoomId,
          sender_id: senderId,
          receiver_id: finalReceiverId
        })
        .select()

      if (insertError) {
        console.error('Supabase error inserting message:', insertError.code, insertError.message, insertError.details)
        throw insertError
      }
      
      const newMessage = insertData && insertData[0]
      console.log('Message sent successfully:', newMessage)
      setLastSentMessage(newMessage)
      return newMessage
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