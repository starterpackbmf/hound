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
        background: 'rgba(4,5,7,0.35)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '5vh 16px',
        overflowY: 'auto',
        animation: 'ink-fade-up .18s ease-out both',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 820,
          background:
            'radial-gradient(ellipse 100% 70% at 0% 0%, rgba(24,209,138,0.14) 0%, transparent 60%),' +
            'radial-gradient(ellipse 90% 70% at 100% 100%, rgba(164,152,255,0.12) 0%, transparent 60%),' +
            'radial-gradient(ellipse 60% 40% at 100% 0%, rgba(111,230,240,0.07) 0%, transparent 55%),' +
            'linear-gradient(180deg, rgba(22,26,32,0.55) 0%, rgba(16,19,26,0.5) 50%, rgba(12,14,19,0.55) 100%)',
          backdropFilter: 'blur(28px) saturate(160%)',
          WebkitBackdropFilter: 'blur(28px) saturate(160%)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 16,
          padding: '28px 28px 24px',
          boxShadow:
            'inset 0 1px 0 rgba(255,255,255,0.06),' +
            '0 1px 2px rgba(0,0,0,0.4),' +
            '0 12px 24px rgba(0,0,0,0.55),' +
            '0 40px 80px rgba(0,0,0,0.85),' +
            '0 0 0 1px rgba(24,209,138,0.05)',
          maxHeight: '90vh', overflowY: 'auto',
          animation: 'ink-modal-pop .22s cubic-bezier(0.34, 1.2, 0.64, 1) both',
        }}
      >
        <NovoTrade modal onClose={onClose} onSaved={onSaved} defaultDate={defaultDate} />
      </div>
    </div>,
    document.body,
  )
}
