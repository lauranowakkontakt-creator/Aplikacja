// Zgłoszenia od użytkowników: błędy, pomysły, uwagi.
//
// Apka jest statyczna (GitHub Pages) — przeglądarka nie wyśle maila sama,
// bo nie ma tu żadnego serwera ani SMTP. Dlatego działa to dwutorowo:
//
//  1. ZAWSZE zapis do Firestore (kolekcja `feedback`) — działa od razu,
//     bez żadnej konfiguracji, i nic nie ginie.
//  2. OPCJONALNIE wysyłka na maila przez darmowy przekaźnik Web3Forms —
//     wystarczy wkleić klucz poniżej. Dopóki jest pusty, punkt 2 się pomija.
//
// Jak włączyć maila: załóż darmowy klucz na https://web3forms.com (podajesz
// tylko adres e-mail, na który mają przychodzić zgłoszenia), skopiuj
// „Access Key" i wklej go w FEEDBACK_ACCESS_KEY. Klucz jest publiczny
// z natury — pozwala tylko wysłać wiadomość na Twój adres, nie odczytać nic.

export const FEEDBACK_ACCESS_KEY = ''
export const FEEDBACK_ENDPOINT = 'https://api.web3forms.com/submit'

export const FEEDBACK_TYPES = [
  { id: 'bug',   label: 'Błąd',   hint: 'Coś nie działa albo działa źle' },
  { id: 'idea',  label: 'Pomysł', hint: 'Nowa funkcja albo udoskonalenie' },
  { id: 'other', label: 'Inne',   hint: 'Uwaga, pytanie, cokolwiek' },
]

export const MIN_LENGTH = 5
export const MAX_LENGTH = 2000

export const isEmailConfigured = (key = FEEDBACK_ACCESS_KEY) =>
  typeof key === 'string' && key.trim().length >= 20

export const typeLabel = (id) =>
  FEEDBACK_TYPES.find(t => t.id === id)?.label || 'Inne'

// Walidacja przed wysyłką — jedno miejsce, żeby formularz i test mówiły to samo.
export function validateFeedback({ type, message } = {}) {
  if (!FEEDBACK_TYPES.some(t => t.id === type)) return { ok: false, error: 'Wybierz rodzaj zgłoszenia' }
  const text = String(message || '').trim()
  if (text.length < MIN_LENGTH) return { ok: false, error: 'Opisz to trochę dokładniej' }
  if (text.length > MAX_LENGTH) return { ok: false, error: 'Zgłoszenie jest za długie' }
  return { ok: true, error: null }
}

// Dokument do Firestore. `context` (wersja, moduł, przeglądarka) bardzo
// pomaga przy odtwarzaniu błędu, więc dokładamy go automatycznie.
export function buildFeedbackDoc({ type, message, contact, user, context } = {}) {
  return {
    type,
    message: String(message || '').trim(),
    contact: String(contact || '').trim() || null,
    userId: user?.uid || null,
    userName: user?.displayName || null,
    userEmail: user?.email || null,
    context: context || {},
    status: 'new',
  }
}

// Ciało żądania do Web3Forms. Temat od razu mówi, czy to błąd czy pomysł.
export function buildEmailPayload(docData, accessKey = FEEDBACK_ACCESS_KEY) {
  const ctx = docData.context || {}
  return {
    access_key: accessKey,
    subject: `Apka — ${typeLabel(docData.type)}: ${docData.message.slice(0, 60)}`,
    from_name: docData.userName || 'Użytkownik Apki',
    rodzaj: typeLabel(docData.type),
    wiadomosc: docData.message,
    kontakt: docData.contact || docData.userEmail || '—',
    moduł: ctx.module || '—',
    przeglądarka: ctx.userAgent || '—',
    ekran: ctx.screen || '—',
  }
}
