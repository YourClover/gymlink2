import { useEffect } from 'react'

// Module-level counter to handle stacked modals
let overflowLockCount = 0

/**
 * Hook to manage body overflow when modals/overlays are open
 * Prevents body scroll when isOpen is true and restores it when false
 * Handles stacked modals — only restores scroll when all modals are closed
 */
export function useBodyOverflow(isOpen: boolean): void {
  useEffect(() => {
    if (isOpen) {
      overflowLockCount++
      document.body.style.overflow = 'hidden'
    }
    return () => {
      if (isOpen) {
        overflowLockCount--
        if (overflowLockCount <= 0) {
          overflowLockCount = 0
          document.body.style.overflow = ''
        }
      }
    }
  }, [isOpen])
}
