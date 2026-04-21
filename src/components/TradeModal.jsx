import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import NovoTrade from '../pages/member/NovoTrade'

export default function TradeModal({ open, onClose, onSaved, defaultDate }) {
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
      data-diary
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(4,5,7,0.8)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '5vh 16px',
        overflowY: 'auto',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 820,
          background: 'linear-gradient(180deg, rgba(14,16,19,0.97), rgba(11,13,16,0.97))',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 14,
          padding: '28px 28px 24px',
          boxShadow: '0 30px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)',
          maxHeight: '90vh', overflowY: 'auto',
        }}
      >
        <NovoTrade modal onClose={onClose} onSaved={onSaved} defaultDate={defaultDate} />
      </div>
    </div>,
    document.body,
  )
}
