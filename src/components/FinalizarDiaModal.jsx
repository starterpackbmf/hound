import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import FinalizarDia from '../pages/member/FinalizarDia'

export default function FinalizarDiaModal({ open, onClose, onSaved, date }) {
  useEffect(() => {
    if (!open) return
    function onKey(e) { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.72)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '5vh 16px',
        overflowY: 'auto',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 960,
          background: 'rgba(14, 14, 20, 0.95)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 14,
          padding: '28px 28px 24px',
          boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
          maxHeight: '90vh', overflowY: 'auto',
        }}
      >
        <FinalizarDia modal onClose={onClose} onSaved={onSaved} date={date} />
      </div>
    </div>,
    document.body,
  )
}
