import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default async function Home() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  const user = data.user

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <h1 className="text-3xl font-bold mb-6 text-center">Welcome to ChatWebX</h1>
        <p className="text-center mb-8 text-muted-foreground max-w-md">
          A real-time chat application with support for global chat rooms and private messaging.
        </p>
        <div className="flex gap-4">
          <Button asChild>
            <Link href="/auth/login">Login</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/auth/sign-up">Sign Up</Link>
          </Button>
        </div>
      </div>
    )
  }

  return redirect('/chat')
}
