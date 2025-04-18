'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { HomeIcon, MessageSquare, User, LogOut, Menu } from 'lucide-react'
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
  
  return (
    <div className="h-16 border-b flex justify-between items-center px-4 relative">
      <Link href="/" className="text-xl font-bold mx-auto md:mx-0">ChatWebX</Link>
      
      {isMobile ? (
        <>
          <button 
            onClick={() => setMenuOpen(!menuOpen)} 
            className="p-2 rounded-md hover:bg-accent absolute right-4 top-1/2 -translate-y-1/2"
          >
            <Menu className="h-6 w-6" />
          </button>
          
          {menuOpen && (
            <div className="absolute top-16 right-0 bg-background border shadow-md rounded-md p-2 z-20 w-48">
              {menuItems.map((item) => (
                <Link 
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center px-3 py-2 rounded-md hover:bg-accent transition-colors w-full mb-1",
                    item.activePattern.test(pathname) && "bg-accent font-medium"
                  )}
                  onClick={() => setMenuOpen(false)}
                >
                  <span className={cn("mr-2", !item.activePattern.test(pathname) && "text-muted-foreground")}>
                    {item.icon}
                  </span>
                  <span className={cn(!item.activePattern.test(pathname) && "text-muted-foreground")}>
                    {item.label}
                  </span>
                </Link>
              ))}
              <div className="px-3 py-2" onClick={() => setMenuOpen(false)}>
                <LogoutButton />
              </div>
            </div>
          )}
        </>
      ) : (
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
      )}
    </div>
  )
} 