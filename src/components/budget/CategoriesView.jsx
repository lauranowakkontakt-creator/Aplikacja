import { useState, useEffect } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES, CAT_COLORS } from '../../utils/categories'

const EMOJI_PRESETS = ['🍕','☕','🏠','🛒','🚗','🎁','📚','💻','❤️','✈️','🎬','📖','⛪','🕊️','👕','📱','🐷','📌','💼','⭐','↩️','🎀','📈','🏦','💵','💳','🔧','🎮','🍔','🌿','💊','📦','🎵','🏋️','🐾','🌊','⚽','🎓','🛍️','💐']

export default function CategoriesView({ user, onClose }) {
  const [tab, setTab]           = useState('expense')
  const [expCats, setExpCats]   = useState(DEFAULT_EXPENSE_CATEGORIES)
  const [incCats, setIncCats]   = useState(DEFAULT_INCOME_CATEGORIES)
  const [showAdd, setShowAdd]   = useState(false)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    return onSnapshot(doc(db, 'users', user.uid, 'settings', 'categories'), d => {
      if (d.exists()) {
        if (d.data().expense?.length) setExpCats(d.data().expense)
        if (d.data().income?.length)  setIncCats(d.data().income)
      }
      setLoading(false)
    })
  }, [user.uid])

  const save = async (type, cats) => {
    await setDoc(doc(db, 'users', user.uid, 'settings', 'categories'), {
      expense: type === 'expense' ? cats : expCats,
      income:  type === 'income'  ? cats : incCats,
    }, { merge: true })
  }

  const cats = tab === 'expense' ? expCats : incCats

  const deleteCat = (id) => {
    if (!confirm('Usunąć kategorię?')) return
    const next = cats.filter(c => c.id !== id)
    if (tab === 'expense') setExpCats(next)
    else setIncCats(next)
    save(tab, next)
  }

  const move = (id, dir) => {
    const arr = [...cats]
    const i = arr.findIndex(c => c.id === id)
    if (i + dir < 0 || i + dir >= arr.length) return
    ;[arr[i], arr[i + dir]] = [arr[i + dir], arr[i]]
    if (tab === 'expense') setExpCats(arr)
    else setIncCats(arr)
    save(tab, arr)
  }

  const addCat = (cat) => {
    const next = [...cats, cat]
    if (tab === 'expense') setExpCats(next)
    else setIncCats(next)
    save(tab, next)
    setShowAdd(false)
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-tall">
        <div className="modal-header">
          <h3>🏷️ Kategorie</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="habit-view-tabs" style={{ marginBottom: 12 }}>
          <button className={`habit-view-tab ${tab === 'expense' ? 'active' : ''}`} onClick={() => { setTab('expense'); setShowAdd(false) }}>Wydatki</button>
          <button className={`habit-view-tab ${tab === 'income'  ? 'active' : ''}`} onClick={() => { setTab('income');  setShowAdd(false) }}>Dochody</button>
        </div>

        {loading ? <div className="list-loading">Ładowanie...</div> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {cats.map((cat, i) => (
              <div key={cat.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 10, padding: '8px 12px'
              }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: cat.color + '33', border: `1.5px solid ${cat.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                  {cat.icon}
                </div>
                <span style={{ flex: 1, fontSize: 14, color: 'var(--text)' }}>{cat.label}</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="t-btn" onClick={() => move(cat.id, -1)} disabled={i === 0} style={{ opacity: i === 0 ? 0.3 : 1 }}>↑</button>
                  <button className="t-btn" onClick={() => move(cat.id, +1)} disabled={i === cats.length - 1} style={{ opacity: i === cats.length - 1 ? 0.3 : 1 }}>↓</button>
                  <button className="t-btn delete" onClick={() => deleteCat(cat.id)}>🗑️</button>
                </div>
              </div>
            ))}

            {showAdd ? (
              <AddCategoryForm tab={tab} onAdd={addCat} onCancel={() => setShowAdd(false)} existingIds={cats.map(c => c.id)} />
            ) : (
              <button className="btn-add-account" onClick={() => setShowAdd(true)}>+ Dodaj kategorię</button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function AddCategoryForm({ tab, onAdd, onCancel, existingIds }) {
  const [label, setLabel]   = useState('')
  const [icon, setIcon]     = useState('📌')
  const [color, setColor]   = useState(CAT_COLORS[0])
  const [error, setError]   = useState('')

  const handleAdd = () => {
    if (!label.trim()) { setError('Wpisz nazwę'); return }
    const id = `custom_${label.trim().toLowerCase().replace(/\s+/g,'_')}_${Date.now()}`
    onAdd({ id, label: label.trim(), icon, color })
  }

  return (
    <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Nowa kategoria ({tab === 'expense' ? 'wydatek' : 'dochód'})</p>

      <div className="form-group" style={{ margin: 0 }}>
        <label>Nazwa</label>
        <input type="text" className="form-input" value={label} onChange={e => setLabel(e.target.value)}
          placeholder="np. Hobby, Siłownia..." maxLength={30} autoFocus />
      </div>

      <div className="form-group" style={{ margin: 0 }}>
        <label>Ikona</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {EMOJI_PRESETS.map(e => (
            <button key={e} type="button"
              style={{ fontSize: 22, background: icon === e ? 'rgba(201,75,40,0.2)' : 'transparent', border: `1px solid ${icon === e ? 'var(--primary)' : 'var(--border)'}`, borderRadius: 8, padding: '4px 6px', cursor: 'pointer' }}
              onClick={() => setIcon(e)}
            >{e}</button>
          ))}
        </div>
      </div>

      <div className="form-group" style={{ margin: 0 }}>
        <label>Kolor</label>
        <div className="color-picker">
          {CAT_COLORS.map(c => (
            <button key={c} type="button"
              className={`color-dot ${color === c ? 'active' : ''}`}
              style={{ background: c }}
              onClick={() => setColor(c)}
            />
          ))}
        </div>
      </div>

      {error && <p className="form-error" style={{ margin: 0 }}>{error}</p>}

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn-save" onClick={handleAdd} style={{ flex: 1 }}>Dodaj</button>
        <button type="button" onClick={onCancel}
          style={{ flex: 1, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', borderRadius: 'var(--radius)', padding: 12, cursor: 'pointer', fontSize: 14 }}>
          Anuluj
        </button>
      </div>
    </div>
  )
}
