import { useState, useEffect } from 'react'
import { collection, query, where, orderBy, onSnapshot, Timestamp, doc, setDoc, getDoc } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { startOfMonth, endOfMonth } from 'date-fns'
import { INCOME_CATEGORIES } from '../TransactionForm'
import { fmt } from '../../utils/currency'
import { CatIcon, IconPrayer, IconSettings, IconClose } from '../Icons'

const DEFAULT_TITHE_CATS = INCOME_CATEGORIES.map(c => c.id)

export default function TitheView({ user, onClose }) {
  const [income, setIncome]         = useState(0)
  const [paid, setPaid]             = useState(0)
  const [titheCats, setTitheCats]   = useState(DEFAULT_TITHE_CATS)
  const [titheIncome, setTitheIncome] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const [saving, setSaving] = useState(false)

  // Load saved category settings
  useEffect(() => {
    getDoc(doc(db, 'users', user.uid, 'settings', 'tithe')).then(d => {
      if (d.exists() && d.data().categories?.length) {
        setTitheCats(d.data().categories)
      }
    })
  }, [user.uid])

  // Listen to income transactions
  useEffect(() => {
    const start = startOfMonth(new Date())
    const end   = endOfMonth(new Date())
    const q = query(
      collection(db, 'users', user.uid, 'transactions'),
      where('type', '==', 'income'),
      where('date', '>=', Timestamp.fromDate(start)),
      where('date', '<=', Timestamp.fromDate(end)),
      orderBy('date', 'desc')
    )
    return onSnapshot(q, snap => {
      let total = 0, titheTotal = 0
      snap.docs.forEach(d => {
        const t = d.data()
        total += t.amount
        if (titheCats.includes(t.categoryId)) titheTotal += t.amount
      })
      setIncome(total)
      setTitheIncome(titheTotal)
    })
  }, [user.uid, titheCats])

  // Listen to paid tithe/ofiara
  useEffect(() => {
    const start = startOfMonth(new Date())
    const end   = endOfMonth(new Date())
    const q = query(
      collection(db, 'users', user.uid, 'transactions'),
      where('categoryId', 'in', ['dziesiecina', 'ofiara']),
      where('date', '>=', Timestamp.fromDate(start)),
      where('date', '<=', Timestamp.fromDate(end)),
      orderBy('date', 'desc')
    )
    return onSnapshot(q, snap => setPaid(snap.docs.reduce((s, d) => s + d.data().amount, 0)))
  }, [user.uid])

  const tithe    = titheIncome * 0.10
  const ofiara   = titheIncome * 0.05
  const remaining = Math.max(0, tithe - paid)
  const pct      = tithe > 0 ? Math.min(100, (paid / tithe) * 100) : 0

  const saveSettings = async () => {
    setSaving(true)
    await setDoc(doc(db, 'users', user.uid, 'settings', 'tithe'), { categories: titheCats })
    setSaving(false)
    setShowSettings(false)
  }

  const toggleCat = (id) => {
    setTitheCats(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id])
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3><IconPrayer size={18} style={{ marginRight: 6, verticalAlign: 'middle' }} /> Dziesięcina</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="t-btn" onClick={() => setShowSettings(v => !v)} title="Ustawienia kategorii"><IconSettings size={16} /></button>
            <button className="modal-close" onClick={onClose}><IconClose size={16} /></button>
          </div>
        </div>

        {showSettings ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
              Wybierz kategorie przychodów wliczane do podstawy dziesięciny:
            </p>
            <div className="mood-emotions">
              {INCOME_CATEGORIES.map(cat => (
                <button key={cat.id}
                  className={`mood-emotion-btn ${titheCats.includes(cat.id) ? 'active' : ''}`}
                  style={titheCats.includes(cat.id) ? { borderColor: '#27AE60', background: '#27AE6020', color: 'var(--text)' } : {}}
                  onClick={() => toggleCat(cat.id)}
                >
                  <CatIcon categoryId={cat.id} emoji={cat.icon} size={15} /> {cat.label}
                </button>
              ))}
            </div>
            <button className="btn-save" onClick={saveSettings} disabled={saving}>
              {saving ? 'Zapisywanie...' : 'Zapisz ustawienia'}
            </button>
          </div>
        ) : (
          <div className="tithe-content">
            <p className="tithe-month">Ten miesiąc</p>

            <div className="tithe-stat">
              <span>Wszystkie przychody</span>
              <strong>{fmt(income)}</strong>
            </div>
            <div className="tithe-stat">
              <span>Podstawa dziesięciny</span>
              <strong>{fmt(titheIncome)}</strong>
            </div>

            <div className="tithe-stat highlight">
              <span>Dziesięcina (10%)</span>
              <strong>{fmt(tithe)}</strong>
            </div>
            <div className="tithe-stat" style={{ borderLeft: '3px solid #8E44AD', paddingLeft: 10 }}>
              <span>Ofiara (5%)</span>
              <strong style={{ color: '#8E44AD' }}>{fmt(ofiara)}</strong>
            </div>

            <div className="tithe-stat paid">
              <span>Już oddane (dziesięcina + ofiara)</span>
              <strong>{fmt(paid)}</strong>
            </div>

            <div className="progress-bar-wrap" style={{ margin: '12px 0' }}>
              <div className="progress-bar" style={{ width: `${pct}%` }} />
            </div>

            <div className="tithe-stat remaining">
              <span>Pozostało (10%)</span>
              <strong>{fmt(remaining)}</strong>
            </div>

            <p className="tithe-note">
              Kliknij ⚙️ aby wybrać które kategorie przychodów wliczają się w podstawę.
              Kwoty "Już oddane" pobierane są z kategorii Dziesięcina i Ofiara w transakcjach.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
