import React, { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icons } from './Icons'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  description?: string
  children: React.ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
}

export const Modal = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'md',
}: ModalProps) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.body.style.overflow = 'unset'
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  const maxWidthStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', duration: 0.25 }}
            className={`relative w-full ${maxWidthStyles[maxWidth]} rounded-2xl bg-background-secondary border border-border/80 p-6 shadow-2xl z-10`}
          >
            <div className="flex items-start justify-between pb-3">
              <div>
                {title && <h3 className="text-lg font-semibold text-white">{title}</h3>}
                {description && (
                  <p className="text-xs text-muted mt-1">{description}</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="text-muted hover:text-white p-1 rounded-lg hover:bg-background-tertiary transition-colors"
              >
                <Icons.XCircle size={20} />
              </button>
            </div>
            <div className="mt-2">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
