'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MessageSquare, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LogoutButton } from '@/components/logout-button'
import { useState, useEffect } from 'react'

interface NavMenuItem {
  label: string
  href: string
  icon: React.ReactNode
  activePattern: RegExp
}

export function NavMenu() {
  const pathname = usePathname()
  const [isMobile, setIsMobile] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  
  // Check screen size on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640); // sm breakpoint
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  const menuItems: NavMenuItem[] = [
    {
      label: 'Chat',
      href: '/chat',
      icon: <MessageSquare className="h-5 w-5" />,
      activePattern: /^\/chat/
    },
    {
      label: 'Profile',
      href: '/profile',
      icon: <User className="h-5 w-5" />,
      activePattern: /^\/profile/
    }
  ]
  
  // Render bottom tab bar on mobile
  if (isMobile) {
    return (
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-background border-t flex items-center justify-around z-50">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center",
              item.activePattern.test(pathname) ? "text-primary" : "text-muted-foreground"
            )}
          >
            {item.icon}
            <span className="text-xs">{item.label}</span>
          </Link>
        ))}
      </nav>
    )
  }
  
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
            <span className={cn("mr-2", !item.activePattern.test(pathname) && "text-muted-foreground")}>{item.icon}</span>
            <span className={cn(!item.activePattern.test(pathname) && "text-muted-foreground")}>{item.label}</span>
          </Link>
        ))}
        <LogoutButton />
      </div>
    </div>
  )
} 