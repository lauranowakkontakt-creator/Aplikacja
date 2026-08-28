import { useState, useEffect, useMemo } from 'react'
import { collection, query, onSnapshot, orderBy, addDoc, updateDoc, deleteDoc, doc, Timestamp, limit } from 'firebase/firestore'
import { db } from '../../firebase/config'
import useFallbackTimeout from '../../utils/useFallbackTimeout'
import { format, parseISO } from 'date-fns'
import { pl } from 'date-fns/locale'
import {
  sortMemories, filterMemories, groupByMonth, onThisDay,
  memoryStats, collectTags, preview,
} from '../../utils/memoryLogic'
import { parseTags } from '../../utils/notesLogic'
import { pickBySeed, daySeed, neighbors } from '../../utils/browsing'
import StatTiles from '../StatTiles'
import {
  IconPlus, IconTrash, IconSearch, IconClose, IconTag, IconStar, IconEdit,
  IconChevronLeft, IconChevronRight, IconRepeat, IcCamera, IcClockWall,
} from '../Icons'
import { confirmDialog } from '../ConfirmModal'
import { toast } from '../Toast'

const TODAY = () => format(new Date(), 'yyyy-MM-dd')

const monthLabel = (key) => key === 'bez-daty'
  ? 'Bez daty'
  : format(parseISO(key + '-01'), 'LLLL yyyy', { locale: pl })

const yearsAgoLabel = (n) => n === 1 ? 'rok temu' : n < 5 ? `${n} lata temu` : `${n} lat temu`

export default function MemoriesDashboard({ user, setHeaderExtras }) {
  const [memories, setMemories] = useState([])
  const [loading, setLoading]   = useState(true)
  useFallbackTimeout(() => setLoading(false))
  const [search, setSearch]     = useState('')
  const [tag, setTag]           = useState(null)
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [editor, setEditor]     = useState(null) // null | 'new' | wspomnienie
  const [reading, setReading]   = useState(null) // id otwartego wspomnienia
  const [shuffle, setShuffle]   = useState(0)    // ile razy dolosowano przypominajkę

  useEffect(() => {
    const q = query(collection(db, 'users', user.uid, 'memories'), orderBy('date', 'desc'), limit(500))
    return onSnapshot(q, snap => {
      setMemories(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }, () => setLoading(false))
  }, [user.uid])

  const today = TODAY()
  const stats    = useMemo(() => memoryStats(memories, today), [memories, today])
  const allTags  = useMemo(() => collectTags(memories), [memories])
  const flashback = useMemo(() => onThisDay(memories, today), [memories, today])
  // Widoczna lista w kolejności osi czasu — po niej chodzą strzałki w podglądzie.
  const visible  = useMemo(
    () => sortMemories(filterMemories(memories, { search, tag, favoritesOnly })),
    [memories, search, tag, favoritesOnly]
  )
  const groups   = useMemo(() => groupByMonth(visible), [visible])

  // Przypominajka: losowe wspomnienie na dziś (nie z dzisiaj). Jedno na dzień,
  // chyba że sama dolosujesz — stąd seed z numeru dnia plus licznik kliknięć.
  const older    = useMemo(() => memories.filter(m => m.date !== today), [memories, today])
  const reminder = useMemo(() => pickBySeed(older, daySeed(today) + shuffle), [older, today, shuffle])

  const toggleFavorite = (m) =>
    updateDoc(doc(db, 'users', user.uid, 'memories', m.id), { favorite: !m.favorite }).catch(() => {})

  const handleDelete = async (m) => {
    const ok = await confirmDialog({ title: 'Usunąć wspomnienie?', message: 'Ta operacja jest nieodwracalna.' })
    if (!ok) return
    await deleteDoc(doc(db, 'users', user.uid, 'memories', m.id))
    toast.success('Wspomnienie usunięte')
  }

  useEffect(() => {
    setHeaderExtras?.(
      <button className="hdr-btn accent" title="Nowe wspomnienie" onClick={() => setEditor('new')}>
        <IconPlus size={17} />
      </button>
    )
    return () => setHeaderExtras?.(null)
  }, [])

  if (loading) return <div className="list-loading">Ładowanie...</div>

  const filtering = !!(search || tag || favoritesOnly)

  return (
    <div className="memories-dashboard">

      <StatTiles tiles={[
        { label: 'Łącznie', value: stats.total, Icon: IcCamera, color: 'var(--accent)' },
        { label: 'W tym roku', value: stats.thisYear },
        { label: 'Ulubione', value: stats.favorites },
        { label: 'Lata', value: stats.years },
      ]} />

      {/* Przypominajka — losowe wspomnienie, po to się je zapisuje */}
      {reminder && !filtering && (
        <div className="recall-card">
          <div className="recall-head">
            <span className="recall-kicker"><IcCamera size={12} /> Przypomnij sobie</span>
            <div className="recall-actions">
              {older.length > 1 && (
                <button className="recall-btn" title="Wylosuj inne"
                  onClick={() => setShuffle(n => n + 1)}><IconRepeat size={13} /></button>
              )}
            </div>
          </div>
          <button className="recall-body" onClick={() => setReading(reminder.id)}>
            <span className="recall-text">{reminder.title || preview(reminder.text, 80) || 'Bez tytułu'}</span>
            <span className="recall-date">
              {reminder.date ? format(parseISO(reminder.date), 'd MMMM yyyy', { locale: pl }) : 'bez daty'}
            </span>
          </button>
        </div>
      )}

      {/* TEGO DNIA — powrót do wspomnień sprzed lat */}
      {flashback.length > 0 && !filtering && (
        <div className="mem-flashback">
          <div className="mem-flashback-head">
            <IcClockWall size={13} /> Tego dnia
          </div>
          <div className="mem-flashback-row">
            {flashback.map(m => (
              <button key={m.id} className="mem-flashback-card" onClick={() => setReading(m.id)}>
                <span className="mem-flashback-when">{yearsAgoLabel(m.yearsAgo)}</span>
                <span className="mem-flashback-title">{m.title || 'Bez tytułu'}</span>
                {m.text && <span className="mem-flashback-text">{preview(m.text, 90)}</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Szukajka */}
      <div style={{ position: 'relative' }}>
        <IconSearch size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
        <input
          type="search" className="form-input" placeholder="Szukaj we wspomnieniach..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ paddingLeft: 38 }}
        />
      </div>

      {/* Filtry */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button className={`account-chip ${!tag && !favoritesOnly ? 'active' : ''}`}
          onClick={() => { setTag(null); setFavoritesOnly(false) }}>Wszystkie</button>
        <button className={`account-chip ${favoritesOnly ? 'active' : ''}`}
          onClick={() => setFavoritesOnly(v => !v)}>
          <IconStar size={10} style={{ verticalAlign: '-1px', marginRight: 4, opacity: .8 }} />Ulubione
        </button>
        {allTags.map(t => (
          <button key={t} className={`account-chip ${tag === t ? 'active' : ''}`}
            onClick={() => setTag(tag === t ? null : t)}>
            <IconTag size={10} style={{ verticalAlign: '-1px', marginRight: 4, opacity: .7 }} />{t}
          </button>
        ))}
      </div>

      {/* Oś czasu */}
      {groups.length === 0 ? (
        <div className="list-empty">
          <p style={{ marginBottom: 8, opacity: 0.4, display: 'flex', justifyContent: 'center' }}><IcCamera size={32} /></p>
          <p>{memories.length === 0 ? 'Brak wspomnień' : 'Nic nie znaleziono'}</p>
          {memories.length === 0 && <p className="list-empty-hint">Kliknij + i zapisz, co się dziś wydarzyło</p>}
        </div>
      ) : (
        groups.map(g => (
          <div key={g.key} className="mem-group">
            <div className="mem-group-head">
              <span className="mem-group-label">{monthLabel(g.key)}</span>
              <span className="mem-group-count">{g.items.length}</span>
            </div>
            <div className="mem-grid">
              {g.items.map(m => (
                <div key={m.id} className="mem-card" onClick={() => setReading(m.id)}>
                  <div className="mem-card-top">
                    <span className="mem-card-date">
                      {m.date ? format(parseISO(m.date), 'd MMM', { locale: pl }) : '—'}
                    </span>
                    <button
                      className={`mem-fav ${m.favorite ? 'on' : ''}`}
                      title={m.favorite ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}
                      onClick={(e) => { e.stopPropagation(); toggleFavorite(m) }}
                    ><IconStar size={13} /></button>
                  </div>
                  <div className="mem-card-title">{m.title || 'Bez tytułu'}</div>
                  {m.text && <p className="mem-card-text">{preview(m.text)}</p>}
                  {(m.tags || []).length > 0 && (
                    <div className="mem-card-tags">
                      {(m.tags || []).slice(0, 3).map(t => <span key={t} className="note-tag">{t}</span>)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      <button className="btn-add" onClick={() => setEditor('new')}><IconPlus size={22} /></button>

      {reading && (
        <MemoryReader
          all={visible.length ? visible : memories}
          id={reading}
          onGo={setReading}
          onClose={() => setReading(null)}
          onEdit={(m) => { setReading(null); setEditor(m) }}
          onDelete={(m) => { setReading(null); handleDelete(m) }}
          onToggleFavorite={toggleFavorite}
        />
      )}

      {editor && (
        <MemoryEditor
          user={user}
          memory={editor === 'new' ? null : editor}
          today={today}
          onClose={() => setEditor(null)}
        />
      )}
    </div>
  )
}

/* Podgląd wspomnienia ze strzałkami — przez całą oś czasu bez zamykania okna. */
function MemoryReader({ all, id, onGo, onClose, onEdit, onDelete, onToggleFavorite }) {
  const { index, total, prev, next } = neighbors(all, id)
  const memory = all[index]
  // Wspomnienie mogło zniknąć (usunięte w tle) — zamykamy okno zamiast
  // zostawiać zablokowany, niewidoczny stan.
  useEffect(() => { if (!memory) onClose() }, [memory, onClose])
  if (!memory) return null
  const dateText = memory.date
    ? format(parseISO(memory.date), 'EEEE, d MMMM yyyy', { locale: pl })
    : 'Bez daty'
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3 style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <IconChevronLeft size={16} style={{ opacity: .6 }} /> Wspomnienie
          </h3>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button className={`mem-fav ${memory.favorite ? 'on' : ''}`} style={{ width: 30, height: 30 }}
              title="Ulubione" onClick={() => onToggleFavorite(memory)}><IconStar size={15} /></button>
            <button className="t-btn" style={{ width: 30, height: 30 }} title="Edytuj" onClick={() => onEdit(memory)}>
              <IconEdit size={14} />
            </button>
            <button className="t-btn delete" style={{ width: 30, height: 30 }} title="Usuń" onClick={() => onDelete(memory)}>
              <IconTrash size={14} />
            </button>
            <button className="modal-close" onClick={onClose}><IconClose size={16} /></button>
          </div>
        </div>
        <div className="form" style={{ gap: 10 }}>
          <div style={{ fontSize: 10.5, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            {dateText}
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-.02em' }}>
            {memory.title || 'Bez tytułu'}
          </div>
          {memory.text && (
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.65, color: 'var(--text-sub)', whiteSpace: 'pre-wrap' }}>
              {memory.text}
            </p>
          )}
          {(memory.tags || []).length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {memory.tags.map(t => <span key={t} className="note-tag">{t}</span>)}
            </div>
          )}
        </div>
        <div className="reader-nav">
          <button className="reader-nav-btn" disabled={!prev} onClick={() => prev && onGo(prev.id)}>
            <IconChevronLeft size={16} /> Nowsze
          </button>
          <span className="reader-count">{index + 1} z {total}</span>
          <button className="reader-nav-btn" disabled={!next} onClick={() => next && onGo(next.id)}>
            Starsze <IconChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

function MemoryEditor({ user, memory, today, onClose }) {
  const [date, setDate]     = useState(memory?.date || today)
  const [title, setTitle]   = useState(memory?.title || '')
  const [text, setText]     = useState(memory?.text || '')
  const [tagsInput, setTagsInput] = useState((memory?.tags || []).join(', '))
  const [favorite, setFavorite]   = useState(memory?.favorite || false)
  const [saving, setSaving] = useState(false)

  const canSave = !!(title.trim() || text.trim())

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    const data = {
      date: date || today,
      title: title.trim(),
      text: text.trim(),
      tags: parseTags(tagsInput),
      favorite,
      updatedAt: Timestamp.now(),
    }
    try {
      if (memory) await updateDoc(doc(db, 'users', user.uid, 'memories', memory.id), data)
      else await addDoc(collection(db, 'users', user.uid, 'memories'), { ...data, createdAt: Timestamp.now() })
      toast.success('Wspomnienie zapisane')
      onClose()
    } catch {
      toast.error('Błąd zapisu')
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3 style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <IcCamera size={17} /> {memory ? 'Edytuj wspomnienie' : 'Nowe wspomnienie'}
          </h3>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button className={`mem-fav ${favorite ? 'on' : ''}`} style={{ width: 30, height: 30 }}
              title="Ulubione" onClick={() => setFavorite(f => !f)}><IconStar size={15} /></button>
            <button className="modal-close" onClick={onClose}><IconClose size={16} /></button>
          </div>
        </div>

        <form className="form" onSubmit={(e) => { e.preventDefault(); handleSave() }}>
          <div className="form-group">
            <label>Kiedy to było</label>
            <input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} />
          </div>

          <div className="form-group">
            <input
              type="text" className="form-input" placeholder="Tytuł — np. Wyjazd nad morze"
              value={title} onChange={e => setTitle(e.target.value)} maxLength={120}
              autoFocus={!memory} style={{ fontSize: 16, fontWeight: 700 }}
            />
          </div>

          <div className="form-group">
            <textarea
              className="form-input" rows={10}
              placeholder="Co się wydarzyło? Do czego chcesz kiedyś wrócić..."
              value={text} onChange={e => setText(e.target.value)}
              style={{ resize: 'vertical', minHeight: 200, fontFamily: 'inherit', lineHeight: 1.6 }}
            />
          </div>

          <div className="form-group">
            <label>Tagi <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(oddziel przecinkami)</span></label>
            <input
              type="text" className="form-input" placeholder="np. rodzina, podróże, praca"
              value={tagsInput} onChange={e => setTagsInput(e.target.value)}
            />
          </div>

          <button type="submit" className="btn-save" disabled={saving || !canSave}>
            {saving ? 'Zapisywanie...' : memory ? 'Zapisz zmiany' : 'Dodaj wspomnienie'}
          </button>
        </form>
      </div>
    </div>
  )
}
