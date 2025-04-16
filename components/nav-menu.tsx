'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { HomeIcon, MessageSquare, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LogoutButton } from '@/components/logout-button'

interface NavMenuItem {
  label: string
  href: string
  icon: React.ReactNode
  activePattern: RegExp
}

export function NavMenu() {
  const pathname = usePathname()
  
  const menuItems: NavMenuItem[] = [
    {
      label: 'Home',
      href: '/home',
      icon: <HomeIcon className="h-5 w-5" />,
      activePattern: /^\/home$/
    },
    {
      label: 'Chat',
      href: '/chat',
      icon: <MessageSquare className="h-5 w-5" />,
      activePattern: /^\/chat/
    }
  ]
  
  return (
    <div className="h-16 border-b flex justify-between items-center px-4">
      <Link href="/" className="text-xl font-bold">ChatWebX</Link>
      
      <div className="flex items-center space-x-2">
        {menuItems.map((item) => (
          <Link 
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center px-3 py-2 rounded-md hover:bg-accent transition-colors",
              item.activePattern.test(pathname) && "bg-accent font-medium"
            )}
          >
            <span className={cn("mr-2", !item.activePattern.test(pathname) && "text-muted-foreground")}>
              {item.icon}
            </span>
            <span className={cn(!item.activePattern.test(pathname) && "text-muted-foreground")}>
              {item.label}
            </span>
          </Link>
        ))}
        
        <LogoutButton />
      </div>
    </div>
  )
} 