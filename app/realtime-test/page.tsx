'use client'

import { RealtimeChat } from '@/components/realtime-chat'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function RealtimeTestPage() {
  const [username, setUsername] = useState('User-' + Math.floor(Math.random() * 1000))
  const [roomName, setRoomName] = useState('test-room')
  const [chatRoomId, setChatRoomId] = useState<number | undefined>(1) // Default to chat room 1
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Realtime Chat Test</h1>
      
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1">Username</label>
          <Input 
            type="text" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
            placeholder="Enter username"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Room Name</label>
          <Input 
            type="text" 
            value={roomName} 
            onChange={(e) => setRoomName(e.target.value)} 
            placeholder="Enter room name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Chat Room ID</label>
          <Input 
            type="number" 
            value={chatRoomId || ''} 
            onChange={(e) => {
              const val = parseInt(e.target.value)
              setChatRoomId(isNaN(val) ? undefined : val)
            }} 
            placeholder="Enter database chat ID (optional)"
          />
        </div>
      </div>
      
      <div className="flex flex-col mb-4">
        <label className="text-sm font-medium mb-2">Connection Type</label>
        <div className="flex gap-2">
          <Button 
            variant={chatRoomId ? "outline" : "default"} 
            onClick={() => setChatRoomId(undefined)}
          >
            In-memory Only
          </Button>
          <Button 
            variant={chatRoomId ? "default" : "outline"} 
            onClick={() => setChatRoomId(1)}
          >
            Database Backed
          </Button>
        </div>
      </div>
      
      <div className="bg-card border rounded-lg shadow-sm h-[600px]">
        <RealtimeChat 
          roomName={roomName} 
          username={username} 
          chatRoomId={chatRoomId}
        />
      </div>
    </div>
  )
} 