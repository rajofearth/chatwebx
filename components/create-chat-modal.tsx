'use client'

import { useState, useEffect } from 'react'
import { X, Search, User2, Check, Mail } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Profile } from '@/hooks/use-chat-rooms'
import { Skeleton } from '@/components/ui/skeleton'

interface CreateChatModalProps {
  userId: string
  onClose: () => void
  onChatCreated: (chatId: number) => void
}

export function CreateChatModal({ userId, onClose, onChatCreated }: CreateChatModalProps) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [chatType, setChatType] = useState<'global' | 'p2p'>('p2p')
  const [globalChatName, setGlobalChatName] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [users, setUsers] = useState<Profile[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  
  // Fetch users for P2P chat
  useEffect(() => {
    async function fetchUsers() {
      setLoadingUsers(true)
      
      try {
        let query = supabase
          .from('profiles')
          .select('*')
          .neq('user_id', userId);
          
        // If we have a search query, search in both name and email
        if (searchQuery) {
          query = query.or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
        }
        
        const { data, error } = await query
          .order('name', { ascending: true })
          .limit(20);
        
        if (error) {
          console.error('Error fetching users:', error)
        } else {
          setUsers(data || [])
        }
      } catch (error) {
        console.error('Unexpected error fetching users:', error)
      } finally {
        setLoadingUsers(false)
      }
    }

    fetchUsers()
  }, [searchQuery, userId, supabase])

  // Check if we already have a chat with this user
  const checkExistingChat = async (targetUserId: string) => {
    try {
      // Get all P2P chats for the current user
      const { data: userChats, error: userChatsError } = await supabase
        .from('p2p_chat_users')
        .select('chat_room_id')
        .eq('user_id', userId);
        
      if (userChatsError) throw userChatsError;
      
      if (!userChats.length) return null;
      
      // Check if any of those chats also has the target user
      const chatRoomIds = userChats.map(chat => chat.chat_room_id);
      
      const { data: existingChat, error: existingChatError } = await supabase
        .from('p2p_chat_users')
        .select('chat_room_id')
        .eq('user_id', targetUserId)
        .in('chat_room_id', chatRoomIds)
        .single();
        
      if (existingChatError && existingChatError.code !== 'PGRST116') {
        throw existingChatError;
      }
      
      return existingChat?.chat_room_id || null;
    } catch (error) {
      console.error('Error checking for existing chat:', error);
      return null;
    }
  };

  const handleCreateChat = async () => {
    if (chatType === 'global' && !globalChatName.trim()) return
    if (chatType === 'p2p' && !selectedUserId) return
    
    console.log('Creating chat:', { chatType, globalChatName, selectedUserId })
    setLoading(true)
    setErrorMessage(null)
    
    try {
      // For P2P chats, check if a chat already exists with this user
      if (chatType === 'p2p' && selectedUserId) {
        const existingChatId = await checkExistingChat(selectedUserId);
        
        if (existingChatId) {
          console.log('Found existing chat:', existingChatId)
          // If chat already exists, just open it
          onChatCreated(existingChatId);
          return;
        }
        
        // Get the other user's profile for a better chat name
        const { data: otherUserProfile } = await supabase
          .from('profiles')
          .select('name, email')
          .eq('user_id', selectedUserId)
          .single();
          
        const chatName = otherUserProfile?.name || otherUserProfile?.email || `Chat with user`;
        console.log('Creating P2P chat with name:', chatName)
        
        // Create the chat room
        const { data: chatRoom, error: chatRoomError } = await supabase
          .from('chat_rooms')
          .insert({
            name: chatName,
            is_global: false
          })
          .select()
          .single()
        
        if (chatRoomError) {
          console.error('Error creating chat room:', chatRoomError)
          setErrorMessage(`Error creating chat room: ${chatRoomError.message}`)
          throw chatRoomError
        }
        
        console.log('Created chat room:', chatRoom)
        
        // Try to add just one user first - important for debugging
        const { error: firstUserError } = await supabase
          .from('p2p_chat_users')
          .insert({
            chat_room_id: chatRoom.id,
            user_id: userId
          })
        
        if (firstUserError) {
          console.error('Error adding first user to chat:', firstUserError)
          setErrorMessage(`Error adding you to chat: ${firstUserError.message}`)
          throw firstUserError
        }
        
        // Now try adding the second user
        const { error: secondUserError } = await supabase
          .from('p2p_chat_users')
          .insert({
            chat_room_id: chatRoom.id,
            user_id: selectedUserId
          })
        
        if (secondUserError) {
          console.error('Error adding second user to chat:', secondUserError)
          setErrorMessage(`Error adding other user to chat: ${secondUserError.message}`)
          throw secondUserError
        }
        
        console.log('Users added to chat successfully')
        onChatCreated(chatRoom.id)
      } else if (chatType === 'global') {
        console.log('Creating global chat with name:', globalChatName)
        // Create a global chat room
        const { data: chatRoom, error: chatRoomError } = await supabase
          .from('chat_rooms')
          .insert({
            name: globalChatName,
            is_global: true
          })
          .select()
          .single()
        
        if (chatRoomError) {
          console.error('Error creating global chat:', chatRoomError)
          throw chatRoomError
        }
        
        console.log('Created global chat:', chatRoom)
        onChatCreated(chatRoom.id)
      }
    } catch (error) {
      console.error('Error creating chat:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background rounded-lg shadow-lg w-full max-w-md max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Create New Chat</h2>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="p-4 flex-1 overflow-auto">
          <Tabs defaultValue="p2p" onValueChange={(v) => setChatType(v as 'global' | 'p2p')}>
            <TabsList className="w-full">
              <TabsTrigger value="p2p" className="flex-1">Private Chat</TabsTrigger>
              <TabsTrigger value="global" className="flex-1">Global Chat</TabsTrigger>
            </TabsList>
            
            <TabsContent value="p2p" className="mt-4 space-y-4">
              <div>
                <Label>Search for a user</Label>
                <div className="relative mt-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or email..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              
              <div>
                <Label>Select a user</Label>
                <ScrollArea className="h-60 mt-1 border rounded-md">
                  {loadingUsers ? (
                    <div className="p-4 space-y-3">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex items-center space-x-3">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-3 w-40" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : users.length === 0 ? (
                    <div className="p-8 text-center text-sm text-muted-foreground">
                      {searchQuery 
                        ? `No users found matching "${searchQuery}"`
                        : 'No other users found'}
                    </div>
                  ) : (
                    <RadioGroup 
                      value={selectedUserId || undefined} 
                      onValueChange={setSelectedUserId}
                    >
                      {users.map(user => (
                        <div 
                          key={user.user_id} 
                          className="flex items-center space-x-2 p-3 hover:bg-accent cursor-pointer border-b last:border-b-0"
                          onClick={() => setSelectedUserId(user.user_id)}
                        >
                          <RadioGroupItem value={user.user_id} id={user.user_id} className="data-[state=checked]:border-primary" />
                          <div className="flex items-center space-x-3 flex-1">
                            <div className="bg-primary/10 rounded-full p-2">
                              <User2 className="h-5 w-5 text-primary" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium truncate">{user.name || 'Unnamed User'}</p>
                              <div className="flex items-center text-sm text-muted-foreground">
                                <Mail className="h-3 w-3 mr-1 flex-shrink-0" />
                                <span className="truncate">{user.email || 'No email'}</span>
                              </div>
                            </div>
                          </div>
                          {selectedUserId === user.user_id && (
                            <Check className="h-4 w-4 text-primary flex-shrink-0" />
                          )}
                        </div>
                      ))}
                    </RadioGroup>
                  )}
                </ScrollArea>
              </div>
            </TabsContent>
            
            <TabsContent value="global" className="mt-4">
              <div className="space-y-2">
                <Label htmlFor="chatName">Chat Name</Label>
                <Input
                  id="chatName"
                  placeholder="Enter a name for the chat room"
                  value={globalChatName}
                  onChange={(e) => setGlobalChatName(e.target.value)}
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>
        
        <div className="p-4 border-t flex flex-col">
          {errorMessage && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded text-sm">
              {errorMessage}
            </div>
          )}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateChat}
              disabled={loading || (chatType === 'global' && !globalChatName.trim()) || (chatType === 'p2p' && !selectedUserId)}
            >
              {loading ? 'Creating...' : 'Create Chat'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
} 