import { useState, useEffect, useMemo } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES, CAT_COLORS } from '../../utils/categories'
import { CatIcon, IconClose, IconTrash, IconTag, IconEdit, IconSearch, ICON_CATALOG } from '../Icons'

export default function CategoriesView({ user, onClose }) {
  const [tab, setTab]         = useState('expense')
  const [expCats, setExpCats] = useState(DEFAULT_EXPENSE_CATEGORIES)
  const [incCats, setIncCats] = useState(DEFAULT_INCOME_CATEGORIES)
  const [showAdd, setShowAdd] = useState(false)
  const [editCat, setEditCat] = useState(null)
  const [loading, setLoading] = useState(true)

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
  const setCats = tab === 'expense' ? setExpCats : setIncCats

  const deleteCat = (id) => {
    if (!confirm('Usunąć kategorię?')) return
    const next = cats.filter(c => c.id !== id)
    setCats(next)
    save(tab, next)
  }

  const move = (id, dir) => {
    const arr = [...cats]
    const i = arr.findIndex(c => c.id === id)
    if (i + dir < 0 || i + dir >= arr.length) return
    ;[arr[i], arr[i + dir]] = [arr[i + dir], arr[i]]
    setCats(arr)
    save(tab, arr)
  }

  const addCat = (cat) => {
    const next = [...cats, cat]
    setCats(next)
    save(tab, next)
    setShowAdd(false)
  }

  const updateCat = (updated) => {
    const next = cats.map(c => c.id === updated.id ? updated : c)
    setCats(next)
    save(tab, next)
    setEditCat(null)
  }

  const switchTab = (t) => { setTab(t); setShowAdd(false); setEditCat(null) }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-tall">
        <div className="modal-header">
          <h3><IconTag size={18} style={{ marginRight: 6, verticalAlign: 'middle' }} /> Kategorie</h3>
          <button className="modal-close" onClick={onClose}><IconClose size={16} /></button>
        </div>

        <div className="habit-view-tabs" style={{ marginBottom: 12 }}>
          <button className={`habit-view-tab ${tab === 'expense' ? 'active' : ''}`} onClick={() => switchTab('expense')}>Wydatki</button>
          <button className={`habit-view-tab ${tab === 'income'  ? 'active' : ''}`} onClick={() => switchTab('income')}>Dochody</button>
        </div>

        {loading ? <div className="list-loading">Ładowanie...</div> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {cats.map((cat, i) =>
              editCat?.id === cat.id ? (
                <CategoryForm
                  key={cat.id}
                  tab={tab}
                  initial={cat}
                  onSave={updateCat}
                  onCancel={() => setEditCat(null)}
                />
              ) : (
                <div key={cat.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 10, padding: '8px 12px'
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 9,
                    background: cat.color + '33', border: `1.5px solid ${cat.color}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: cat.color, flexShrink: 0
                  }}>
                    <CatIcon categoryId={cat.id} emoji={cat.icon} size={18} />
                  </div>
                  <span style={{ flex: 1, fontSize: 14, color: 'var(--text)' }}>{cat.label}</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="t-btn" onClick={() => move(cat.id, -1)} disabled={i === 0} style={{ opacity: i === 0 ? 0.3 : 1 }}>↑</button>
                    <button className="t-btn" onClick={() => move(cat.id, +1)} disabled={i === cats.length - 1} style={{ opacity: i === cats.length - 1 ? 0.3 : 1 }}>↓</button>
                    <button className="t-btn" onClick={() => { setEditCat(cat); setShowAdd(false) }}><IconEdit size={13} /></button>
                    <button className="t-btn delete" onClick={() => deleteCat(cat.id)}><IconTrash size={13} /></button>
                  </div>
                </div>
              )
            )}

            {showAdd ? (
              <CategoryForm tab={tab} onSave={addCat} onCancel={() => setShowAdd(false)} isNew />
            ) : (
              !editCat && (
                <button className="btn-add-account" onClick={() => setShowAdd(true)}>+ Dodaj kategorię</button>
              )
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function CategoryForm({ tab, initial, onSave, onCancel, isNew }) {
  const [label, setLabel]           = useState(initial?.label ?? '')
  const [icon, setIcon]             = useState(initial?.icon ?? 'IcWallet')
  const [color, setColor]           = useState(initial?.color ?? CAT_COLORS[0])
  const [error, setError]           = useState('')
  const [search, setSearch]         = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)

  const handleSave = () => {
    if (!label.trim()) { setError('Wpisz nazwę'); return }
    const id = isNew
      ? `custom_${label.trim().toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`
      : initial.id
    onSave({ id, label: label.trim(), icon, color })
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return ICON_CATALOG
    return ICON_CATALOG.filter(ic =>
      ic.label.toLowerCase().includes(q) ||
      ic.group.toLowerCase().includes(q)
    )
  }, [search])

  const groups = useMemo(() => {
    const map = {}
    for (const ic of filtered) {
      if (!map[ic.group]) map[ic.group] = []
      map[ic.group].push(ic)
    }
    return map
  }, [filtered])

  const currentEntry = ICON_CATALOG.find(ic => ic.key === icon)

  return (
    <div style={{
      background: 'var(--surface2)', border: '1px solid var(--border)',
      borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 12
    }}>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
        {isNew ? `Nowa kategoria (${tab === 'expense' ? 'wydatek' : 'dochód'})` : 'Edytuj kategorię'}
      </p>

      <div className="form-group" style={{ margin: 0 }}>
        <label>Nazwa</label>
        <input
          type="text" className="form-input" value={label}
          onChange={e => setLabel(e.target.value)}
          placeholder="np. Hobby, Siłownia..." maxLength={30} autoFocus
        />
      </div>

      <div className="form-group" style={{ margin: 0 }}>
        <label>Ikona</label>
        <button
          type="button"
          onClick={() => setPickerOpen(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: 10, width: '100%',
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '8px 12px', cursor: 'pointer', color: color
          }}
        >
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <CatIcon categoryId="" emoji={icon} size={18} />
          </div>
          <span style={{ flex: 1, fontSize: 13, color: 'var(--text)', textAlign: 'left' }}>
            {currentEntry ? currentEntry.label : icon}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{pickerOpen ? '▲' : '▼'}</span>
        </button>

        {pickerOpen && (
          <div style={{
            marginTop: 6, background: 'var(--bg)',
            border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden'
          }}>
            <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <IconSearch size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <input
                type="text" className="form-input"
                placeholder="Szukaj ikony..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ margin: 0, fontSize: 13, border: 'none', background: 'transparent', padding: '2px 0' }}
                autoFocus
              />
            </div>
            <div style={{ maxHeight: 280, overflowY: 'auto', padding: '10px 10px 4px' }}>
              {Object.entries(groups).map(([group, icons]) => (
                <div key={group} style={{ marginBottom: 14 }}>
                  <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                    {group}
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {icons.map(ic => {
                      const Ic = ic.Component
                      const selected = icon === ic.key
                      return (
                        <button
                          key={ic.key}
                          type="button"
                          title={ic.label}
                          onClick={() => { setIcon(ic.key); setPickerOpen(false); setSearch('') }}
                          style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                            width: 54, padding: '7px 4px', borderRadius: 9, cursor: 'pointer',
                            background: selected ? color + '33' : 'var(--surface)',
                            border: `1.5px solid ${selected ? color : 'var(--border)'}`,
                            color: selected ? color : 'var(--text-muted)',
                            transition: 'all 0.1s'
                          }}
                        >
                          <Ic size={18} />
                          <span style={{ fontSize: 9, lineHeight: 1.2, textAlign: 'center', color: selected ? color : 'var(--text-muted)' }}>
                            {ic.label}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
              {Object.keys(groups).length === 0 && (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: '16px 0' }}>
                  Brak wyników
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="form-group" style={{ margin: 0 }}>
        <label>Kolor</label>
        <div className="color-picker">
          {CAT_COLORS.map(c => (
            <button
              key={c} type="button"
              className={`color-dot ${color === c ? 'active' : ''}`}
              style={{ background: c }}
              onClick={() => setColor(c)}
            />
          ))}
        </div>
      </div>

      {error && <p className="form-error" style={{ margin: 0 }}>{error}</p>}

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn-save" onClick={handleSave} style={{ flex: 1 }}>
          {isNew ? 'Dodaj' : 'Zapisz'}
        </button>
        <button
          type="button" onClick={onCancel}
          style={{
            flex: 1, background: 'transparent', border: '1px solid var(--border)',
            color: 'var(--text-muted)', borderRadius: 'var(--radius)',
            padding: 12, cursor: 'pointer', fontSize: 14
          }}
        >
          Anuluj
        </button>
      </div>
    </div>
  )
}
