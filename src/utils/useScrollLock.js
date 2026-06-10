import { useEffect } from 'react'

export function useScrollLock(active = true) {
  useEffect(() => {
    if (!active) return
    const y = window.scrollY
    document.body.style.position = 'fixed'
    document.body.style.top = `-${y}px`
    document.body.style.left = '0'
    document.body.style.right = '0'
    document.body.style.overflowY = 'scroll'
    return () => {
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.left = ''
      document.body.style.right = ''
      document.body.style.overflowY = ''
      window.scrollTo(0, y)
    }
  }, [active])
}
