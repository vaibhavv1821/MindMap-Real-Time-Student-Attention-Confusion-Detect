import React, { createContext, useContext, useState, ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icons } from './Icons'

export type ToastType = 'success' | 'danger' | 'warning' | 'info'

export interface ToastMessage {
  id: string
  type: ToastType
  title: string
  message?: string
}

interface ToastContextValue {
  showToast: (toast: Omit<ToastMessage, 'id'>) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const showToast = (toast: Omit<ToastMessage, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9)
    const newToast: ToastMessage = { ...toast, id }
    setToasts((prev) => [...prev, newToast])
    setTimeout(() => {
      removeToast(id)
    }, 4000)
  }

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-2xl border backdrop-blur-lg ${
                toast.type === 'success'
                  ? 'bg-background-secondary/95 border-success/30 text-white'
                  : toast.type === 'danger'
                  ? 'bg-background-secondary/95 border-danger/30 text-white'
                  : toast.type === 'warning'
                  ? 'bg-background-secondary/95 border-warning/30 text-white'
                  : 'bg-background-secondary/95 border-accent/30 text-white'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {toast.type === 'success' && <Icons.CheckCircle className="text-success" size={20} />}
                {toast.type === 'danger' && <Icons.XCircle className="text-danger" size={20} />}
                {toast.type === 'warning' && <Icons.AlertTriangle className="text-warning" size={20} />}
                {toast.type === 'info' && <Icons.Sparkles className="text-accent" size={20} />}
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold">{toast.title}</h4>
                {toast.message && <p className="text-xs text-muted mt-0.5">{toast.message}</p>}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-muted hover:text-white p-0.5 rounded"
              >
                <Icons.XCircle size={16} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
