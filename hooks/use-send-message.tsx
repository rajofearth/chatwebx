'use client'

import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'

export function useSendMessage() {
  const supabase = createClient()
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<Error | null>(null)

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

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          content,
          chat_room_id: chatRoomId,
          sender_id: senderId,
          receiver_id: receiverId
        })

      if (error) {
        throw error
      }
    } catch (err) {
      setError(err as Error)
      console.error('Error sending message:', err)
    } finally {
      setSending(false)
    }
  }

  return { sendMessage, sending, error }
} 