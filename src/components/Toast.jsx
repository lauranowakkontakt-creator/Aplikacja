import { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react'
import { IconCheck, IconClose, IconBell } from './Icons'

const ToastContext = createContext(null)

let _addToast = null
// Opcjonalne `opts`: { action: { label, onClick }, duration }.
export const toast = {
  error:   (msg, opts) => _addToast?.({ type: 'error',   message: msg, ...opts }),
  success: (msg, opts) => _addToast?.({ type: 'success', message: msg, ...opts }),
  info:    (msg, opts) => _addToast?.({ type: 'info',    message: msg, ...opts }),
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)

  const addToast = useCallback(({ type, message, action, duration }) => {
    const id = ++idRef.current
    setToasts(prev => [...prev, { id, type, message, action }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration || 3500)
  }, [])

  useEffect(() => { _addToast = addToast; return () => { _addToast = null } }, [addToast])

  const remove = (id) => setToasts(prev => prev.filter(t => t.id !== id))

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <div style={{ position: 'fixed', bottom: 90, right: 16, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none' }}>
        {toasts.map(t => (
          <div key={t.id} className="toast-item" data-type={t.type}
            style={{ pointerEvents: 'auto' }}
            onClick={() => { if (!t.action) remove(t.id) }}>
            <span style={{ display: 'flex', alignItems: 'center' }}>
              {t.type === 'error' ? <IconClose size={15} /> : t.type === 'success' ? <IconCheck size={15} /> : <IconBell size={15} />}
            </span>
            <span style={{ fontSize: 13, flex: 1 }}>{t.message}</span>
            {t.action && (
              <button
                onClick={(e) => { e.stopPropagation(); t.action.onClick(); remove(t.id) }}
                style={{
                  background: 'rgba(255,255,255,0.14)', border: 'none', color: 'inherit',
                  fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
                  padding: '4px 10px', borderRadius: 7, flexShrink: 0,
                }}>
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
