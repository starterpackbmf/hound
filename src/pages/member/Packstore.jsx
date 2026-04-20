import React, { useEffect, useState } from 'react'
import { listStoreItems, getMyCoins, listMyTransactions, purchaseItem } from '../../lib/free'
import { matilha } from '../../lib/matilha'
import { PageTitle, Section, Placeholder, ErrorBox, Loading } from './ui'
import { IStar, ITrendingUp } from '../../components/icons'

const KIND_LABELS = {
  digital: 'DIGITAL',
  physical: 'FÍSICO',
  discount: 'DESCONTO',
  access: 'ACESSO',
}

export default function Packstore() {
  const [items, setItems] = useState([])
  const [mirrorItems, setMirrorItems] = useState([])
  const [mirrorImages, setMirrorImages] = useState({})
  const [coins, setCoins] = useState({ balance: 0, total_earned: 0 })
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [result, setResult] = useState(null)
  const [buying, setBuying] = useState(null)

  async function reload() {
    const [i, c, t, lovable, lovableImgs] = await Promise.all([
      listStoreItems().catch(() => []),
      getMyCoins().catch(() => ({ balance: 0, total_earned: 0 })),
      listMyTransactions().catch(() => []),
      matilha.storeItems().catch(() => []),
      matilha.storeItemImages().catch(() => []),
    ])
    setItems(i); setCoins(c); setTransactions(t)
    setMirrorItems((lovable || []).filter(x => x.active !== false))
    const imgMap = {}
    ;(lovableImgs || []).forEach(img => {
      if (!imgMap[img.item_id]) imgMap[img.item_id] = img.url || img.image_url
    })
    setMirrorImages(imgMap)
  }

  useEffect(() => { reload().catch(e => setErr(e.message)).finally(() => setLoading(false)) }, [])

  async function onBuy(item) {
    if (!confirm(`comprar "${item.name}" por ${item.cost_coins} moedas?`)) return
    setBuying(item.id)
    try {
      const r = await purchaseItem(item.id)
      setResult(r)
      await reload()
    } catch (e) { alert(e.message) } finally { setBuying(null) }
  }

  return (
    <div style={{ maxWidth: 1040 }}>
      <PageTitle eyebrow="COMUNIDADE" sub="troque moedas conquistadas na matilha por itens, descontos e acessos exclusivos.">
        packstore
      </PageTitle>

      {/* Saldo */}
      <div className="card" style={{
        padding: 20, marginBottom: 28,
        background: 'linear-gradient(90deg, var(--amber-dim) 0%, var(--surface-1) 55%)',
        borderColor: 'var(--amber-dim-25)',
        display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap',
      }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 4 }}>SALDO</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <IStar size={20} stroke={1.5} style={{ color: 'var(--amber)' }} />
            <span className="mono" style={{ fontSize: 32, fontWeight: 500, color: 'var(--amber)', letterSpacing: '-0.02em' }}>
              {coins.balance}
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>moedas</span>
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.5, fontFamily: 'var(--font-mono)' }}>
            total conquistado: <span style={{ color: 'var(--text-primary)' }}>{coins.total_earned}</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            ganhe moedas postando no fórum, comentando, assistindo aulas, marcando must-watch
          </div>
        </div>
      </div>

      {result?.ok && (
        <div style={{ marginBottom: 24, padding: 16, background: '#22c55e15', border: '1px solid #22c55e44', borderRadius: 8 }}>
          <div style={{ fontSize: 13, color: 'var(--up)', marginBottom: 4, fontWeight: 500 }}>✓ compra concluída!</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {result.item?.name} adquirido. novo saldo: <strong style={{ color: 'var(--text-primary)' }}>{result.new_balance}</strong> moedas.
            {result.item?.payload?.code && (
              <div style={{ marginTop: 8, padding: 8, background: 'var(--surface-2)', borderRadius: 4, fontFamily: 'var(--font-mono)' }}>
                código: {result.item.payload.code}
              </div>
            )}
          </div>
        </div>
      )}

      {err ? <ErrorBox>{err}</ErrorBox>
       : loading ? <Loading />
       : items.length === 0 ? (
          <Placeholder title="loja vazia" subtitle="cadastre itens em public.packstore_items no Supabase." />
       ) : (
        <Section title="catálogo">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
            {items.map(it => {
              const canAfford = coins.balance >= it.cost_coins
              const outOfStock = it.stock !== null && it.stock <= 0
              return (
                <div key={it.id} className="card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {it.image_url ? (
                    <img src={it.image_url} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 6 }} />
                  ) : (
                    <div style={{
                      width: '100%', aspectRatio: '1', borderRadius: 6,
                      background: 'linear-gradient(135deg, #0d0d0f, #18181b)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'var(--amber)', opacity: 0.6,
                    }}>
                      <IStar size={40} stroke={1.2} />
                    </div>
                  )}
                  <div className="label-muted" style={{ fontSize: 9 }}>{KIND_LABELS[it.kind] || it.kind.toUpperCase()}</div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{it.name}</div>
                  {it.description && <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{it.description}</div>}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 'auto' }}>
                    <div style={{ flex: 1, fontSize: 16, color: 'var(--amber)', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>
                      ⎈ {it.cost_coins}
                    </div>
                    <button
                      onClick={() => onBuy(it)}
                      disabled={!canAfford || outOfStock || buying === it.id}
                      className={canAfford && !outOfStock ? 'btn btn-primary' : 'btn'}
                      style={{ fontSize: 11 }}
                    >
                      {buying === it.id ? '...' : outOfStock ? 'esgotado' : canAfford ? 'comprar' : 'sem moedas'}
                    </button>
                  </div>
                  {it.stock !== null && it.stock > 0 && <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{it.stock} disponíveis</div>}
                </div>
              )
            })}
          </div>
        </Section>
      )}

      {/* Espelho do catálogo Matilha (Lovable) */}
      {mirrorItems.length > 0 && (
        <Section title="matilha · catálogo oficial">
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.5 }}>
            itens do catálogo matilha — resgate pelo painel do monitor ou whatsapp.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
            {mirrorItems.map(it => (
              <div key={it.id} className="card" style={{
                padding: 14, display: 'flex', flexDirection: 'column', gap: 10,
                position: 'relative', overflow: 'hidden',
              }}>
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(135deg, rgba(168,85,247,0.05), transparent 70%)',
                  pointerEvents: 'none',
                }} />
                {mirrorImages[it.id] ? (
                  <img src={mirrorImages[it.id]} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 6 }} />
                ) : (
                  <div style={{
                    width: '100%', aspectRatio: '1', borderRadius: 6,
                    background: 'linear-gradient(135deg, #0d0d12, #1a1a20)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--purple)', opacity: 0.6,
                  }}>
                    <IStar size={40} stroke={1.2} />
                  </div>
                )}
                <span className="pill" style={{
                  alignSelf: 'flex-start', fontSize: 9,
                  color: 'var(--purple)', borderColor: 'rgba(168,85,247,0.3)',
                }}>ESPELHO</span>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{it.name || it.title}</div>
                {it.description && (
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {it.description.slice(0, 100)}{it.description.length > 100 ? '…' : ''}
                  </div>
                )}
                <div style={{ fontSize: 13, color: 'var(--amber)', fontFamily: 'var(--font-mono)', fontWeight: 500, marginTop: 'auto' }}>
                  ⎈ {it.cost_coins ?? it.price_coins ?? '—'}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {transactions.length > 0 && (
        <Section title="histórico">
          <div className="card" style={{ padding: 0 }}>
            {transactions.slice(0, 10).map((t, i) => (
              <div key={t.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px',
                borderTop: i === 0 ? 'none' : '1px solid var(--border)',
                fontSize: 12,
              }}>
                <span style={{ fontSize: 14, color: t.amount > 0 ? 'var(--up)' : 'var(--amber)', fontFamily: 'var(--font-mono)', minWidth: 40 }}>
                  {t.amount > 0 ? '+' : ''}{t.amount}
                </span>
                <span style={{ flex: 1, color: 'var(--text-primary)' }}>{t.reason || t.kind}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: 10, fontFamily: 'var(--font-mono)' }}>
                  {new Date(t.created_at).toLocaleDateString('pt-BR')}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}
