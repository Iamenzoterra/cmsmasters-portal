'use client'

import { useEffect, useRef, type ReactNode } from 'react'

export function StickyHeader({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    function onScroll() {
      el!.style.backgroundColor =
        window.scrollY > 10 ? 'hsl(var(--background))' : ''
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()

    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      ref={ref}
      className="sticky top-0 z-50 transition-colors duration-300"
    >
      {children}
    </header>
  )
}
