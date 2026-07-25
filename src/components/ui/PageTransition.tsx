import { useEffect, useRef, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'

interface PageTransitionProps {
  children: ReactNode
}

export default function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation()
  const prevPath = useRef(location.pathname)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (prevPath.current !== location.pathname) {
      const el = containerRef.current
      if (el) {
        el.classList.remove('animate-page-enter')
        // Force reflow
        void el.offsetWidth
        el.classList.add('animate-page-enter')
      }
      prevPath.current = location.pathname
    }
  }, [location.pathname])

  return (
    <div ref={containerRef} className="animate-page-enter">
      {children}
    </div>
  )
}
