import { useState } from 'react'
import { collection, addDoc, Timestamp } from 'firebase/firestore'
import { db } from '../firebase/config'
import {
  FEEDBACK_TYPES, FEEDBACK_ACCESS_KEY, FEEDBACK_ENDPOINT,
  validateFeedback, buildFeedbackDoc, buildEmailPayload, isEmailConfigured,
} from '../utils/feedback'
import { IconCheck, IcBug, IcIdea, IconMore } from './Icons'
import { toast } from './Toast'

const TYPE_ICONS = { bug: IcBug, idea: IcIdea, other: IconMore }

/* Zgłoś błąd / pomysł.
   Zapis do Firestore leci zawsze — to jest źródło prawdy i działa bez żadnej
   konfiguracji. Mail (Web3Forms) jest dodatkiem: gdy klucz nie jest ustawiony
   albo wysyłka padnie, zgłoszenie i tak jest zapisane, więc nie mówimy
   użytkownikowi, że się nie udało. */
export default function FeedbackPanel({ user, activeModuleId }) {
  const [type, setType]       = useState('bug')
  const [message, setMessage] = useState('')
  const [contact, setContact] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent]       = useState(false)
  const [error, setError]     = useState('')

  const submit = async (e) => {
    e.preventDefault()
    const check = validateFeedback({ type, message })
    if (!check.ok) { setError(check.error); return }
    setSending(true); setError('')

    const docData = buildFeedbackDoc({
      type, message, contact, user,
      context: {
        module: activeModuleId || null,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        screen: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : null,
        appVersion: 'v1.0',
      },
    })

    try {
      // Zapis idzie do WŁASNEJ gałęzi użytkownika (users/{uid}/feedback), bo
      // tylko tam reguły Firestore na pewno pozwalają pisać. Dzięki temu
      // zgłoszenie nigdy nie przepada. Do Laury trafia mailem (niżej) —
      // wspólna skrzynka w bazie wymagałaby osobnej reguły na kolekcję
      // najwyższego poziomu.
      await addDoc(collection(db, 'users', user.uid, 'feedback'),
        { ...docData, createdAt: Timestamp.now() })
    } catch {
      setError('Nie udało się wysłać — sprawdź połączenie')
      setSending(false)
      return
    }

    // Mail to dodatek. Cichy błąd tutaj nie może wyglądać jak nieudane zgłoszenie.
    if (isEmailConfigured()) {
      try {
        await fetch(FEEDBACK_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(buildEmailPayload(docData, FEEDBACK_ACCESS_KEY)),
        })
      } catch { /* zapis w bazie już jest — nie zawracamy głowy */ }
    }

    setSending(false)
    setSent(true)
    setMessage('')
    setContact('')
    toast.success('Dzięki! Zgłoszenie wysłane')
  }

  if (sent) {
    return (
      <div className="feedback-done">
        <span className="feedback-done-mark"><IconCheck size={18} /></span>
        <p>Zgłoszenie zapisane. Dzięki — to naprawdę pomaga.</p>
        <button type="button" className="feedback-again" onClick={() => setSent(false)}>
          Zgłoś coś jeszcze
        </button>
      </div>
    )
  }

  return (
    <form className="feedback-form" onSubmit={submit}>
      <div className="feedback-types">
        {FEEDBACK_TYPES.map(t => {
          const Icon = TYPE_ICONS[t.id] || IconMore
          const active = type === t.id
          return (
            <button key={t.id} type="button"
              className={`feedback-type${active ? ' active' : ''}`}
              onClick={() => setType(t.id)} title={t.hint}>
              <Icon size={15} />
              <span>{t.label}</span>
            </button>
          )
        })}
      </div>

      <textarea
        className="form-input" rows={4}
        placeholder={
          type === 'bug'  ? 'Co nie zadziałało? Gdzie i co się stało?' :
          type === 'idea' ? 'Co by się przydało? Jak miałoby to działać?' :
                            'Napisz, co Ci leży na sercu...'
        }
        value={message}
        onChange={e => { setMessage(e.target.value); setError('') }}
        style={{ resize: 'vertical', minHeight: 90, fontFamily: 'inherit', lineHeight: 1.55 }}
      />

      <input
        type="text" className="form-input"
        placeholder="Kontakt zwrotny (opcjonalnie)"
        value={contact} onChange={e => setContact(e.target.value)}
      />

      {error && <p className="form-error">{error}</p>}

      <button type="submit" className="btn-save" disabled={sending}>
        {sending ? 'Wysyłanie...' : 'Wyślij zgłoszenie'}
      </button>

      <p className="feedback-note">
        Dołączamy wersję apki i moduł, w którym jesteś — bez tego trudno odtworzyć błąd.
      </p>
    </form>
  )
}
