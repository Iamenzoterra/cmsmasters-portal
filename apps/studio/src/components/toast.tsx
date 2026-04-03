import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: number
  type: ToastType
  message: string
}

interface ToastContextValue {
  toast: (opts: { type: ToastType; message: string }) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

let nextId = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback(({ type, message }: { type: ToastType; message: string }) => {
    const id = nextId++
    setToasts((prev) => [...prev, { id, type, message }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {toasts.length > 0 && (
        <div
          className="fixed z-50 flex flex-col items-center"
          style={{ bottom: '24px', left: '50%', transform: 'translateX(-50%)', gap: '8px', maxWidth: '420px', width: 'max-content' }}
        >
          {toasts.map((t) => (
            <div
              key={t.id}
              className="flex items-start overflow-hidden"
              style={{
                padding: 'var(--spacing-sm) var(--spacing-md)',
                borderRadius: 'var(--rounded-lg)',
                backgroundColor: bgForType(t.type),
                color: fgForType(t.type),
                fontSize: 'var(--text-sm-font-size)',
                boxShadow: 'var(--shadow-lg)',
                animation: 'fadeIn 150ms ease-out',
              }}
            >
              {t.message}
            </div>
          ))}
        </div>
      )}
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

function bgForType(type: ToastType): string {
  switch (type) {
    case 'success': return 'hsl(var(--status-success-bg))'
    case 'error': return 'hsl(var(--status-error-bg))'
    case 'info': return 'hsl(var(--status-info-bg))'
  }
}

function fgForType(type: ToastType): string {
  switch (type) {
    case 'success': return 'hsl(var(--text-primary))'
    case 'error': return 'hsl(var(--status-error-fg))'
    case 'info': return 'hsl(var(--text-primary))'
  }
}
// test
