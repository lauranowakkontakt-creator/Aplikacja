import { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react'
import { IconCheck, IconClose, IconBell } from './Icons'

const ToastContext = createContext(null)

let _addToast = null
export const toast = {
  error:   (msg) => _addToast?.({ type: 'error',   message: msg }),
  success: (msg) => _addToast?.({ type: 'success', message: msg }),
  info:    (msg) => _addToast?.({ type: 'info',    message: msg }),
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)

  const addToast = useCallback(({ type, message }) => {
    const id = ++idRef.current
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
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
            onClick={() => remove(t.id)}>
            <span style={{ display: 'flex', alignItems: 'center' }}>
              {t.type === 'error' ? <IconClose size={15} /> : t.type === 'success' ? <IconCheck size={15} /> : <IconBell size={15} />}
            </span>
            <span style={{ fontSize: 13, flex: 1 }}>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
