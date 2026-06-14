import { useState, useEffect, useMemo } from 'react'
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { BIBLE_BOOKS, TOTAL_CHAPTERS, chapterKey } from '../../utils/bibleData'
import { IconBook, IconClose, IconCheck, IconChevronDown } from '../Icons'
import { Ring } from '../ChartPrimitives'
import { toast } from '../Toast'
import BibleNotes from './BibleNotes'

// Read-count → background intensity (heatmap). More readings = stronger colour.
const INTENSITY = [40, 62, 80, 100]
function boxBackground(count) {
  if (!count) return 'var(--surface2)'
  const pct = INTENSITY[Math.min(count - 1, INTENSITY.length - 1)]
  return `color-mix(in oklab, var(--accent) ${pct}%, var(--surface))`
}

export default function BibleDashboard({ user }) {
  const [progress, setProgress] = useState(null)   // { counts: {}, notes: {} }
  const [filter, setFilter]     = useState('ALL')  // ALL | ST | NT
  const [openKey, setOpenKey]   = useState(null)   // { book, chapter }
  const [collapsed, setCollapsed] = useState({})
  const [view, setView]         = useState('plan') // plan | notes

  const ref = doc(db, 'users', user.uid, 'bible', 'progress')

  useEffect(() => {
    return onSnapshot(ref, snap => {
      const d = snap.data() || {}
      setProgress({ counts: d.counts || {}, notes: d.notes || {} })
    }, () => setProgress({ counts: {}, notes: {} }))
  }, [user.uid])

  const counts = progress?.counts || {}
  const notes  = progress?.notes  || {}

  const setCount = async (key, value) => {
    await setDoc(ref, { counts: { [key]: Math.max(0, value) }, updatedAt: serverTimestamp() }, { merge: true })
  }
  const bumpCount = async (key, delta) => {
    const next = Math.max(0, (counts[key] || 0) + delta)
    await setDoc(ref, { counts: { [key]: next }, updatedAt: serverTimestamp() }, { merge: true })
  }
  const saveNote = async (key, text) => {
    await setDoc(ref, { notes: { [key]: text }, updatedAt: serverTimestamp() }, { merge: true })
  }

  // ── Statistics ──
  const stats = useMemo(() => {
    let read = 0, total = 0, booksDone = 0
    let stRead = 0, stTotal = 0, ntRead = 0, ntTotal = 0
    for (const b of BIBLE_BOOKS) {
      let bookRead = 0
      for (let c = 1; c <= b.chapters; c++) {
        const n = counts[chapterKey(b.id, c)] || 0
        if (n > 0) { read++; bookRead++ }
        total += n
        if (b.testament === 'ST') { stTotal++; if (n > 0) stRead++ }
        else { ntTotal++; if (n > 0) ntRead++ }
      }
      if (bookRead === b.chapters) booksDone++
    }
    return { read, total, booksDone, stRead, stTotal, ntRead, ntTotal }
  }, [counts])

  const pct = Math.round((stats.read / TOTAL_CHAPTERS) * 100)
  const books = BIBLE_BOOKS.filter(b => filter === 'ALL' || b.testament === filter)

  if (progress === null) return <div className="list-loading">Ładowanie...</div>

  const openBook = openKey ? BIBLE_BOOKS.find(b => b.id === openKey.book) : null

  return (
    <div className="bible-dashboard">
      <div className="mod-header">
        <div>
          <div className="mod-header-kicker">Biblia</div>
          <div className="mod-header-title">Plan czytania</div>
        </div>
        <div className="mod-header-right">
          <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>{stats.read}/{TOTAL_CHAPTERS}</div>
        </div>
      </div>

      {/* Zakładki */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 14, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 4 }}>
        {[['plan', 'Plan czytania'], ['notes', 'Notatki']].map(([id, label]) => (
          <button key={id} onClick={() => setView(id)} style={{
            flex: 1, padding: '8px 0', borderRadius: 10, fontSize: 13, fontWeight: view === id ? 700 : 400,
            background: view === id ? 'var(--surface3)' : 'transparent',
            color: view === id ? 'var(--text)' : 'var(--text-muted)',
            border: view === id ? '1px solid var(--border-strong)' : '1px solid transparent',
            cursor: 'pointer', transition: 'all .18s',
          }}>{label}</button>
        ))}
      </div>

      {view === 'notes' && <BibleNotes user={user} />}

      {view === 'plan' && (<>
      {/* Hero / postęp */}
      <div className="bible-hero">
        <Ring value={pct} size={92} thickness={9} color="var(--accent)" label="całość" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="kicker">Przeczytane rozdziały</div>
          <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.1 }}>
            {stats.read}<span style={{ fontSize: 16, color: 'var(--text-muted)', fontWeight: 400 }}>/{TOTAL_CHAPTERS}</span>
          </div>
          <div className="bible-progress-track" style={{ marginTop: 10 }}>
            <div className="bible-progress-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      {/* Statystyki */}
      <div className="bible-stats">
        <Stat label="Ukończone księgi" value={`${stats.booksDone}/66`} />
        <Stat label="Stary Testament" value={`${stats.stRead}/${stats.stTotal}`} />
        <Stat label="Nowy Testament" value={`${stats.ntRead}/${stats.ntTotal}`} />
        <Stat label="Łącznie czytań" value={stats.total} />
      </div>

      {/* Filtr testamentów */}
      <div className="type-toggle" style={{ marginBottom: 14 }}>
        {[{ id: 'ALL', label: 'Wszystko' }, { id: 'ST', label: 'Stary Test.' }, { id: 'NT', label: 'Nowy Test.' }].map(t => (
          <button key={t.id} type="button" className={`type-btn ${filter === t.id ? 'active expense' : ''}`}
            onClick={() => setFilter(t.id)}>{t.label}</button>
        ))}
      </div>

      {/* Legenda heatmapy */}
      <div className="bible-legend">
        <span>mniej</span>
        <span className="bible-legend-box" style={{ background: 'var(--surface2)' }} />
        {INTENSITY.map((_, i) => (
          <span key={i} className="bible-legend-box" style={{ background: boxBackground(i + 1) }} />
        ))}
        <span>więcej</span>
      </div>

      {/* Księgi */}
      <div className="bible-books">
        {books.map(book => {
          let bookRead = 0
          for (let c = 1; c <= book.chapters; c++) if (counts[chapterKey(book.id, c)] > 0) bookRead++
          const done = bookRead === book.chapters
          const isCollapsed = collapsed[book.id]
          return (
            <div key={book.id} className={`bible-book ${done ? 'done' : ''}`}>
              <button className="bible-book-head" onClick={() => setCollapsed(p => ({ ...p, [book.id]: !p[book.id] }))}>
                <span className="bible-book-name">{book.name}</span>
                <span className="bible-book-count">{bookRead}/{book.chapters}</span>
                {done && <IconCheck size={13} style={{ color: 'var(--income)' }} />}
                <IconChevronDown size={14} style={{ color: 'var(--text-muted)', transform: isCollapsed ? 'rotate(-90deg)' : 'none', transition: 'transform .15s' }} />
              </button>
              {!isCollapsed && (
                <div className="bible-grid">
                  {Array.from({ length: book.chapters }, (_, i) => i + 1).map(ch => {
                    const key = chapterKey(book.id, ch)
                    const n = counts[key] || 0
                    const hasNote = !!notes[key]
                    return (
                      <button key={ch} className="bible-cell"
                        title={`${book.name} ${ch}${n ? ` · przeczytane ${n}×` : ''}`}
                        onClick={() => setOpenKey({ book: book.id, chapter: ch })}
                        style={{ background: boxBackground(n), color: n >= 2 ? '#fff' : 'var(--text-muted)', borderColor: n ? 'transparent' : 'var(--border)' }}>
                        {ch}
                        {hasNote && <span className="bible-note-dot" />}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {openBook && (
        <ChapterSheet
          book={openBook}
          chapter={openKey.chapter}
          count={counts[chapterKey(openKey.book, openKey.chapter)] || 0}
          note={notes[chapterKey(openKey.book, openKey.chapter)] || ''}
          onClose={() => setOpenKey(null)}
          onSetCount={(v) => setCount(chapterKey(openKey.book, openKey.chapter), v)}
          onBump={(d) => bumpCount(chapterKey(openKey.book, openKey.chapter), d)}
          onSaveNote={(t) => saveNote(chapterKey(openKey.book, openKey.chapter), t)}
        />
      )}
      </>)}
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="bible-stat">
      <div className="bible-stat-value">{value}</div>
      <div className="bible-stat-label">{label}</div>
    </div>
  )
}

function ChapterSheet({ book, chapter, count, note, onClose, onSetCount, onBump, onSaveNote }) {
  const [draft, setDraft] = useState(note)
  useEffect(() => { setDraft(note) }, [note])
  const dirty = draft.trim() !== note.trim()

  const handleSaveNote = async () => {
    await onSaveNote(draft.trim())
    toast.success('Notatka zapisana')
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3 style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <IconBook size={17} /> {book.name} {chapter}
          </h3>
          <button className="modal-close" onClick={onClose}><IconClose size={16} /></button>
        </div>

        <div className="form">
          <div className="bible-read-state" style={{ background: count ? 'color-mix(in oklab, var(--accent) 14%, var(--surface))' : 'var(--surface2)' }}>
            {count === 0 ? (
              <>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>Jeszcze nieprzeczytany</p>
                <button className="btn-save" style={{ width: 'auto', padding: '12px 22px', margin: 0 }} onClick={() => onSetCount(1)}>
                  <IconCheck size={16} style={{ marginRight: 6, verticalAlign: '-2px' }} /> Zaznacz jako przeczytane
                </button>
              </>
            ) : (
              <>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1 }}>{count}×</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>przeczytane</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button className="bible-step" onClick={() => onBump(-1)} title="Mniej">−</button>
                  <button className="bible-step" onClick={() => onBump(1)} title="Jeszcze raz">+</button>
                  <button className="bible-clear" onClick={() => onSetCount(0)}>Odznacz</button>
                </div>
              </>
            )}
          </div>

          <div className="form-group">
            <label>Notatka</label>
            <textarea className="form-input" rows={5} value={draft} onChange={e => setDraft(e.target.value)}
              placeholder="Myśli, wersety, modlitwa, co Bóg mówił przez ten rozdział..."
              style={{ resize: 'vertical', minHeight: 110, fontFamily: 'inherit' }} />
          </div>

          <button className="btn-save" disabled={!dirty} onClick={handleSaveNote}>
            {dirty ? 'Zapisz notatkę' : 'Notatka zapisana'}
          </button>
        </div>
      </div>
    </div>
  )
}
