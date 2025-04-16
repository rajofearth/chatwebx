import { RealtimeChat } from '@/components/realtime-chat'
import { redirect } from 'next/navigation'
import { LogoutButton } from '@/components/logout-button'
import { createClient } from '@/lib/supabase/server'

export default async function HomePage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) {
    redirect('/login')
  }

  return (
    <div className="flex flex-col h-svh w-full">
      {data.user ? (
        <>
          <div className="flex items-center justify-between p-4 border-b">
            <p className="text-lg font-semibold">
              Welcome, <span>{data.user.email}</span>!
            </p>
            <LogoutButton />
          </div>
          <div className="flex-1 p-4">
            <RealtimeChat
              roomName="home"
              username={data.user.email ?? 'User'}
            />
          </div>
        </>
      ) : (
        <div>Loading...</div>
      )}
    </div>
  )
}