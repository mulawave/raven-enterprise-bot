'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
}

interface ToastContextType {
  toasts: Toast[]
  showToast: (message: string, type?: Toast['type']) => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = (message: string, type: Toast['type'] = 'info') => {
    const id = Date.now().toString()
    setToasts((prev) => [...prev, { id, message, type }])

    setTimeout(() => {
      removeToast(id)
    }, 4000)
  }

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}

function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
  return (
    <div className="fixed top-4 right-4 z-[9999] space-y-2 max-w-md">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            px-6 py-4 rounded-lg shadow-2xl transform transition-all duration-300 ease-in-out
            animate-slide-in-right flex items-start gap-3 backdrop-blur-sm border
            ${
              toast.type === 'success'
                ? 'bg-emerald-500/95 border-emerald-400 text-white'
                : toast.type === 'error'
                ? 'bg-red-500/95 border-red-400 text-white'
                : toast.type === 'warning'
                ? 'bg-amber-500/95 border-amber-400 text-white'
                : 'bg-blue-500/95 border-blue-400 text-white'
            }
          `}
        >
          <span className="text-2xl">
            {toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : toast.type === 'warning' ? '⚠' : 'ℹ'}
          </span>
          <div className="flex-1">
            <p className="font-semibold text-sm">{toast.message}</p>
          </div>
          <button
            onClick={() => onRemove(toast.id)}
            className="text-white/80 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  )
}
