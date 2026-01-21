'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Keyboard, Search, MessageSquare, LayoutDashboard, Building2, Users, Target, Zap } from 'lucide-react'

export function KeyboardShortcuts() {
  const router = useRouter()
  const pathname = usePathname()
  const [showHelp, setShowHelp] = useState(false)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Cmd+K or Ctrl+K for global search
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault()

        // Focus the search input if we're on a page with search
        const searchInput = document.querySelector('input[placeholder*="search"]') as HTMLInputElement
        if (searchInput) {
          searchInput.focus()
          searchInput.select()
        } else if (pathname !== '/assistant') {
          // If no search input found and not on assistant, go to dashboard (which has search)
          router.push('/dashboard')
          // Wait a bit for navigation, then focus search
          setTimeout(() => {
            const searchInput = document.querySelector('input[placeholder*="search"]') as HTMLInputElement
            if (searchInput) {
              searchInput.focus()
              searchInput.select()
            }
          }, 100)
        }
      }

      // Cmd+/ or Ctrl+/ to go to assistant
      if ((event.metaKey || event.ctrlKey) && event.key === '/') {
        event.preventDefault()
        if (pathname !== '/assistant') {
          router.push('/assistant')
        } else {
          // If already on assistant, focus the input
          const chatInput = document.querySelector('textarea, input[type="text"]') as HTMLInputElement | HTMLTextAreaElement
          if (chatInput) {
            chatInput.focus()
          }
        }
      }

      // Escape to close modals, search results, etc.
      if (event.key === 'Escape') {
        // Close search results if open
        const searchResults = document.querySelector('[class*="absolute"][class*="top-full"]')
        if (searchResults) {
          // Trigger the close handler if it exists
          const closeButton = searchResults.querySelector('button[title="Close"]') as HTMLButtonElement
          if (closeButton) {
            closeButton.click()
          }
        }
      }

      // Cmd+D or Ctrl+D to go to dashboard
      if ((event.metaKey || event.ctrlKey) && event.key === 'd') {
        event.preventDefault()
        if (pathname !== '/dashboard') {
          router.push('/dashboard')
        }
      }

      // Cmd+1-5 for main sections
      if (event.metaKey || event.ctrlKey) {
        switch (event.key) {
          case '1':
            event.preventDefault()
            router.push('/dashboard')
            break
          case '2':
            event.preventDefault()
            router.push('/companies')
            break
          case '3':
            event.preventDefault()
            router.push('/contacts')
            break
          case '4':
            event.preventDefault()
            router.push('/deals')
            break
          case '5':
            event.preventDefault()
            router.push('/assistant')
            break
          case '?':
            event.preventDefault()
            setShowHelp(true)
            break
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [router, pathname])

  const shortcuts = [
    { keys: ['⌘', 'K'], description: 'Global search', icon: Search },
    { keys: ['⌘', '/'], description: 'Go to assistant', icon: MessageSquare },
    { keys: ['⌘', 'D'], description: 'Go to dashboard', icon: LayoutDashboard },
    { keys: ['⌘', '1'], description: 'Dashboard', icon: LayoutDashboard },
    { keys: ['⌘', '2'], description: 'Companies', icon: Building2 },
    { keys: ['⌘', '3'], description: 'Contacts', icon: Users },
    { keys: ['⌘', '4'], description: 'Deals', icon: Target },
    { keys: ['⌘', '5'], description: 'Assistant', icon: Zap },
    { keys: ['⌘', '?'], description: 'Show this help', icon: Keyboard },
    { keys: ['Esc'], description: 'Close modals/search', icon: null },
  ]

  return (
    <Dialog open={showHelp} onOpenChange={setShowHelp}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Keyboard className="mr-2 h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {shortcuts.map((shortcut, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {shortcut.icon && <shortcut.icon className="h-4 w-4 text-muted-foreground" />}
                <span className="text-sm">{shortcut.description}</span>
              </div>
              <div className="flex space-x-1">
                {shortcut.keys.map((key, keyIndex) => (
                  <Badge key={keyIndex} variant="secondary" className="text-xs px-2 py-0.5">
                    {key}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end pt-4">
          <Button onClick={() => setShowHelp(false)}>Got it</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}