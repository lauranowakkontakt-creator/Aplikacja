import { useState, useEffect, useMemo, useRef } from 'react'
import { collection, query, onSnapshot, orderBy, addDoc, updateDoc, deleteDoc, doc, Timestamp, limit } from 'firebase/firestore'
import { db } from '../../firebase/config'
import useFallbackTimeout from '../../utils/useFallbackTimeout'
import { format, parseISO, isToday, isYesterday } from 'date-fns'
import { pl } from 'date-fns/locale'
import { groupByDay, filterEntries, gratitudeStats } from '../../utils/gratitudeLogic'
import StatTiles from '../StatTiles'
import { IconPlus, IconTrash, IconSearch, IconFlame, IconCheck, IconClose, IconEdit, IcSun } from '../Icons'
import { confirmDialog } from '../ConfirmModal'
import { toast } from '../Toast'

const TODAY = () => format(new Date(), 'yyyy-MM-dd')

// Nagłówek dnia: „Dziś", „Wczoraj", inaczej pełna data po polsku.
function dayLabel(dateStr) {
  const d = parseISO(dateStr)
  if (isToday(d)) return 'Dziś'
  if (isYesterday(d)) return 'Wczoraj'
  return format(d, 'EEEE, d MMMM yyyy', { locale: pl })
}

// Podpowiedzi, gdy pole jest puste — żeby nie patrzeć w pustkę.
const PROMPTS = [
  'Za co jesteś dziś wdzięczna?',
  'Co dziś sprawiło Ci radość?',
  'Kto dziś dla Ciebie coś zrobił?',
  'Co dziś poszło lepiej, niż się spodziewałaś?',
  'Za jaką drobną rzecz z dziś warto podziękować?',
]

export default function GratitudeDashboard({ user, setHeaderExtras }) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  useFallbackTimeout(() => setLoading(false))
  const [draft, setDraft]     = useState('')
  const [saving, setSaving]   = useState(false)
  const [search, setSearch]   = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [editing, setEditing] = useState(null) // { id, text }
  const inputRef = useRef(null)

  useEffect(() => {
    // Limit jak w innych rosnących kolekcjach — moduł pokazuje historię,
    // ale nie ma potrzeby ciągnąć wieloletniego archiwum przy każdym wejściu.
    const q = query(collection(db, 'users', user.uid, 'gratitude'), orderBy('date', 'desc'), limit(500))
    return onSnapshot(q, snap => {
      setEntries(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }, () => setLoading(false))
  }, [user.uid])

  const today = TODAY()
  const stats = useMemo(() => gratitudeStats(entries, today), [entries, today])
  const todayItems = useMemo(
    () => groupByDay(entries.filter(e => e.date === today))[0]?.items || [],
    [entries, today]
  )
  const history = useMemo(
    () => groupByDay(filterEntries(entries, search)).filter(g => search ? true : g.date !== today),
    [entries, search, today]
  )

  // Podpowiedź zmienia się wraz z liczbą dzisiejszych wpisów — bez losowania,
  // żeby nie skakała przy każdym renderze.
  const promptText = PROMPTS[todayItems.length % PROMPTS.length]

  const add = async () => {
    const text = draft.trim()
    if (!text || saving) return
    setSaving(true)
    try {
      await addDoc(collection(db, 'users', user.uid, 'gratitude'), {
        date: today, text, createdAt: Timestamp.now(),
      })
      setDraft('')
      inputRef.current?.focus()
    } catch {
      toast.error('Nie udało się zapisać')
    }
    setSaving(false)
  }

  const remove = async (entry) => {
    const ok = await confirmDialog({ title: 'Usunąć wpis?', message: entry.text })
    if (!ok) return
    await deleteDoc(doc(db, 'users', user.uid, 'gratitude', entry.id)).catch(() => {})
  }

  const saveEdit = async () => {
    const text = editing.text.trim()
    if (!text) return
    await updateDoc(doc(db, 'users', user.uid, 'gratitude', editing.id), {
      text, updatedAt: Timestamp.now(),
    }).catch(() => toast.error('Nie udało się zapisać'))
    setEditing(null)
  }

  useEffect(() => {
    setHeaderExtras?.(
      <button className="hdr-btn" title="Szukaj" onClick={() => setShowSearch(v => !v)}>
        <IconSearch size={16} />
      </button>
    )
    return () => setHeaderExtras?.(null)
  }, [])

  if (loading) return <div className="list-loading">Ładowanie...</div>

  return (
    <div className="gratitude-dashboard">

      {/* Mobile module header */}
      <div className="mod-header">
        <div>
          <div className="mod-header-kicker">Wdzięcznik</div>
          <div className="mod-header-title">
            {stats.streak > 0 ? `${stats.streak} ${stats.streak === 1 ? 'dzień' : 'dni'} z rzędu` : 'Zacznij dziś'}
          </div>
        </div>
      </div>

      <StatTiles tiles={[
        { label: 'Seria', value: stats.streak, Icon: IconFlame, color: 'var(--accent)' },
        { label: 'W tym miesiącu', value: stats.month },
        { label: 'Łącznie', value: stats.total },
        { label: 'Rekord serii', value: stats.best },
      ]} />

      {showSearch && (
        <div style={{ position: 'relative' }}>
          <IconSearch size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input
            type="search" className="form-input" autoFocus placeholder="Szukaj we wdzięczności..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 38 }}
          />
        </div>
      )}

      {/* DZIŚ — dopisywanie */}
      <div className="grat-today">
        <div className="grat-today-head">
          <span className="grat-today-kicker"><IcSun size={13} /> Dziś</span>
          <span className="grat-today-date">{format(new Date(), 'd MMMM', { locale: pl })}</span>
        </div>

        {todayItems.length > 0 && (
          <div className="grat-list">
            {todayItems.map((e, i) => (
              <GratitudeRow
                key={e.id} entry={e} index={i + 1}
                editing={editing?.id === e.id}
                editValue={editing?.text || ''}
                onEditChange={(v) => setEditing({ id: e.id, text: v })}
                onEditStart={() => setEditing({ id: e.id, text: e.text })}
                onEditCancel={() => setEditing(null)}
                onEditSave={saveEdit}
                onDelete={() => remove(e)}
              />
            ))}
          </div>
        )}

        <form className="grat-add" onSubmit={(e) => { e.preventDefault(); add() }}>
          <input
            ref={inputRef}
            type="text" className="form-input" placeholder={promptText}
            value={draft} onChange={e => setDraft(e.target.value)} maxLength={200}
          />
          <button type="submit" className="grat-add-btn" disabled={!draft.trim() || saving} title="Dodaj">
            <IconPlus size={18} />
          </button>
        </form>
      </div>

      {/* HISTORIA */}
      {history.length === 0 ? (
        <div className="list-empty">
          <p style={{ marginBottom: 8, opacity: 0.4, display: 'flex', justifyContent: 'center' }}><IcSun size={32} /></p>
          <p>{search ? 'Nic nie znaleziono' : 'Historia pojawi się tutaj'}</p>
          {!search && <p className="list-empty-hint">Zapisz pierwszą rzecz, za którą jesteś dziś wdzięczna</p>}
        </div>
      ) : (
        history.map(g => (
          <div key={g.date} className="grat-day">
            <div className="grat-day-head">
              <span className="grat-day-label">{dayLabel(g.date)}</span>
              <span className="grat-day-count">{g.items.length}</span>
            </div>
            <div className="grat-list">
              {g.items.map((e, i) => (
                <GratitudeRow
                  key={e.id} entry={e} index={i + 1}
                  editing={editing?.id === e.id}
                  editValue={editing?.text || ''}
                  onEditChange={(v) => setEditing({ id: e.id, text: v })}
                  onEditStart={() => setEditing({ id: e.id, text: e.text })}
                  onEditCancel={() => setEditing(null)}
                  onEditSave={saveEdit}
                  onDelete={() => remove(e)}
                />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

function GratitudeRow({ entry, index, editing, editValue, onEditChange, onEditStart, onEditCancel, onEditSave, onDelete }) {
  if (editing) {
    return (
      <div className="grat-item editing">
        <input
          type="text" className="form-input" autoFocus value={editValue}
          onChange={e => onEditChange(e.target.value)} maxLength={200}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); onEditSave() }
            if (e.key === 'Escape') onEditCancel()
          }}
        />
        <button className="t-btn" title="Zapisz" onClick={onEditSave}><IconCheck size={14} /></button>
        <button className="t-btn" title="Anuluj" onClick={onEditCancel}><IconClose size={14} /></button>
      </div>
    )
  }
  return (
    <div className="grat-item">
      <span className="grat-item-num">{index}</span>
      <span className="grat-item-text">{entry.text}</span>
      <button className="t-btn" title="Edytuj" onClick={onEditStart}><IconEdit size={13} /></button>
      <button className="t-btn delete" title="Usuń" onClick={onDelete}><IconTrash size={13} /></button>
    </div>
  )
}
