'use client'

import { useEffect, useState } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { NavMenu } from '@/components/nav-menu'
import { ChatInterface } from '@/components/chat-interface'

export default function HomePage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [globalChatId, setGlobalChatId] = useState<number | null>(null)

  useEffect(() => {
    async function checkAuthenticationAndProfile() {
      const supabase = createClient()
      const { data, error } = await supabase.auth.getUser()

      if (error || !data.user) {
        window.location.href = '/auth/login'
        return
      }

      setUser(data.user)
      
      // Check if user has a profile and create one if not
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', data.user.id)
        .single()
      
      if (profileError && profileError.code === 'PGRST116') {
        // No profile found, create one
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            user_id: data.user.id,
            email: data.user.email,
            name: data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'User'
          })
        
        if (insertError) {
          console.error('Error creating profile:', insertError)
        }
      } else if (profileError) {
        console.error('Error checking for profile:', profileError)
      }
      
      // Find or create a global chat
      const { data: existingGlobalChats, error: chatError } = await supabase
        .from('chat_rooms')
        .select('id')
        .eq('is_global', true)
        .limit(1)
      
      if (chatError) {
        console.error('Error fetching global chat:', chatError)
        setLoading(false)
        return
      }

      if (existingGlobalChats && existingGlobalChats.length > 0) {
        setGlobalChatId(existingGlobalChats[0].id)
      } else {
        // Create a global chat if none exists
        const { data: newChatRoom, error: createError } = await supabase
          .from('chat_rooms')
          .insert({
            name: 'Global Chat',
            is_global: true
          })
          .select()
          .single()
        
        if (createError) {
          console.error('Error creating global chat:', createError)
        } else if (newChatRoom) {
          setGlobalChatId(newChatRoom.id)
        }
      }
      
      setLoading(false)
    }

    checkAuthenticationAndProfile()
  }, [])

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="mt-3 text-lg">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-svh w-full">
      <NavMenu />
      <div className="flex-1 p-4">
        <div className="max-w-4xl mx-auto h-full bg-card rounded-lg shadow-sm border overflow-hidden">
          <div className="p-4 border-b bg-muted/50">
            <h2 className="text-lg font-semibold">Global Chat</h2>
            <p className="text-sm text-muted-foreground">
              Chat with everyone in the community
            </p>
          </div>
          <div className="h-[calc(100%-76px)]">
            {globalChatId ? (
              <ChatInterface 
                chatRoomId={globalChatId}
                userId={user.id}
              />
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-muted-foreground">Unable to load global chat</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}