import { updateDoc, doc } from 'firebase/firestore'
import { format } from 'date-fns'
import { pl } from 'date-fns/locale'
import { db } from '../../firebase/config'
import { CatIcon, IconClose, IconArchive, IconRestore, IconCheck } from '../Icons'
import { habitCompletionSummary } from '../../utils/habitLogic'
import { habitPeriodLabel } from '../../utils/habitStats'

// Zakończone i archiwum — spod ⋮, nie z dołu ekranu.
// Nawyk z datą zakończenia znikał z listy dnia bez śladu: nie był
// zarchiwizowany, więc archiwum go nie pokazywało, a jedynym miejscem, gdzie
// się w ogóle pojawiał, była przyszarzona sekcja w „Edytuj nawyki". Teraz ma
// swoją sekcję „Ukończone" z podsumowaniem (ile razy, najlepsza seria, okres)
// i dwoma wyjściami: wznowić albo schować do archiwum.
const fmtDate = (d) => (d ? format(new Date(d + 'T12:00:00'), 'd MMM yyyy', { locale: pl }) : null)

export default function HabitArchive({ user, habits = [], endedHabits = [], pauses = [], onEdit, onClose }) {
  const patch = (h, data) => updateDoc(doc(db, 'users', user.uid, 'habits', h.id), data)
  const restore  = (h) => patch(h, { archived: false })
  const archive  = (h) => patch(h, { archived: true })
  const reopen   = (h) => patch(h, { endDate: null })

  const tile = (h, children, sub) => {
    const color = h.color || 'var(--accent)'
    return (
      <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => onEdit(h)} title="Edytuj nawyk"
          style={{
            flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
            padding: '8px 10px', borderRadius: 10, textAlign: 'left', fontFamily: 'inherit',
            background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)',
          }}>
          <span className="habit-emoji" style={{
            background: color + '1A', border: `1px solid ${color + '40'}`, color, flexShrink: 0,
          }}>
            <CatIcon categoryId={null} emoji={h.emoji} size={14} />
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {h.name}
            </span>
            {sub && (
              <span style={{ display: 'block', fontSize: 10.5, color: 'var(--text-muted)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {sub}
              </span>
            )}
          </span>
        </button>
        {children}
      </div>
    )
  }

  const smallBtn = (label, Icon, onClick, title) => (
    <button className="t-btn" onClick={onClick} title={title}
      style={{ width: 'auto', padding: '6px 10px', display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
      <Icon size={13} /> {label}
    </button>
  )

  const endedSub = (h) => {
    const s = habitCompletionSummary(h, pauses)
    const parts = [`${s.total}x zrobione`]
    if (s.best > 0) parts.push(`rekord ${s.best} dni`)
    // Okres zawsze, gdy da się go wyliczyć — stary nawyk schowany do archiwum
    // nie ma daty końca, a bez okresu nie wiadomo, z jakich to lat.
    const okres = habitPeriodLabel(s.first, s.last)
    if (okres) parts.push(okres)
    else if (h.endDate) parts.push(`do ${fmtDate(h.endDate)}`)
    return parts.join(' · ')
  }

  const empty = endedHabits.length === 0 && habits.length === 0

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>Ukończone i archiwum</h3>
          <button className="modal-close" onClick={onClose}><IconClose size={16} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {empty && (
            <p style={{ margin: '4px 0', fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>
              Nie masz jeszcze ukończonych ani zarchiwizowanych nawyków.
            </p>
          )}

          {endedHabits.length > 0 && (
            <>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.18em', textTransform: 'uppercase' }}>
                Ukończone ({endedHabits.length})
              </div>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
                Nawyki po dacie zakończenia. Zeszły z listy dnia, ale historia i wynik zostają.
                Wznów, żeby wrócił do codzienności, albo schowaj do archiwum.
              </p>
              {endedHabits.map(h => tile(h, (
                <>
                  {smallBtn('Wznów', IconRestore, () => reopen(h), 'Zdejmij datę zakończenia')}
                  {smallBtn('', IconArchive, () => archive(h), 'Przenieś do archiwum')}
                </>
              ), endedSub(h)))}
            </>
          )}

          {habits.length > 0 && (
            <>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.18em', textTransform: 'uppercase', marginTop: endedHabits.length > 0 ? 8 : 0 }}>
                Archiwum ({habits.length})
              </div>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
                Zarchiwizowane nawyki nie liczą się do serii ani statystyk. Przywróć,
                żeby wrócił na listę dnia — historia odhaczeń zostaje.
              </p>
              {habits.map(h => tile(h, smallBtn('Przywróć', IconRestore, () => restore(h), 'Przywróć nawyk'), endedSub(h)))}
            </>
          )}

          {!empty && (
            <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <IconCheck size={12} /> {endedHabits.length} ukończone · <IconArchive size={12} /> {habits.length} w archiwum
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
