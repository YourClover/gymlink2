import { useEffect } from 'react'

/**
 * Hook to manage body overflow when modals/overlays are open
 * Prevents body scroll when isOpen is true and restores it when false
 * Handles cleanup on unmount
 */
export function useBodyOverflow(isOpen: boolean): void {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])
}
