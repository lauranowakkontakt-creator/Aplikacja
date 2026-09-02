import { db } from '../../firebase/config'
import { findPrio } from '../../utils/prayerStats'
import { confirmDialog } from '../ConfirmModal'
import { IconCheck, IconChevronLeft, IconChevronRight, IconPrayer } from '../Icons'
import { toast } from '../Toast'
import IntentionForm from './IntentionForm'
import RequestCard from './RequestCard'
import { TODAY, toggleChecklistItem } from './wspolne'
import { addDays, format, parseISO, subDays } from 'date-fns'
import { pl } from 'date-fns/locale'
import { Timestamp, arrayRemove, arrayUnion, deleteDoc, doc, updateDoc } from 'firebase/firestore'
import { useMemo, useState } from 'react'

// Widok „Dziś" — prośby na dany dzień, z możliwością cofania się w tył.

export default function TodayView({ user, intentions, people, carMode }) {
  const [viewDate, setViewDate] = useState(TODAY())
  const [editItem, setEditItem] = useState(null)

  const hiddenIds          = useMemo(() => new Set(people.filter(p => p.hiddenInPrayer).map(p => p.id)), [people])
  const activeIntentions   = intentions.filter(i => (i.status === 'active' || !i.status) && !(i.personId && hiddenIds.has(i.personId)))
  // Prośby z oknem czasowym (np. z wydarzenia) pokazują się tylko w swoich dniach; bez okna — codziennie.
  const visibleIntentions  = activeIntentions.filter(i => {
    if (!i.scheduleFrom && !i.scheduleTo) return true
    const from = i.scheduleFrom || '0000-01-01'
    const to   = i.scheduleTo   || '9999-12-31'
    return viewDate >= from && viewDate <= to
  })
  const archivedPrayedOnDate = useMemo(
    () => intentions.filter(i => i.status === 'ended' && i.prayedDates?.includes(viewDate)),
    [intentions, viewDate]
  )

  const togglePrayed = async (item, date) => {
    const d = date || viewDate
    const prayed = item.prayedDates?.includes(d)
    try {
      await updateDoc(doc(db, 'users', user.uid, 'prayerIntentions', item.id), {
        prayedDates: prayed ? arrayRemove(d) : arrayUnion(d)
      })
    } catch {
      toast.error('Nie udało się zapisać modlitwy')
    }
  }

  const addNote = async (itemId, text) => {
    await updateDoc(doc(db, 'users', user.uid, 'prayerIntentions', itemId), {
      notes: arrayUnion({ text, date: viewDate, id: Date.now().toString() })
    })
  }

  const editNote = async (item, note, newText) => {
    await updateDoc(doc(db, 'users', user.uid, 'prayerIntentions', item.id), { notes: arrayRemove(note) })
    await updateDoc(doc(db, 'users', user.uid, 'prayerIntentions', item.id), { notes: arrayUnion({ ...note, text: newText }) })
  }

  const deleteNote = async (item, note) => {
    await updateDoc(doc(db, 'users', user.uid, 'prayerIntentions', item.id), { notes: arrayRemove(note) })
  }

  const sorted = [...visibleIntentions].sort((a, b) => {
    if ((a.priority || 3) === 5 && (b.priority || 3) !== 5) return -1
    if ((a.priority || 3) !== 5 && (b.priority || 3) === 5) return 1
    const ap = a.prayedDates?.includes(viewDate)
    const bp = b.prayedDates?.includes(viewDate)
    if (ap && !bp) return 1
    if (!ap && bp) return -1
    return (b.priority || 3) - (a.priority || 3)
  })

  const prayedCount = visibleIntentions.filter(i => i.prayedDates?.includes(viewDate)).length
  const isToday     = viewDate === TODAY()
  const dateLabel   = isToday ? 'Dziś' : format(parseISO(viewDate), 'EEEE, d MMMM', { locale: pl })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Date navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 12px' }}>
        <button className="icon-btn" onClick={() => setViewDate(d => format(subDays(parseISO(d), 1), 'yyyy-MM-dd'))}><IconChevronLeft size={16} /></button>
        <div style={{ textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, textTransform: 'capitalize' }}>{dateLabel}</p>
          {!isToday && <button onClick={() => setViewDate(TODAY())} style={{ fontSize: 10, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>wróć do dziś</button>}
        </div>
        <button className="icon-btn" onClick={() => setViewDate(d => format(addDays(parseISO(d), 1), 'yyyy-MM-dd'))}><IconChevronRight size={16} /></button>
      </div>

      {/* Licznik modlono X/Y jest już w prawym górnym rogu nagłówka — tu tylko komunikat o komplecie */}
      {visibleIntentions.length > 0 && prayedCount === visibleIntentions.length && (
        <div style={{ background: 'rgba(39,174,96,0.12)', border: '1px solid #27AE60', borderRadius: 12, padding: carMode ? '14px' : '10px 14px', textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: carMode ? 17 : 14, color: '#27AE60', fontWeight: 700 }}>Wszystkie prośby modlone {isToday ? 'dziś' : 'tego dnia'}!</p>
        </div>
      )}

      {sorted.map(item => {
        const person = people.find(p => p.id === item.personId)
        return (
          <RequestCard
            key={item.id}
            item={item}
            user={user}
            carMode={carMode}
            viewDate={viewDate}
            onTogglePrayed={togglePrayed}
            onAddNote={addNote}
            onToggleChecklistItem={(it, id) => toggleChecklistItem(user.uid, it, id)}
            onEditNote={editNote}
            onDeleteNote={deleteNote}
            onArchive={async (item) => updateDoc(doc(db, 'users', user.uid, 'prayerIntentions', item.id), { status: 'ended', endedAt: Timestamp.now() })}
            onEdit={() => setEditItem(item)}
            onDelete={async (id) => { const _ok = await confirmDialog({ title: 'Usunąć prośbę?' })
              if (_ok) await deleteDoc(doc(db, 'users', user.uid, 'prayerIntentions', id)) }}
            showPerson
            person={person}
          />
        )
      })}

      {editItem && (
        <IntentionForm user={user} editData={editItem} personId={editItem.personId} onClose={() => setEditItem(null)} />
      )}

      {/* Archived intentions that were prayed on this date */}
      {archivedPrayedOnDate.length > 0 && (
        <div style={{ marginTop: 4 }}>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.15em', marginBottom: 8, paddingLeft: 2 }}>
            Zarchiwizowane · modlono {isToday ? 'dziś' : 'tego dnia'}
          </div>
          {archivedPrayedOnDate.map(item => {
            const person = people.find(p => p.id === item.personId)
            const prio = findPrio(item.priority || 3)
            return (
              <div key={item.id} style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderLeft: `3px solid ${prio.color}55`,
                borderRadius: 12, padding: '10px 14px', opacity: 0.5,
                display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6,
                pointerEvents: 'none',
              }}>
                <IconCheck size={16} style={{ flexShrink: 0, color: '#27AE60', marginTop: 1 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>{item.title}</p>
                    <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: 'var(--surface3)', color: 'var(--text-muted)' }}>archiwum</span>
                  </div>
                  {person && <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>{person.name}</p>}
                  <p style={{ margin: '2px 0 0', fontSize: 10, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}><IconPrayer size={10} /> ×{item.prayedDates?.length || 0} łącznie</p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {visibleIntentions.length === 0 && archivedPrayedOnDate.length === 0 && (
        <div className="list-empty">
          <p>Brak próśb na ten dzień</p>
          <p className="list-empty-hint">{isToday ? 'Dodaj prośby w zakładce Osoby lub przy wydarzeniu w Kalendarzu' : 'Tego dnia nic nie zaplanowano'}</p>
        </div>
      )}
    </div>
  )
}

/* ─── StatsView ──────────────────────────────────────────────────────────── */
