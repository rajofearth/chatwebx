'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ChatSidebar } from '@/components/chat-sidebar'
import { ChatInterface } from '@/components/chat-interface'
import { CreateChatModal } from '@/components/create-chat-modal'
import { NavMenu } from '@/components/nav-menu'
import { Menu, X } from 'lucide-react'
import { ChatRoom, Profile } from '@/hooks/use-chat-rooms'

export default function ChatPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedChat, setSelectedChat] = useState<ChatRoom | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  // Mobile responsiveness states
  const [isMobileView, setIsMobileView] = useState(false)
  const [showSidebar, setShowSidebar] = useState(true)
  
  console.log('Current selectedChat:', selectedChat)
  
  // Check for mobile view on mount and window resize
  useEffect(() => {
    const checkMobileView = () => {
      const mobile = window.innerWidth < 768; // 768px is standard md breakpoint
      setIsMobileView(mobile);
      // On desktop, sidebar is always visible
      // On mobile, sidebar is hidden if a chat is selected
      setShowSidebar(!mobile || !selectedChat);
    };
    
    checkMobileView();
    window.addEventListener('resize', checkMobileView);
    
    return () => {
      window.removeEventListener('resize', checkMobileView);
    };
  }, [selectedChat]);

  // Check if user is authenticated and create profile if needed
  useEffect(() => {
    const checkUserAndProfile = async () => {
      setLoading(true)
      const supabase = createClient()
      const { data, error } = await supabase.auth.getUser()

      if (error || !data.user) {
        // Redirect to login if not authenticated
        router.push('/auth/login')
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
      
      setLoading(false)
    }

    checkUserAndProfile()
  }, [router])

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
    <div className="h-screen flex flex-col">
      <div className="relative">
        <NavMenu />
        {isMobileView && (
          <button 
            className="absolute left-4 top-1/2 -translate-y-1/2 md:hidden"
            onClick={() => setShowSidebar(prev => !prev)}
          >
            {showSidebar ? <X size={24} /> : <Menu size={24} />}
          </button>
        )}
      </div>
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className={`${isMobileView ? 'w-full absolute z-10' : 'w-80'} h-full transition-all duration-300 ${showSidebar ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
          <ChatSidebar
            key={`sidebar-${user.id}`}
            userId={user.id}
            selectedChatId={selectedChat?.id || null}
            onSelectChat={(chat) => {
              console.log('Selected chat from sidebar:', chat)
              setSelectedChat(chat)
              // Hide sidebar on mobile after selecting a chat
              if (isMobileView) {
                setShowSidebar(false);
              }
            }}
            onCreateNewChat={() => setShowCreateModal(true)}
          />
        </div>

        {/* Chat Interface */}
        <div className="flex-1 h-full">
          <ChatInterface
            chatRoomId={selectedChat?.id || null}
            userId={user.id}
            receiverId={
              selectedChat && !selectedChat.is_global 
                ? selectedChat.participants?.find(p => p && p.user_id !== user.id)?.user_id || null
                : null
            }
          />
        </div>
      </div>

      {/* Create Chat Modal */}
      {showCreateModal && (
        <CreateChatModal
          userId={user.id}
          onClose={() => setShowCreateModal(false)}
          onChatCreated={async (chatId) => {
            console.log('Chat created with ID:', chatId)
            setShowCreateModal(false)
            // fetch the new chat room with participants for P2P
            const supabase = createClient()
            try {
              const isGlobal = await supabase
                .from('chat_rooms')
                .select('is_global')
                .eq('id', chatId)
                .single()
                
              if (isGlobal.data?.is_global) {
                // Global chat - simpler fetch
                const { data: room } = await supabase
                  .from('chat_rooms')
                  .select('*')
                  .eq('id', chatId)
                  .single()
                  
                if (room) {
                  setSelectedChat({
                    id: room.id,
                    name: room.name,
                    is_global: true,
                    created_at: room.created_at,
                  })
                }
              } else {
                // P2P chat with participants
                const { data: participants } = await supabase
                  .from('p2p_chat_users')
                  .select(`
                    user_id,
                    profiles!inner(id, user_id, email, name, profile_picture)
                  `)
                  .eq('chat_room_id', chatId)
                  
                const { data: room } = await supabase
                  .from('chat_rooms')
                  .select('*')
                  .eq('id', chatId)
                  .single()
                  
                if (room && participants) {
                  const profilesFormatted = participants.map(p => p.profiles)[0];
                  setSelectedChat({
                    id: room.id,
                    name: room.name,
                    is_global: false,
                    created_at: room.created_at,
                    participants: profilesFormatted,
                  })
                }
              }
            } catch (error) {
              console.error('Error fetching chat room:', error)
            }
          }}
        />
      )}
    </div>
  )
} 