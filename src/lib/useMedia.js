import { useEffect, useState } from 'react'

export function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < breakpoint : false
  )
  useEffect(() => {
    if (typeof window === 'undefined') return
    const on = () => setIsMobile(window.innerWidth < breakpoint)
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [breakpoint])
  return isMobile
}
